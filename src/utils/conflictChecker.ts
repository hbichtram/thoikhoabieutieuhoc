import {
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  ScheduleCell,
  ConflictIssue,
  SuggestionSlot,
  DayOfWeek,
  PeriodShift,
  MissingPeriodItem,
  ScheduleStats,
} from '../types';
import {
  getTeacherMaxWeeklyPeriods,
  calculateTeacherWeeklyPeriods,
  getTeacherSessions,
  getTeacherMaxSessionsPerWeek,
} from './teacherUtils';

export interface SubjectShiftValidationResult {
  valid: boolean;
  reason?: string;
  violatingCellIds?: string[];
  subjectId?: string;
  classId?: string;
  day?: DayOfWeek;
  shift?: PeriodShift;
}

/**
 * Validates that no subject appears MORE THAN 2 TIMES in the SAME shift and same day for any class.
 * (Ràng buộc VI: Một môn học trong cùng một buổi chỉ được xuất hiện tối đa 2 tiết).
 */
export function validateSubjectShiftLimit(
  proposedCells: ScheduleCell[],
  subjects?: Subject[],
  targetClassId?: string,
  targetDay?: DayOfWeek,
  targetShift?: PeriodShift
): SubjectShiftValidationResult {
  const subjectMap = subjects ? new Map(subjects.map((s) => [s.id, s])) : new Map();

  const cellsToInspect = proposedCells.filter((c) => {
    if (targetClassId && c.classId !== targetClassId) return false;
    if (targetDay && c.day !== targetDay) return false;
    if (targetShift && c.shift !== targetShift) return false;
    return true;
  });

  // Group by classId_day_shift_subjectId
  const counts = new Map<string, ScheduleCell[]>();
  cellsToInspect.forEach((c) => {
    const key = `${c.classId}_${c.day}_${c.shift}_${c.subjectId}`;
    if (!counts.has(key)) {
      counts.set(key, []);
    }
    counts.get(key)!.push(c);
  });

  const dayNames: Record<DayOfWeek, string> = {
    T2: 'Thứ 2',
    T3: 'Thứ 3',
    T4: 'Thứ 4',
    T5: 'Thứ 5',
    T6: 'Thứ 6',
  };

  for (const [key, cellGroup] of counts.entries()) {
    if (cellGroup.length > 2) {
      const [classId, day, shift, subjectId] = key.split('_') as [string, DayOfWeek, PeriodShift, string];
      const subName = subjectMap.get(subjectId)?.name || 'môn học';
      const dayLabel = dayNames[day] || day;
      const shiftLabel = shift === 'morning' ? 'Sáng' : 'Chiều';

      return {
        valid: false,
        reason: `Môn "${subName}" xuất hiện ${cellGroup.length} tiết vào ${dayLabel} - Buổi ${shiftLabel}. Quy định: Một môn trong cùng một buổi chỉ được học tối đa 2 tiết.`,
        violatingCellIds: cellGroup.map((c) => c.id),
        subjectId,
        classId,
        day,
        shift,
      };
    }
  }

  return { valid: true };
}

export interface GvbmValidationResult {
  valid: boolean;
  reason?: string;
  errorType?: 'TEACHER_MIN_PERIODS_PER_SHIFT' | 'TEACHER_GAP_IN_SHIFT';
  violatingCellIds?: string[];
  teacherId?: string;
  day?: DayOfWeek;
  shift?: PeriodShift;
}

/**
 * Validates GVBM (Subject Teacher) constraints:
 * 1. Minimum 2 periods per shift if teacher teaches in that shift.
 * 2. No gaps between teaching periods in the same shift.
 */
export function validateGvbmConstraints(
  proposedCells: ScheduleCell[],
  teachers: Teacher[],
  targetTeacherId?: string,
  targetDay?: DayOfWeek,
  targetShift?: PeriodShift
): GvbmValidationResult {
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  // Group by teacherId_day_shift
  const teacherShifts = new Map<string, ScheduleCell[]>();

  proposedCells.forEach((c) => {
    if (targetTeacherId && c.teacherId !== targetTeacherId) return;
    if (targetDay && c.day !== targetDay) return;
    if (targetShift && c.shift !== targetShift) return;

    const key = `${c.teacherId}_${c.day}_${c.shift}`;
    if (!teacherShifts.has(key)) {
      teacherShifts.set(key, []);
    }
    teacherShifts.get(key)!.push(c);
  });

  const dayNames: Record<DayOfWeek, string> = {
    T2: 'Thứ 2',
    T3: 'Thứ 3',
    T4: 'Thứ 4',
    T5: 'Thứ 5',
    T6: 'Thứ 6',
  };

  for (const [key, cellGroup] of teacherShifts.entries()) {
    const [teacherId, day, shift] = key.split('_') as [string, DayOfWeek, PeriodShift];
    const teacher = teacherMap.get(teacherId);

    // Applies strictly to subject teachers (type !== 'homeroom')
    if (teacher && teacher.type !== 'homeroom') {
      const dayLabel = dayNames[day] || day;
      const shiftLabel = shift === 'morning' ? 'Sáng' : 'Chiều';
      const count = cellGroup.length;

      // Constraint 1: Minimum 2 periods per shift
      if (count === 1) {
        return {
          valid: false,
          reason: `GVBM "${teacher.name}" - ${dayLabel} - Buổi ${shiftLabel}: Chỉ có 1 tiết dạy trong buổi. GVBM phải có tối thiểu 2 tiết/buổi.`,
          errorType: 'TEACHER_MIN_PERIODS_PER_SHIFT',
          violatingCellIds: cellGroup.map((c) => c.id),
          teacherId,
          day,
          shift,
        };
      }

      // Constraint 2: No gaps between teaching periods in the shift
      if (count >= 2) {
        const periods = cellGroup
          .map((c) => (c.periodNumber > 4 ? c.periodNumber - 4 : c.periodNumber))
          .sort((a, b) => a - b);

        const periodSet = new Set(periods);
        const minP = periods[0];
        const maxP = periods[periods.length - 1];

        for (let p = minP; p <= maxP; p++) {
          if (!periodSet.has(p)) {
            return {
              valid: false,
              reason: `GVBM "${teacher.name}" - ${dayLabel} - Buổi ${shiftLabel}: Các tiết dạy bị gián đoạn, không được có tiết trống giữa.`,
              errorType: 'TEACHER_GAP_IN_SHIFT',
              violatingCellIds: cellGroup.map((c) => c.id),
              teacherId,
              day,
              shift,
            };
          }
        }
      }
    }
  }

  return { valid: true };
}

export interface ConsecutiveValidationResult {
  valid: boolean;
  reason?: string;
  violatingCellIds?: string[];
  subjectId?: string;
  classId?: string;
  day?: DayOfWeek;
  shift?: PeriodShift;
}

/**
 * Validates that no subject has more than 2 CONSECUTIVE periods in the same shift and same day for any class.
 */
export function validateConsecutiveSubjectLimit(
  proposedCells: ScheduleCell[],
  subjects?: Subject[],
  targetClassId?: string,
  targetDay?: DayOfWeek,
  targetShift?: PeriodShift
): ConsecutiveValidationResult {
  const subjectMap = subjects ? new Map(subjects.map((s) => [s.id, s])) : new Map();

  // Filter cells to inspect if target filter provided
  const cellsToInspect = proposedCells.filter((c) => {
    if (targetClassId && c.classId !== targetClassId) return false;
    if (targetDay && c.day !== targetDay) return false;
    if (targetShift && c.shift !== targetShift) return false;
    return true;
  });

  // Group cells by classId_day_shift
  const groups = new Map<string, ScheduleCell[]>();
  cellsToInspect.forEach((c) => {
    const key = `${c.classId}_${c.day}_${c.shift}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(c);
  });

  for (const [key, cellGroup] of groups.entries()) {
    const [classId, day, shift] = key.split('_') as [string, DayOfWeek, PeriodShift];

    // Map by normalized period number (1..4 for morning, 1..3 for afternoon)
    const periodMap = new Map<number, ScheduleCell>();
    cellGroup.forEach((c) => {
      const pNum = c.periodNumber > 4 ? c.periodNumber - 4 : c.periodNumber;
      periodMap.set(pNum, c);
    });

    const maxPeriod = shift === 'morning' ? 4 : 3;

    // Check for 3 consecutive periods of the same subjectId
    for (let p = 1; p <= maxPeriod - 2; p++) {
      const cell1 = periodMap.get(p);
      const cell2 = periodMap.get(p + 1);
      const cell3 = periodMap.get(p + 2);

      if (
        cell1 &&
        cell2 &&
        cell3 &&
        cell1.subjectId &&
        cell1.subjectId === cell2.subjectId &&
        cell1.subjectId === cell3.subjectId
      ) {
        const subName = subjectMap.get(cell1.subjectId)?.name || 'môn học';
        const reason = `Không thể xếp: một môn học chỉ được xếp liên tiếp tối da 2 tiết trong cùng một buổi. (Môn ${subName})`;

        return {
          valid: false,
          reason,
          violatingCellIds: [cell1.id, cell2.id, cell3.id],
          subjectId: cell1.subjectId,
          classId,
          day: day as DayOfWeek,
          shift: shift as PeriodShift,
        };
      }
    }
  }

  return { valid: true };
}

export function checkFullSchedule(
  teachers: Teacher[],
  classes: ClassItem[],
  subjects: Subject[],
  assignments: Assignment[],
  timeConfig: TimeConfig,
  cells: ScheduleCell[]
): ScheduleStats {
  const conflicts: ConflictIssue[] = [];
  const missingPeriods: MissingPeriodItem[] = [];
  const warnings: ConflictIssue[] = [];

  // Helper maps
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // 1. Calculate required vs placed periods
  let totalRequiredPeriods = 0;
  assignments.forEach((a) => {
    totalRequiredPeriods += a.periodsPerWeek;
  });

  const totalPlacedPeriods = cells.length;
  const completionPercentage =
    totalRequiredPeriods > 0
      ? Math.min(100, Math.round((totalPlacedPeriods / totalRequiredPeriods) * 100))
      : 0;

  // Map to track placed periods per assignment
  const assignmentPlacedCount = new Map<string, number>();
  cells.forEach((cell) => {
    const current = assignmentPlacedCount.get(cell.assignmentId) || 0;
    assignmentPlacedCount.set(cell.assignmentId, current + 1);
  });

  // Check C & D: Thiếu tiết & Thừa tiết
  assignments.forEach((a) => {
    const placed = assignmentPlacedCount.get(a.id) || 0;
    const cls = classMap.get(a.classId);
    const sub = subjectMap.get(a.subjectId);
    const tch = teacherMap.get(a.teacherId);

    const className = cls ? cls.name : 'Lớp ?';
    const subName = sub ? sub.name : 'Môn ?';
    const tchName = tch ? tch.name : 'GV ?';

    if (placed < a.periodsPerWeek) {
      const missing = a.periodsPerWeek - placed;
      missingPeriods.push({
        id: `missing_${a.id}`,
        classId: a.classId,
        className,
        subjectId: a.subjectId,
        subjectName: subName,
        teacherId: a.teacherId,
        teacherName: tchName,
        required: a.periodsPerWeek,
        placed,
        missing,
        message: `Lớp ${className} - Môn ${subName} (${tchName}): mới xếp ${placed}/${a.periodsPerWeek} tiết (thiếu ${missing} tiết).`,
      });
    } else if (placed > a.periodsPerWeek) {
      const extra = placed - a.periodsPerWeek;
      conflicts.push({
        id: `extra_${a.id}`,
        type: 'extra_periods',
        severity: 'critical',
        message: `🔴 Lớp ${className} - Môn ${subName} (${tchName}): đã xếp ${placed}/${a.periodsPerWeek} tiết (thừa ${extra} tiết).`,
        classId: a.classId,
        subjectId: a.subjectId,
        teacherId: a.teacherId,
      });
    }
  });

  // Group cells by slot (day_shift_periodNumber)
  const slotTeacherMap = new Map<string, ScheduleCell[]>();
  const slotClassMap = new Map<string, ScheduleCell[]>();

  // Teacher daily period counter: teacherId_day -> count
  const teacherDailyCount = new Map<string, number>();

  // Class daily subject counter: classId_day_subjectId -> count
  const classDailySubjectCount = new Map<string, number>();

  // Teacher shift slots for consecutive checking: teacherId_day_shift -> periodNumbers[]
  const teacherShiftSlots = new Map<string, number[]>();

  cells.forEach((cell) => {
    const slotKey = `${cell.day}_${cell.shift}_${cell.periodNumber}`;
    const teacherSlotKey = `${cell.teacherId}_${slotKey}`;
    const classSlotKey = `${cell.classId}_${slotKey}`;

    // Collect for teacher overlap
    if (!slotTeacherMap.has(teacherSlotKey)) {
      slotTeacherMap.set(teacherSlotKey, []);
    }
    slotTeacherMap.get(teacherSlotKey)!.push(cell);

    // Collect for class overlap
    if (!slotClassMap.has(classSlotKey)) {
      slotClassMap.set(classSlotKey, []);
    }
    slotClassMap.get(classSlotKey)!.push(cell);

    // Teacher daily count
    const tDayKey = `${cell.teacherId}_${cell.day}`;
    teacherDailyCount.set(tDayKey, (teacherDailyCount.get(tDayKey) || 0) + 1);

    // Class daily subject count
    const cDaySubKey = `${cell.classId}_${cell.day}_${cell.subjectId}`;
    classDailySubjectCount.set(cDaySubKey, (classDailySubjectCount.get(cDaySubKey) || 0) + 1);

    // Teacher shift slots
    const tShiftKey = `${cell.teacherId}_${cell.day}_${cell.shift}`;
    if (!teacherShiftSlots.has(tShiftKey)) {
      teacherShiftSlots.set(tShiftKey, []);
    }
    teacherShiftSlots.get(tShiftKey)!.push(cell.periodNumber);

    // Check E: Teacher Unavailable / Disabled slot
    const tch = teacherMap.get(cell.teacherId);
    if (tch) {
      const isUnavailable = tch.unavailableSlots.some(
        (u) => u.day === cell.day && u.shift === cell.shift && u.periodNumber === cell.periodNumber
      );
      if (isUnavailable) {
        const cls = classMap.get(cell.classId);
        const sub = subjectMap.get(cell.subjectId);
        conflicts.push({
          id: `unavail_${cell.id}`,
          type: 'teacher_unavailable',
          severity: 'critical',
          message: `🔴 ${tch.name} bị xếp tiết vào thời gian đã khóa (${cell.day} - Buổi ${
            cell.shift === 'morning' ? 'Sáng' : 'Chiều'
          } Tiết ${cell.periodNumber}) tại lớp ${cls?.name || ''} môn ${sub?.name || ''}.`,
          teacherId: cell.teacherId,
          classId: cell.classId,
          subjectId: cell.subjectId,
          day: cell.day,
          shift: cell.shift,
          periodNumber: cell.periodNumber,
        });
      }
    }

    // Check if slot disabled by school config
    const isDisabledBySchool = timeConfig.disabledSlots.some(
      (d) => d.day === cell.day && d.shift === cell.shift && d.periodNumber === cell.periodNumber
    );
    if (isDisabledBySchool) {
      const cls = classMap.get(cell.classId);
      conflicts.push({
        id: `disabled_${cell.id}`,
        type: 'teacher_unavailable',
        severity: 'critical',
        message: `🔴 Lớp ${cls?.name || ''} bị xếp tiết vào khung thời gian trường đã tắt (${
          cell.day
        } - ${cell.shift === 'morning' ? 'Sáng' : 'Chiều'} Tiết ${cell.periodNumber}).`,
        classId: cell.classId,
        day: cell.day,
        shift: cell.shift,
        periodNumber: cell.periodNumber,
      });
    }
  });

  // Check A: Teacher Overlap
  slotTeacherMap.forEach((cellGroup, key) => {
    if (cellGroup.length > 1) {
      const firstCell = cellGroup[0];
      const tch = teacherMap.get(firstCell.teacherId);
      const classNames = cellGroup
        .map((c) => classMap.get(c.classId)?.name || 'Lớp ?')
        .join(', ');
      conflicts.push({
        id: `overlap_t_${key}`,
        type: 'teacher_overlap',
        severity: 'critical',
        message: `🔴 ${tch?.name || 'Giáo viên'} bị trùng tiết ở các lớp [${classNames}] vào ${
          firstCell.day
        } - ${firstCell.shift === 'morning' ? 'Sáng' : 'Chiều'} Tiết ${firstCell.periodNumber}.`,
        teacherId: firstCell.teacherId,
        day: firstCell.day,
        shift: firstCell.shift,
        periodNumber: firstCell.periodNumber,
      });
    }
  });

  // Check B: Class Overlap
  slotClassMap.forEach((cellGroup, key) => {
    if (cellGroup.length > 1) {
      const firstCell = cellGroup[0];
      const cls = classMap.get(firstCell.classId);
      const subNames = cellGroup
        .map((c) => subjectMap.get(c.subjectId)?.name || 'Môn ?')
        .join(', ');
      conflicts.push({
        id: `overlap_c_${key}`,
        type: 'class_overlap',
        severity: 'critical',
        message: `🔴 Lớp ${cls?.name || 'Lớp'} bị trùng 2 môn [${subNames}] cùng thời điểm (${
          firstCell.day
        } - ${firstCell.shift === 'morning' ? 'Sáng' : 'Chiều'} Tiết ${firstCell.periodNumber}).`,
        classId: firstCell.classId,
        day: firstCell.day,
        shift: firstCell.shift,
        periodNumber: firstCell.periodNumber,
      });
    }
  });

  // Check Weekly Reference Standard for Teachers (Warning if assigned > maxWeeklyPeriods)
  teachers.forEach((tch) => {
    const assigned = calculateTeacherWeeklyPeriods(tch.id, assignments);
    const maxW = getTeacherMaxWeeklyPeriods(tch);
    if (assigned > maxW) {
      const diff = assigned - maxW;
      const typeText = tch.type === 'homeroom' ? 'GVCN' : 'GV bộ môn';
      warnings.push({
        id: `maxw_${tch.id}`,
        type: 'teacher_max_periods',
        severity: 'warning',
        message: `${tch.name} (${typeText}): Được phân công ${assigned}/${maxW} tiết/tuần (dư ${diff} tiết so với định mức ${maxW} tiết).`,
        teacherId: tch.id,
      });
    }

    // Hard Constraint: Teacher maxSessionsPerWeek constraint (buổi/tuần)
    const maxSessions = getTeacherMaxSessionsPerWeek(tch);
    const sessions = getTeacherSessions(tch.id, cells);
    if (sessions.size > maxSessions) {
      conflicts.push({
        id: `maxs_${tch.id}`,
        type: 'teacher_max_periods',
        severity: 'critical',
        message: `🔴 ${tch.name}: Được xếp ${sessions.size}/${maxSessions} buổi/tuần (VƯỢT QUÁ GIỚI HẠN TỐI ĐA ${maxSessions} BUỔI/TUẦN).`,
        teacherId: tch.id,
      });
    }
  });

  // Check F: Teacher Max Periods Per Day (Warning)
  teacherDailyCount.forEach((count, key) => {
    const [teacherId, day] = key.split('_');
    const tch = teacherMap.get(teacherId);
    if (tch && count > tch.maxPeriodsPerDay) {
      warnings.push({
        id: `maxp_${key}`,
        type: 'teacher_max_periods',
        severity: 'warning',
        message: `${tch.name} dạy ${count} tiết vào ${day} (vượt mức tối đa ${tch.maxPeriodsPerDay} tiết/ngày).`,
        teacherId,
        day: day as DayOfWeek,
      });
    }
  });

  // Check G: Consecutive Periods (>3 continuous periods) (Warning)
  teacherShiftSlots.forEach((periods, key) => {
    const [teacherId, day, shift] = key.split('_');
    const sorted = [...periods].sort((a, b) => a - b);
    let streak = 1;
    let maxStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else if (sorted[i] !== sorted[i - 1]) {
        streak = 1;
      }
    }
    if (maxStreak >= 4) {
      const tch = teacherMap.get(teacherId);
      warnings.push({
        id: `consec_${key}`,
        type: 'consecutive_periods',
        severity: 'warning',
        message: `${tch?.name || 'Giáo viên'} có ${maxStreak} tiết dạy liên tiếp vào ${day} (${
          shift === 'morning' ? 'Sáng' : 'Chiều'
        }).`,
        teacherId,
        day: day as DayOfWeek,
        shift: shift as PeriodShift,
      });
    }
  });

  // Check H: Subject Clustering (>2 periods of same subject in a day for a class) (Warning)
  classDailySubjectCount.forEach((count, key) => {
    const [classId, day, subjectId] = key.split('_');
    if (count > 2) {
      const cls = classMap.get(classId);
      const sub = subjectMap.get(subjectId);
      warnings.push({
        id: `cluster_${key}`,
        type: 'subject_clustering',
        severity: 'warning',
        message: `Lớp ${cls?.name || ''} có ${count} tiết môn ${sub?.name || ''} trong cùng ${day}.`,
        classId,
        subjectId,
        day: day as DayOfWeek,
      });
    }
  });

  // Check I: Critical Consecutive Subject Limit (>2 consecutive periods of same subject in a shift)
  const consecutiveCheck = validateConsecutiveSubjectLimit(cells, subjects);
  if (!consecutiveCheck.valid) {
    const groups = new Map<string, ScheduleCell[]>();
    cells.forEach((c) => {
      const key = `${c.classId}_${c.day}_${c.shift}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    groups.forEach((cellGroup, key) => {
      const [classId, day, shift] = key.split('_') as [string, DayOfWeek, PeriodShift];
      const cls = classMap.get(classId);

      const periodMap = new Map<number, ScheduleCell>();
      cellGroup.forEach((c) => {
        const pNum = c.periodNumber > 4 ? c.periodNumber - 4 : c.periodNumber;
        periodMap.set(pNum, c);
      });

      const maxPeriod = shift === 'morning' ? 4 : 3;
      for (let p = 1; p <= maxPeriod - 2; p++) {
        const c1 = periodMap.get(p);
        const c2 = periodMap.get(p + 1);
        const c3 = periodMap.get(p + 2);

        if (c1 && c2 && c3 && c1.subjectId && c1.subjectId === c2.subjectId && c1.subjectId === c3.subjectId) {
          const sub = subjectMap.get(c1.subjectId);
          conflicts.push({
            id: `consec_sub_${key}_${p}`,
            type: 'subject_clustering',
            severity: 'critical',
            message: `🔴 Lớp ${cls?.name || ''} bị xếp 3 tiết liên tiếp môn ${sub?.name || ''} vào ${day} - Buổi ${
              shift === 'morning' ? 'Sáng' : 'Chiều'
            } (Tiết ${p}–${p + 2}). Quy định: tối đa 2 tiết liên tiếp trong cùng một buổi.`,
            classId,
            subjectId: c1.subjectId,
            day,
            shift,
          });
        }
      }
    });
  }

  // Check K: Subject Shift Limit (>2 periods of same subject in same shift for a class)
  const subjectShiftCheck = validateSubjectShiftLimit(cells, subjects);
  if (!subjectShiftCheck.valid) {
    const counts = new Map<string, ScheduleCell[]>();
    cells.forEach((c) => {
      const key = `${c.classId}_${c.day}_${c.shift}_${c.subjectId}`;
      if (!counts.has(key)) counts.set(key, []);
      counts.get(key)!.push(c);
    });

    counts.forEach((cellGroup, key) => {
      if (cellGroup.length > 2) {
        const [classId, day, shift, subjectId] = key.split('_') as [string, DayOfWeek, PeriodShift, string];
        const cls = classMap.get(classId);
        const sub = subjectMap.get(subjectId);
        const dayLabel = day === 'T2' ? 'Thứ 2' : day === 'T3' ? 'Thứ 3' : day === 'T4' ? 'Thứ 4' : day === 'T5' ? 'Thứ 5' : 'Thứ 6';
        const shiftLabel = shift === 'morning' ? 'Sáng' : 'Chiều';

        conflicts.push({
          id: `subj_shift_limit_${key}`,
          type: 'subject_shift_limit',
          severity: 'critical',
          message: `🔴 Lớp ${cls?.name || ''} có ${cellGroup.length} tiết môn ${sub?.name || ''} vào ${dayLabel} - Buổi ${shiftLabel}. Quy định: Một môn trong cùng một buổi chỉ được học tối đa 2 tiết.`,
          classId,
          subjectId,
          day,
          shift,
        });
      }
    });
  }

  // Check L: GVBM Constraints (Min 2 periods/shift, No gaps in shift)
  const gvbmCheck = validateGvbmConstraints(cells, teachers);
  if (!gvbmCheck.valid) {
    const teacherShifts = new Map<string, ScheduleCell[]>();
    cells.forEach((c) => {
      const key = `${c.teacherId}_${c.day}_${c.shift}`;
      if (!teacherShifts.has(key)) teacherShifts.set(key, []);
      teacherShifts.get(key)!.push(c);
    });

    teacherShifts.forEach((cellGroup, key) => {
      const [teacherId, day, shift] = key.split('_') as [string, DayOfWeek, PeriodShift];
      const tch = teacherMap.get(teacherId);
      if (tch && tch.type !== 'homeroom') {
        const dayLabel = day === 'T2' ? 'Thứ 2' : day === 'T3' ? 'Thứ 3' : day === 'T4' ? 'Thứ 4' : day === 'T5' ? 'Thứ 5' : 'Thứ 6';
        const shiftLabel = shift === 'morning' ? 'Sáng' : 'Chiều';

        if (cellGroup.length === 1) {
          conflicts.push({
            id: `gvbm_min_${key}`,
            type: 'teacher_min_periods_per_shift',
            severity: 'critical',
            message: `🔴 GVBM "${tch.name}" - ${dayLabel} - Buổi ${shiftLabel}: Chỉ có 1 tiết dạy trong buổi. Quy định: GVBM phải có tối thiểu 2 tiết/buổi.`,
            teacherId,
            day,
            shift,
          });
        } else if (cellGroup.length >= 2) {
          const periods = cellGroup
            .map((c) => (c.periodNumber > 4 ? c.periodNumber - 4 : c.periodNumber))
            .sort((a, b) => a - b);
          const periodSet = new Set(periods);
          const minP = periods[0];
          const maxP = periods[periods.length - 1];
          let hasGap = false;
          for (let p = minP; p <= maxP; p++) {
            if (!periodSet.has(p)) {
              hasGap = true;
              break;
            }
          }
          if (hasGap) {
            conflicts.push({
              id: `gvbm_gap_${key}`,
              type: 'teacher_gap_in_shift',
              severity: 'critical',
              message: `🔴 GVBM "${tch.name}" - ${dayLabel} - Buổi ${shiftLabel}: Các tiết dạy bị gián đoạn, không được có tiết trống giữa.`,
              teacherId,
              day,
              shift,
            });
          }
        }
      }
    });
  }

  // Combined issues array for backward compatibility
  const issues: ConflictIssue[] = [
    ...conflicts,
    ...warnings,
    ...missingPeriods.map((m) => ({
      id: m.id,
      type: 'missing_periods' as const,
      severity: 'critical' as const,
      message: m.message,
      classId: m.classId,
      subjectId: m.subjectId,
      teacherId: m.teacherId,
    })),
  ];

  const totalMissingPeriodsCount = missingPeriods.reduce((acc, m) => acc + m.missing, 0);

  return {
    totalTeachers: teachers.length,
    totalClasses: classes.length,
    totalSubjects: subjects.length,
    totalRequiredPeriods,
    totalPlacedPeriods,
    assignedPeriods: totalPlacedPeriods,
    requiredPeriods: totalRequiredPeriods,
    completionPercentage,
    criticalErrorCount: conflicts.length, // STRICTLY HARD CONFLICTS!
    warningCount: warnings.length,
    missingCount: missingPeriods.length,
    totalMissingPeriodsCount,
    issues,
    conflicts,
    missingPeriods,
    warnings,
  };
}

/**
  Finds position suggestions for an assignment to be placed.
*/
export function getSlotSuggestions(
  assignment: Assignment,
  teachers: Teacher[],
  classes: ClassItem[],
  subjects: Subject[],
  timeConfig: TimeConfig,
  cells: ScheduleCell[]
): SuggestionSlot[] {
  const suggestions: SuggestionSlot[] = [];
  const teacher = teachers.find((t) => t.id === assignment.teacherId);
  const cls = classes.find((c) => c.id === assignment.classId);

  if (!teacher || !cls) return suggestions;

  const days = timeConfig.enabledDays;
  const shifts: PeriodShift[] = ['morning', 'afternoon'];

  days.forEach((day) => {
    shifts.forEach((shift) => {
      const maxP = shift === 'morning' ? timeConfig.morningPeriodsCount : timeConfig.afternoonPeriodsCount;
      for (let p = 1; p <= maxP; p++) {
        // Check if slot disabled by school
        const isDisabledSchool = timeConfig.disabledSlots.some(
          (d) => d.day === day && d.shift === shift && d.periodNumber === p
        );
        if (isDisabledSchool) {
          suggestions.push({ day, shift, periodNumber: p, isValid: false, reason: 'Trường đã tắt tiết này' });
          continue;
        }

        // Check if slot locked for teacher
        const isUnavailableTeacher = teacher.unavailableSlots.some(
          (u) => u.day === day && u.shift === shift && u.periodNumber === p
        );
        if (isUnavailableTeacher) {
          suggestions.push({
            day,
            shift,
            periodNumber: p,
            isValid: false,
            reason: `${teacher.name} bận/đã khóa thời gian này`,
          });
          continue;
        }

        // Check if class already has a subject in this slot
        const classOccupied = cells.find(
          (c) => c.classId === assignment.classId && c.day === day && c.shift === shift && c.periodNumber === p
        );
        if (classOccupied) {
          const sub = subjects.find((s) => s.id === classOccupied.subjectId);
          suggestions.push({
            day,
            shift,
            periodNumber: p,
            isValid: false,
            reason: `Lớp ${cls.name} đã xếp môn ${sub?.name || ''}`,
          });
          continue;
        }

        // Check if teacher already teaching another class in this slot
        const teacherOccupied = cells.find(
          (c) => c.teacherId === assignment.teacherId && c.day === day && c.shift === shift && c.periodNumber === p
        );
        if (teacherOccupied) {
          const occClass = classes.find((c) => c.id === teacherOccupied.classId);
          suggestions.push({
            day,
            shift,
            periodNumber: p,
            isValid: false,
            reason: `${teacher.name} đang dạy lớp ${occClass?.name || ''}`,
          });
          continue;
        }

        // Check Hard Constraint: Teacher maxSessionsPerWeek (buổi/tuần)
        const maxSessions = getTeacherMaxSessionsPerWeek(teacher);
        const currentTeacherSessions = getTeacherSessions(teacher.id, cells);
        const isExistingSession = currentTeacherSessions.has(`${day}_${shift}`);
        if (!isExistingSession && currentTeacherSessions.size >= maxSessions) {
          suggestions.push({
            day,
            shift,
            periodNumber: p,
            isValid: false,
            reason: `${teacher.name} đã đủ ${maxSessions} buổi/tuần (xếp thêm sẽ tạo thành buổi thứ ${currentTeacherSessions.size + 1})`,
          });
          continue;
        }

        // Check Hard Constraint: Max 2 consecutive periods for same subject in same shift & day
        const testCell: ScheduleCell = {
          id: 'test_sugg',
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
          [...cells, testCell],
          subjects,
          assignment.classId,
          day,
          shift
        );
        if (!consecVal.valid) {
          const sub = subjects.find((s) => s.id === assignment.subjectId);
          suggestions.push({
            day,
            shift,
            periodNumber: p,
            isValid: false,
            reason: `Môn ${sub?.name || ''} chỉ được xếp liên tiếp tối đa 2 tiết trong một buổi`,
          });
          continue;
        }

        // Check Hard Constraint: Max 2 TOTAL periods for same subject in same shift
        const shiftLimitVal = validateSubjectShiftLimit(
          [...cells, testCell],
          subjects,
          assignment.classId,
          day,
          shift
        );
        if (!shiftLimitVal.valid) {
          const sub = subjects.find((s) => s.id === assignment.subjectId);
          suggestions.push({
            day,
            shift,
            periodNumber: p,
            isValid: false,
            reason: `Môn ${sub?.name || ''} chỉ được xuất hiện tối đa 2 tiết trong một buổi`,
          });
          continue;
        }

        // If none of the above, slot is valid!
        suggestions.push({
          day,
          shift,
          periodNumber: p,
          isValid: true,
        });
      }
    });
  });

  return suggestions;
}
