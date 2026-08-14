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
import { normalizeScheduleCells, deduplicateScheduleCells, getTeacherConsecutiveWarnings, isCellForAssignment, countPlacedPeriodsForAssignment } from './timetableUtils';

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

  interface SubjectShiftGroup {
    classId: string;
    day: DayOfWeek;
    shift: PeriodShift;
    subjectId: string;
    cells: ScheduleCell[];
  }

  // Safe structured map grouping - avoids split('_') bugs
  const counts = new Map<string, SubjectShiftGroup>();
  cellsToInspect.forEach((c) => {
    const safeKey = `${c.classId}:::${c.day}:::${c.shift}:::${c.subjectId}`;
    if (!counts.has(safeKey)) {
      counts.set(safeKey, {
        classId: c.classId,
        day: c.day,
        shift: c.shift,
        subjectId: c.subjectId,
        cells: [],
      });
    }
    counts.get(safeKey)!.cells.push(c);
  });

  const dayNames: Record<DayOfWeek, string> = {
    T2: 'Thứ 2',
    T3: 'Thứ 3',
    T4: 'Thứ 4',
    T5: 'Thứ 5',
    T6: 'Thứ 6',
  };

  for (const group of counts.values()) {
    if (group.cells.length > 2) {
      const subName = subjectMap.get(group.subjectId)?.name || 'môn học';
      const dayLabel = dayNames[group.day] || group.day;
      const shiftLabel = group.shift === 'morning' ? 'Sáng' : 'Chiều';

      return {
        valid: false,
        reason: `Môn "${subName}" xuất hiện ${group.cells.length} tiết vào ${dayLabel} - Buổi ${shiftLabel}. Quy định: Một môn trong cùng một buổi chỉ được học tối đa 2 tiết.`,
        violatingCellIds: group.cells.map((c) => c.id),
        subjectId: group.subjectId,
        classId: group.classId,
        day: group.day,
        shift: group.shift,
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

  interface TeacherShiftGroup {
    teacherId: string;
    day: DayOfWeek;
    shift: PeriodShift;
    cells: ScheduleCell[];
  }

  // Safe structured map grouping - avoids split('_') bugs
  const teacherShifts = new Map<string, TeacherShiftGroup>();

  proposedCells.forEach((c) => {
    if (targetTeacherId && c.teacherId !== targetTeacherId) return;
    if (targetDay && c.day !== targetDay) return;
    if (targetShift && c.shift !== targetShift) return;

    const safeKey = `${c.teacherId}:::${c.day}:::${c.shift}`;
    if (!teacherShifts.has(safeKey)) {
      teacherShifts.set(safeKey, {
        teacherId: c.teacherId,
        day: c.day,
        shift: c.shift,
        cells: [],
      });
    }
    teacherShifts.get(safeKey)!.cells.push(c);
  });

  const dayNames: Record<DayOfWeek, string> = {
    T2: 'Thứ 2',
    T3: 'Thứ 3',
    T4: 'Thứ 4',
    T5: 'Thứ 5',
    T6: 'Thứ 6',
  };

  for (const group of teacherShifts.values()) {
    const teacher = teacherMap.get(group.teacherId);

    // Applies strictly to subject teachers (type !== 'homeroom')
    if (teacher && teacher.type !== 'homeroom') {
      const dayLabel = dayNames[group.day] || group.day;
      const shiftLabel = group.shift === 'morning' ? 'Sáng' : 'Chiều';
      const count = group.cells.length;

      // Constraint 1: Minimum 2 periods per shift
      if (count === 1) {
        return {
          valid: false,
          reason: `GVBM "${teacher.name}" - ${dayLabel} - Buổi ${shiftLabel}: Chỉ có 1 tiết dạy trong buổi. GVBM phải có tối thiểu 2 tiết/buổi.`,
          errorType: 'TEACHER_MIN_PERIODS_PER_SHIFT',
          violatingCellIds: group.cells.map((c) => c.id),
          teacherId: group.teacherId,
          day: group.day,
          shift: group.shift,
        };
      }

      // Constraint 2: No gaps between teaching periods in the shift
      if (count >= 2) {
        const periods = group.cells
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
              violatingCellIds: group.cells.map((c) => c.id),
              teacherId: group.teacherId,
              day: group.day,
              shift: group.shift,
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

  interface ClassShiftGroup {
    classId: string;
    day: DayOfWeek;
    shift: PeriodShift;
    cells: ScheduleCell[];
  }

  // Safe structured map grouping - avoids split('_') bugs
  const groups = new Map<string, ClassShiftGroup>();
  cellsToInspect.forEach((c) => {
    const safeKey = `${c.classId}:::${c.day}:::${c.shift}`;
    if (!groups.has(safeKey)) {
      groups.set(safeKey, {
        classId: c.classId,
        day: c.day,
        shift: c.shift,
        cells: [],
      });
    }
    groups.get(safeKey)!.cells.push(c);
  });

  for (const group of groups.values()) {
    const { classId, day, shift, cells: cellGroup } = group;

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
        const reason = `Không thể xếp: một môn học chỉ được xếp liên tiếp tối đa 2 tiết trong cùng một buổi. (Môn ${subName})`;

        return {
          valid: false,
          reason,
          violatingCellIds: [cell1.id, cell2.id, cell3.id],
          subjectId: cell1.subjectId,
          classId,
          day,
          shift,
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
  rawCells: ScheduleCell[]
): ScheduleStats {
  const cells = deduplicateScheduleCells(rawCells || [], assignments);
  const conflicts: ConflictIssue[] = [];
  const missingPeriods: MissingPeriodItem[] = [];
  const warnings: ConflictIssue[] = [];

  // Helper maps
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const dayNames: Record<DayOfWeek, string> = {
    T2: 'Thứ 2',
    T3: 'Thứ 3',
    T4: 'Thứ 4',
    T5: 'Thứ 5',
    T6: 'Thứ 6',
  };

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

  // Check C & D: Thiếu tiết & Thừa tiết
  assignments.forEach((a) => {
    const placed = countPlacedPeriodsForAssignment(cells, a);
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

  // Group cells by slot safely using structured objects
  interface SlotGroup {
    ownerId: string;
    day: DayOfWeek;
    shift: PeriodShift;
    periodNumber: number;
    cells: ScheduleCell[];
  }

  const slotTeacherMap = new Map<string, SlotGroup>();
  const slotClassMap = new Map<string, SlotGroup>();

  // Teacher daily period counter: safe object
  interface TeacherDailyGroup {
    teacherId: string;
    day: DayOfWeek;
    count: number;
  }
  const teacherDailyCount = new Map<string, TeacherDailyGroup>();

  // Class daily subject counter: safe object
  interface ClassDailySubjectGroup {
    classId: string;
    day: DayOfWeek;
    subjectId: string;
    count: number;
  }
  const classDailySubjectCount = new Map<string, ClassDailySubjectGroup>();

  // Safe structures for shift and consecutive checking
  interface TeacherShiftGroup {
    teacherId: string;
    day: DayOfWeek;
    shift: PeriodShift;
    cells: ScheduleCell[];
  }
  const teacherShiftsMap = new Map<string, TeacherShiftGroup>();

  interface ClassShiftGroup {
    classId: string;
    day: DayOfWeek;
    shift: PeriodShift;
    cells: ScheduleCell[];
  }
  const classShiftsMap = new Map<string, ClassShiftGroup>();

  interface ClassShiftSubjectGroup {
    classId: string;
    day: DayOfWeek;
    shift: PeriodShift;
    subjectId: string;
    cells: ScheduleCell[];
  }
  const classShiftSubjectMap = new Map<string, ClassShiftSubjectGroup>();

  cells.forEach((cell) => {
    const dayText = dayNames[cell.day] || cell.day;
    const shiftText = cell.shift === 'morning' ? 'Sáng' : 'Chiều';
    const cls = classMap.get(cell.classId);
    const tch = teacherMap.get(cell.teacherId);
    const sub = subjectMap.get(cell.subjectId);

    // CRITICAL HARD CHECK: Invalid Session Periods (Morning > 4 or Afternoon > 3)
    if (cell.shift === 'afternoon' && cell.periodNumber > 3) {
      conflicts.push({
        id: `invalid_afternoon_slot_${cell.classId}_${cell.day}_${cell.periodNumber}`,
        type: 'teacher_unavailable',
        severity: 'critical',
        message: `🔴 Lỗi TKB: Buổi chiều chỉ có 3 tiết nhưng phát hiện tiết thứ ${cell.periodNumber} (${dayText}) tại lớp ${cls?.name || 'Lớp'}${tch ? ` (GV: ${tch.name})` : ''}${sub ? ` (Môn: ${sub.name})` : ''}.`,
        classId: cell.classId,
        teacherId: cell.teacherId,
        subjectId: cell.subjectId,
        day: cell.day,
        shift: cell.shift,
        periodNumber: cell.periodNumber,
      });
    } else if (cell.shift === 'morning' && cell.periodNumber > 4) {
      conflicts.push({
        id: `invalid_morning_slot_${cell.classId}_${cell.day}_${cell.periodNumber}`,
        type: 'teacher_unavailable',
        severity: 'critical',
        message: `🔴 Lỗi TKB: Buổi sáng chỉ có 4 tiết nhưng phát hiện tiết thứ ${cell.periodNumber} (${dayText}) tại lớp ${cls?.name || 'Lớp'}${tch ? ` (GV: ${tch.name})` : ''}${sub ? ` (Môn: ${sub.name})` : ''}.`,
        classId: cell.classId,
        teacherId: cell.teacherId,
        subjectId: cell.subjectId,
        day: cell.day,
        shift: cell.shift,
        periodNumber: cell.periodNumber,
      });
    }

    // Collect for teacher slot overlap
    if (cell.teacherId) {
      const teacherSlotKey = `${cell.teacherId}:::${cell.day}:::${cell.shift}:::${cell.periodNumber}`;
      if (!slotTeacherMap.has(teacherSlotKey)) {
        slotTeacherMap.set(teacherSlotKey, {
          ownerId: cell.teacherId,
          day: cell.day,
          shift: cell.shift,
          periodNumber: cell.periodNumber,
          cells: [],
        });
      }
      slotTeacherMap.get(teacherSlotKey)!.cells.push(cell);

      // Teacher daily count
      const tDayKey = `${cell.teacherId}:::${cell.day}`;
      if (!teacherDailyCount.has(tDayKey)) {
        teacherDailyCount.set(tDayKey, {
          teacherId: cell.teacherId,
          day: cell.day,
          count: 0,
        });
      }
      teacherDailyCount.get(tDayKey)!.count += 1;

      // Teacher shifts
      const tShiftKey = `${cell.teacherId}:::${cell.day}:::${cell.shift}`;
      if (!teacherShiftsMap.has(tShiftKey)) {
        teacherShiftsMap.set(tShiftKey, {
          teacherId: cell.teacherId,
          day: cell.day,
          shift: cell.shift,
          cells: [],
        });
      }
      teacherShiftsMap.get(tShiftKey)!.cells.push(cell);
    }

    // Collect for class slot overlap
    if (cell.classId) {
      const classSlotKey = `${cell.classId}:::${cell.day}:::${cell.shift}:::${cell.periodNumber}`;
      if (!slotClassMap.has(classSlotKey)) {
        slotClassMap.set(classSlotKey, {
          ownerId: cell.classId,
          day: cell.day,
          shift: cell.shift,
          periodNumber: cell.periodNumber,
          cells: [],
        });
      }
      slotClassMap.get(classSlotKey)!.cells.push(cell);

      // Class daily subject count
      const cDaySubKey = `${cell.classId}:::${cell.day}:::${cell.subjectId}`;
      if (!classDailySubjectCount.has(cDaySubKey)) {
        classDailySubjectCount.set(cDaySubKey, {
          classId: cell.classId,
          day: cell.day,
          subjectId: cell.subjectId,
          count: 0,
        });
      }
      classDailySubjectCount.get(cDaySubKey)!.count += 1;

      // Class shifts
      const cShiftKey = `${cell.classId}:::${cell.day}:::${cell.shift}`;
      if (!classShiftsMap.has(cShiftKey)) {
        classShiftsMap.set(cShiftKey, {
          classId: cell.classId,
          day: cell.day,
          shift: cell.shift,
          cells: [],
        });
      }
      classShiftsMap.get(cShiftKey)!.cells.push(cell);

      // Class shift subjects
      const cShiftSubKey = `${cell.classId}:::${cell.day}:::${cell.shift}:::${cell.subjectId}`;
      if (!classShiftSubjectMap.has(cShiftSubKey)) {
        classShiftSubjectMap.set(cShiftSubKey, {
          classId: cell.classId,
          day: cell.day,
          shift: cell.shift,
          subjectId: cell.subjectId,
          cells: [],
        });
      }
      classShiftSubjectMap.get(cShiftSubKey)!.cells.push(cell);
    }

    // Check E: Teacher Unavailable / Disabled slot
    if (tch) {
      const isUnavailable = tch.unavailableSlots.some(
        (u) => u.day === cell.day && u.shift === cell.shift && Number(u.periodNumber) === Number(cell.periodNumber)
      );
      if (isUnavailable) {
        conflicts.push({
          id: `unavail_${cell.id}`,
          type: 'teacher_unavailable',
          severity: 'critical',
          message: `🔴 ${tch.name} bị xếp tiết vào thời gian đã khóa (${dayText} - Buổi ${shiftText} Tiết ${cell.periodNumber}) tại lớp ${cls?.name || ''} môn ${sub?.name || ''}.`,
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
      (d) => d.day === cell.day && d.shift === cell.shift && Number(d.periodNumber) === Number(cell.periodNumber)
    );
    if (isDisabledBySchool) {
      conflicts.push({
        id: `disabled_${cell.id}`,
        type: 'teacher_unavailable',
        severity: 'critical',
        message: `🔴 Lớp ${cls?.name || ''} bị xếp tiết vào khung thời gian trường đã tắt (${dayText} - Buổi ${shiftText} Tiết ${cell.periodNumber}).`,
        classId: cell.classId,
        day: cell.day,
        shift: cell.shift,
        periodNumber: cell.periodNumber,
      });
    }
  });

  // Check A: Teacher Overlap
  slotTeacherMap.forEach((group) => {
    if (group.cells.length > 1) {
      const firstCell = group.cells[0];
      const tch = teacherMap.get(group.ownerId);
      const classNames = group.cells
        .map((c) => classMap.get(c.classId)?.name || 'Lớp ?')
        .join(', ');
      const dayText = dayNames[firstCell.day] || firstCell.day;
      const shiftText = firstCell.shift === 'morning' ? 'Sáng' : 'Chiều';
      conflicts.push({
        id: `overlap_t_${group.ownerId}_${firstCell.day}_${firstCell.shift}_${firstCell.periodNumber}`,
        type: 'teacher_overlap',
        severity: 'critical',
        message: `🔴 ${tch?.name || 'Giáo viên'} bị trùng tiết ở các lớp [${classNames}] vào ${dayText} - Buổi ${shiftText} Tiết ${firstCell.periodNumber}.`,
        teacherId: group.ownerId,
        day: firstCell.day,
        shift: firstCell.shift,
        periodNumber: firstCell.periodNumber,
      });
    }
  });

  // Check B: Class Overlap
  slotClassMap.forEach((group) => {
    if (group.cells.length > 1) {
      const firstCell = group.cells[0];
      const cls = classMap.get(group.ownerId);
      const subNames = group.cells
        .map((c) => subjectMap.get(c.subjectId)?.name || 'Môn ?')
        .join(', ');
      const dayText = dayNames[firstCell.day] || firstCell.day;
      const shiftText = firstCell.shift === 'morning' ? 'Sáng' : 'Chiều';
      conflicts.push({
        id: `overlap_c_${group.ownerId}_${firstCell.day}_${firstCell.shift}_${firstCell.periodNumber}`,
        type: 'class_overlap',
        severity: 'critical',
        message: `🔴 Lớp ${cls?.name || 'Lớp'} bị trùng 2 môn [${subNames}] cùng thời điểm (${dayText} - Buổi ${shiftText} Tiết ${firstCell.periodNumber}).`,
        classId: group.ownerId,
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
  teacherDailyCount.forEach((group) => {
    const { teacherId, day, count } = group;
    const tch = teacherMap.get(teacherId);
    if (tch && count > tch.maxPeriodsPerDay) {
      const dayText = dayNames[day] || day;
      warnings.push({
        id: `maxp_${teacherId}_${day}`,
        type: 'teacher_max_periods',
        severity: 'warning',
        message: `${tch.name} dạy ${count} tiết vào ${dayText} (vượt mức tối đa ${tch.maxPeriodsPerDay} tiết/ngày).`,
        teacherId,
        day,
      });
    }
  });

  // Check G: Consecutive Periods (Warning if streak > 4 in morning; Afternoon 1..3 and Morning 1..4 are standard 0 warnings)
  const consecWarnings = getTeacherConsecutiveWarnings(cells, teachers, assignments);
  warnings.push(...consecWarnings);

  // Check H: Subject Clustering (>2 periods of same subject in a day for a class) (Warning)
  classDailySubjectCount.forEach((group) => {
    const { classId, day, subjectId, count } = group;
    if (count > 2) {
      const cls = classMap.get(classId);
      const sub = subjectMap.get(subjectId);
      const dayText = dayNames[day] || day;
      warnings.push({
        id: `cluster_${classId}_${day}_${subjectId}`,
        type: 'subject_clustering',
        severity: 'warning',
        message: `Lớp ${cls?.name || ''} có ${count} tiết môn ${sub?.name || ''} trong cùng ${dayText}.`,
        classId,
        subjectId,
        day,
      });
    }
  });

  // Check I: Critical Consecutive Subject Limit (>2 consecutive periods of same subject in a shift)
  classShiftsMap.forEach((group) => {
    const { classId, day, shift, cells: cellGroup } = group;
    const cls = classMap.get(classId);
    const dayText = dayNames[day] || day;
    const shiftText = shift === 'morning' ? 'Sáng' : 'Chiều';

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
          id: `consec_sub_${classId}_${day}_${shift}_${p}`,
          type: 'subject_clustering',
          severity: 'critical',
          message: `🔴 Lớp ${cls?.name || ''} bị xếp 3 tiết liên tiếp môn ${sub?.name || ''} vào ${dayText} - Buổi ${shiftText} (Tiết ${p}–${p + 2}). Quy định: tối đa 2 tiết liên tiếp trong cùng một buổi.`,
          classId,
          subjectId: c1.subjectId,
          day,
          shift,
        });
      }
    }
  });

  // Check K: Subject Shift Limit (>2 periods of same subject in same shift for a class)
  classShiftSubjectMap.forEach((group) => {
    const { classId, day, shift, subjectId, cells: cellGroup } = group;
    if (cellGroup.length > 2) {
      const cls = classMap.get(classId);
      const sub = subjectMap.get(subjectId);
      const dayLabel = dayNames[day] || day;
      const shiftLabel = shift === 'morning' ? 'Sáng' : 'Chiều';

      conflicts.push({
        id: `subj_shift_limit_${classId}_${day}_${shift}_${subjectId}`,
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

  // Check L: GVBM Constraints (Min 2 periods/shift, No gaps in shift)
  teacherShiftsMap.forEach((group) => {
    const { teacherId, day, shift, cells: cellGroup } = group;
    const tch = teacherMap.get(teacherId);
    if (tch && tch.type !== 'homeroom') {
      const dayLabel = dayNames[day] || day;
      const shiftLabel = shift === 'morning' ? 'Sáng' : 'Chiều';

      if (cellGroup.length === 1) {
        conflicts.push({
          id: `gvbm_min_${teacherId}_${day}_${shift}`,
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
            id: `gvbm_gap_${teacherId}_${day}_${shift}`,
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

  // Strict deterministic deduplication for 100% idempotent audit results
  const uniqueConflictMap = new Map<string, ConflictIssue>();
  conflicts.forEach((c) => uniqueConflictMap.set(c.id, c));
  const deduplicatedConflicts = Array.from(uniqueConflictMap.values());

  const uniqueWarningMap = new Map<string, ConflictIssue>();
  warnings.forEach((w) => uniqueWarningMap.set(w.id, w));
  const deduplicatedWarnings = Array.from(uniqueWarningMap.values());

  const uniqueMissingMap = new Map<string, MissingPeriodItem>();
  missingPeriods.forEach((m) => uniqueMissingMap.set(m.id, m));
  const deduplicatedMissing = Array.from(uniqueMissingMap.values());

  const uniqueIssueMap = new Map<string, ConflictIssue>();
  [
    ...deduplicatedConflicts,
    ...deduplicatedWarnings,
    ...deduplicatedMissing.map((m) => ({
      id: m.id,
      type: 'missing_periods' as const,
      severity: 'critical' as const,
      message: m.message,
      classId: m.classId,
      subjectId: m.subjectId,
      teacherId: m.teacherId,
    })),
  ].forEach((issue) => uniqueIssueMap.set(issue.id, issue));

  const issues = Array.from(uniqueIssueMap.values());
  const totalMissingPeriodsCount = deduplicatedMissing.reduce((acc, m) => acc + m.missing, 0);

  return {
    totalTeachers: teachers.length,
    totalClasses: classes.length,
    totalSubjects: subjects.length,
    totalRequiredPeriods,
    totalPlacedPeriods,
    assignedPeriods: totalPlacedPeriods,
    requiredPeriods: totalRequiredPeriods,
    completionPercentage,
    criticalErrorCount: deduplicatedConflicts.length,
    warningCount: deduplicatedWarnings.length,
    missingCount: deduplicatedMissing.length,
    totalMissingPeriodsCount,
    issues,
    conflicts: deduplicatedConflicts,
    missingPeriods: deduplicatedMissing,
    warnings: deduplicatedWarnings,
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
