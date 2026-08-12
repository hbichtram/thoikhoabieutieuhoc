import {
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  ScheduleCell,
  DayOfWeek,
  PeriodShift,
} from '../types';
import {
  getTeacherMaxWeeklyPeriods,
  calculateTeacherWeeklyPeriods,
  getTeacherSessions,
  getTeacherGapPeriods,
  getTeacherMaxSessionsPerWeek,
} from './teacherUtils';
import { validateConsecutiveSubjectLimit, validateSubjectShiftLimit, validateGvbmConstraints } from './conflictChecker';
import { normalizeScheduleCells, countPlacedPeriodsForAssignment } from './timetableUtils';

/**
 * Priority slots to keep empty during Auto Schedule (T2 Morning P1 - Chào cờ & T6 Morning P4 - Sinh hoạt lớp).
 * NOTE: This function is ONLY used inside runAutoScheduler.
 * It MUST NOT be called in manual drag & drop or general timetable validation.
 */
export function isAutoScheduleExcludedSlot(
  day: DayOfWeek,
  shift: PeriodShift,
  periodNumber: number
): boolean {
  return (
    (day === 'T2' && shift === 'morning' && periodNumber === 1) ||
    (day === 'T6' && shift === 'morning' && periodNumber === 4)
  );
}

export interface UnplacedAssignmentReport {
  assignment: Assignment;
  className: string;
  subjectName: string;
  teacherName: string;
  missingPeriods: number;
  reason: string;
}

export interface AutoScheduleResult {
  newCells: ScheduleCell[];
  totalRequired: number;
  totalPlaced: number;
  unplacedReports: UnplacedAssignmentReport[];
  statsSummary: {
    totalTeachers: number;
    teachersWithinSessions: number; // <= 6 sessions
    teachersExceededSessions: number; // > 6 sessions
    teachersWithGaps: number; // teachers with gap periods
    teachersExceededPeriods: number; // assigned > 20/23
  };
}

/**
 * Auto-Schedules timetable adhering to strict hard constraints and optimization scoring.
 */
export function runAutoScheduler(
  teachers: Teacher[],
  classes: ClassItem[],
  subjects: Subject[],
  assignments: Assignment[],
  timeConfig: TimeConfig,
  currentCells: ScheduleCell[],
  onlyUnlocked: boolean = true
): AutoScheduleResult {
  // Preserve all existing cells as baseline (user placed or locked cells must not be overwritten or removed)
  const baseCells: ScheduleCell[] = normalizeScheduleCells(currentCells || [], assignments);

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Track currently placed cells during construction
  const workingCells: ScheduleCell[] = [...baseCells];

  // Calculate required remaining periods for each assignment
  const unplacedQueue: { assignment: Assignment; periodsNeeded: number }[] = [];
  let totalRequired = 0;

  assignments.forEach((a) => {
    totalRequired += a.periodsPerWeek;
    const placedLockedCount = countPlacedPeriodsForAssignment(baseCells, a);
    const needed = a.periodsPerWeek - placedLockedCount;
    if (needed > 0) {
      unplacedQueue.push({ assignment: a, periodsNeeded: needed });
    }
  });

  // Sort assignments by scheduling difficulty:
  // 1. Teachers with high total assigned periods first
  // 2. Assignments with more periods needed
  unplacedQueue.sort((a, b) => {
    const tA = teacherMap.get(a.assignment.teacherId);
    const tB = teacherMap.get(b.assignment.teacherId);
    const loadA = tA ? calculateTeacherWeeklyPeriods(tA.id, assignments) : 0;
    const loadB = tB ? calculateTeacherWeeklyPeriods(tB.id, assignments) : 0;
    if (loadB !== loadA) return loadB - loadA;
    return b.periodsNeeded - a.periodsNeeded;
  });

  const unplacedReports: UnplacedAssignmentReport[] = [];

  const days = timeConfig.enabledDays;
  const shifts: PeriodShift[] = ['morning', 'afternoon'];

  // Process queue item by item
  unplacedQueue.forEach(({ assignment, periodsNeeded }) => {
    const tch = teacherMap.get(assignment.teacherId);
    const cls = classMap.get(assignment.classId);
    const sub = subjectMap.get(assignment.subjectId);

    const className = cls?.name || 'Lớp ?';
    const subjectName = sub?.name || 'Môn ?';
    const teacherName = tch?.name || 'GV ?';

    let remainingToPlace = periodsNeeded;

    for (let periodStep = 0; periodStep < periodsNeeded; periodStep++) {
      // Find all valid candidate slots for this assignment
      interface CandidateSlot {
        day: DayOfWeek;
        shift: PeriodShift;
        periodNumber: number;
        score: number;
      }

      const candidates: CandidateSlot[] = [];

      days.forEach((day) => {
        shifts.forEach((shift) => {
          const maxP =
            shift === 'morning'
              ? timeConfig.morningPeriodsCount
              : timeConfig.afternoonPeriodsCount;

          for (let p = 1; p <= maxP; p++) {
            // Check 0: Auto Schedule excluded slots (T2 Morning P1 & T6 Morning P4 reserved to stay empty)
            if (isAutoScheduleExcludedSlot(day, shift, p)) {
              continue;
            }

            // Check 1: Disabled school slot
            const isDisabledSchool = timeConfig.disabledSlots.some(
              (d) => d.day === day && d.shift === shift && d.periodNumber === p
            );
            if (isDisabledSchool) continue;

            // Check 2: Locked teacher slot
            if (tch) {
              const isUnavailable = tch.unavailableSlots.some(
                (u) => u.day === day && u.shift === shift && u.periodNumber === p
              );
              if (isUnavailable) continue;
            }

            // Check 3: Class already occupied at slot
            const classOccupied = workingCells.some(
              (c) =>
                c.classId === assignment.classId &&
                c.day === day &&
                c.shift === shift &&
                c.periodNumber === p
            );
            if (classOccupied) continue;

            // Check 4: Teacher already occupied at slot
            const teacherOccupied = workingCells.some(
              (c) =>
                c.teacherId === assignment.teacherId &&
                c.day === day &&
                c.shift === shift &&
                c.periodNumber === p
            );
            if (teacherOccupied) continue;

            // Check 5: Teacher maxSessionsPerWeek constraint (HARD CONSTRAINT)
            const maxSessions = tch ? getTeacherMaxSessionsPerWeek(tch) : 7;
            const currentTeacherSessions = getTeacherSessions(
              assignment.teacherId,
              workingCells
            );
            const isExistingSession = currentTeacherSessions.has(`${day}_${shift}`);
            if (!isExistingSession && currentTeacherSessions.size >= maxSessions) {
              // Exceeding maxSessionsPerWeek is STRICTLY FORBIDDEN!
              continue;
            }

            // Check 6: Max 2 consecutive periods for same subject in same shift & day (HARD CONSTRAINT)
            const candidateTestCell: ScheduleCell = {
              id: 'temp_auto_test',
              classId: assignment.classId,
              day,
              shift,
              periodNumber: p,
              assignmentId: assignment.id,
              subjectId: assignment.subjectId,
              teacherId: assignment.teacherId,
              isLocked: false,
            };
            const consecVal = validateConsecutiveSubjectLimit(
              [...workingCells, candidateTestCell],
              subjects,
              assignment.classId,
              day,
              shift
            );
            if (!consecVal.valid) {
              // Creating >2 consecutive periods of same subject is STRICTLY FORBIDDEN!
              continue;
            }

            // Check 7: Max 2 TOTAL periods for same subject in same shift & day (HARD CONSTRAINT)
            const shiftLimitVal = validateSubjectShiftLimit(
              [...workingCells, candidateTestCell],
              subjects,
              assignment.classId,
              day,
              shift
            );
            if (!shiftLimitVal.valid) {
              // Creating >2 total periods of same subject in shift is STRICTLY FORBIDDEN!
              continue;
            }

            // Check 8: GVBM no gaps constraint (HARD CONSTRAINT)
            const gvbmVal = validateGvbmConstraints(
              [...workingCells, candidateTestCell],
              teachers,
              assignment.teacherId,
              day,
              shift
            );
            if (!gvbmVal.valid && gvbmVal.errorType === 'TEACHER_GAP_IN_SHIFT') {
              // Creating a gap for a GVBM in a shift is STRICTLY FORBIDDEN!
              continue;
            }

            // --- SCORING SYSTEM (According to section 16) ---
            let score = 1000; // Base score for valid slot (+1000: Không vi phạm ràng buộc cứng)

            // 1. Session Grouping / Opening
            if (isExistingSession) {
              score += 300; // +300: Xếp vào buổi giáo viên đã có
            } else {
              score -= 100; // -100: Mở thêm một buổi mới
            }

            // Get existing periods for teacher in this session
            const teacherSessionPeriods = workingCells
              .filter(
                (c) =>
                  c.teacherId === assignment.teacherId &&
                  c.day === day &&
                  c.shift === shift
              )
              .map((c) => c.periodNumber);

            // 2. Gaps & Contiguity
            if (teacherSessionPeriods.length > 0) {
              const minP = Math.min(...teacherSessionPeriods);
              const maxP = Math.max(...teacherSessionPeriods);

              // +200: Lấp được tiết trống giữa min & max
              if (p > minP && p < maxP && !teacherSessionPeriods.includes(p)) {
                score += 200;
              }

              // +100: Xếp liền với tiết đang dạy
              if (p === minP - 1 || p === maxP + 1) {
                score += 100;
              }

              // +50: Gom nhiều tiết trong cùng buổi
              score += 50;

              // -200: Tạo thêm tiết trống
              if (p < minP - 1 || p > maxP + 1) {
                score -= 200;
              }
            }

            // 3. Subject clustering penalty (-150 if class already has >=2 of this subject today)
            const classDaySubjectCount = workingCells.filter(
              (c) =>
                c.classId === assignment.classId &&
                c.day === day &&
                c.subjectId === assignment.subjectId
            ).length;

            if (classDaySubjectCount >= 2) {
              score -= 150;
            } else if (classDaySubjectCount === 1) {
              score += 30; // 2 periods per day is fine (double period)
            }

            // 4. Daily balance for class (prefer days with fewer periods)
            const classDayTotalPeriods = workingCells.filter(
              (c) => c.classId === assignment.classId && c.day === day
            ).length;
            score += (5 - classDayTotalPeriods) * 10;

            candidates.push({ day, shift, periodNumber: p, score });
          }
        });
      });

      if (candidates.length === 0) {
        // Cannot place this period
        break;
      }

      // Sort candidates by score descending
      candidates.sort((a, b) => b.score - a.score);

      const best = candidates[0];

      // Create new cell
      const newCell: ScheduleCell = {
        id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        classId: assignment.classId,
        day: best.day,
        shift: best.shift,
        periodNumber: best.periodNumber,
        assignmentId: assignment.id,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        isLocked: false,
      };

      workingCells.push(newCell);
      remainingToPlace--;
    }

    if (remainingToPlace > 0) {
      const currentTeacherSessions = getTeacherSessions(assignment.teacherId, workingCells);
      const maxSessions = tch ? getTeacherMaxSessionsPerWeek(tch) : 7;
      let reason = 'Không tìm thấy vị trí trống phù hợp (các vị trí ưu tiên Thứ 2 Sáng Tiết 1 / Thứ 6 Sáng Tiết 4 được giữ trống theo quy tắc).';
      if (currentTeacherSessions.size >= maxSessions) {
        reason = `Giáo viên ${teacherName} đã đạt giới hạn ${maxSessions} buổi/tuần do Ban Giám hiệu thiết lập, không thể mở thêm buổi mới.`;
      }

      unplacedReports.push({
        assignment,
        className,
        subjectName,
        teacherName,
        missingPeriods: remainingToPlace,
        reason,
      });
    }
  });

  // Calculate final summary statistics
  let teachersWithinSessions = 0;
  let teachersExceededSessions = 0;
  let teachersWithGaps = 0;
  let teachersExceededPeriods = 0;

  teachers.forEach((t) => {
    const sessionCount = getTeacherSessions(t.id, workingCells).size;
    const maxS = getTeacherMaxSessionsPerWeek(t);
    if (sessionCount <= maxS) {
      teachersWithinSessions++;
    } else {
      teachersExceededSessions++;
    }

    const gapCount = getTeacherGapPeriods(t.id, workingCells);
    if (gapCount > 0) {
      teachersWithGaps++;
    }

    const assignedPeriods = calculateTeacherWeeklyPeriods(t.id, assignments);
    const maxP = getTeacherMaxWeeklyPeriods(t);
    if (assignedPeriods > maxP) {
      teachersExceededPeriods++;
    }
  });

  return {
    newCells: workingCells,
    totalRequired,
    totalPlaced: workingCells.length,
    unplacedReports,
    statsSummary: {
      totalTeachers: teachers.length,
      teachersWithinSessions,
      teachersExceededSessions,
      teachersWithGaps,
      teachersExceededPeriods,
    },
  };
}
