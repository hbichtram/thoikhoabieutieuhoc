import { Teacher, Assignment, ClassItem, Subject, ScheduleCell } from '../types';

/**
 * Sanitizes and normalizes a teacher object to ensure NO fields are undefined.
 * Guarantees compatibility with Firestore setDoc() and strict UI rendering.
 */
export function normalizeTeacher(teacher: Partial<Teacher>): Teacher {
  const type: 'homeroom' | 'subject' = teacher.type === 'homeroom' ? 'homeroom' : 'subject';
  
  let maxSessions = 6;
  if (
    teacher.maxSessionsPerWeek !== undefined &&
    teacher.maxSessionsPerWeek !== null &&
    !isNaN(Number(teacher.maxSessionsPerWeek))
  ) {
    maxSessions = Math.min(7, Math.max(1, Number(teacher.maxSessionsPerWeek)));
  }

  const defaultMaxWeekly = type === 'homeroom' ? 20 : 23;
  const maxWeeklyPeriods =
    teacher.maxWeeklyPeriods && Number(teacher.maxWeeklyPeriods) > 0
      ? Number(teacher.maxWeeklyPeriods)
      : defaultMaxWeekly;

  const maxPeriodsPerDay =
    teacher.maxPeriodsPerDay && Number(teacher.maxPeriodsPerDay) > 0
      ? Number(teacher.maxPeriodsPerDay)
      : 4;

  const unavailableSlots = Array.isArray(teacher.unavailableSlots)
    ? teacher.unavailableSlots.map((slot) => ({
        day: slot.day,
        shift: slot.shift,
        periodNumber: Number(slot.periodNumber),
        reason: slot.reason ?? '',
      }))
    : [];

  const normalized: Teacher = {
    id: teacher.id || `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    code: teacher.code ?? '',
    name: teacher.name ?? '',
    type,
    mainSubjectId: teacher.mainSubjectId ?? '',
    homeroomClassId: teacher.homeroomClassId ?? '',
    maxWeeklyPeriods,
    maxSessionsPerWeek: maxSessions,
    maxPeriodsPerDay,
    notes: teacher.notes ?? '',
    unavailableSlots,
  };

  return normalized;
}

/**
 * Returns the maximum weekly periods for a teacher.
 * Homeroom teacher (GVCN) max default: 20
 * Subject teacher (GV bộ môn) max default: 23
 */
export function getTeacherMaxWeeklyPeriods(teacher: Teacher): number {
  if (teacher.maxWeeklyPeriods && teacher.maxWeeklyPeriods > 0) {
    return teacher.maxWeeklyPeriods;
  }
  return teacher.type === 'homeroom' ? 20 : 23;
}

/**
 * Calculates total assigned periods per week for a teacher across all assignments.
 */
export function calculateTeacherWeeklyPeriods(teacherId: string, assignments: Assignment[]): number {
  return assignments
    .filter((a) => a.teacherId === teacherId)
    .reduce((sum, a) => sum + (a.periodsPerWeek || 0), 0);
}

/**
 * Gets unique class IDs assigned to a teacher.
 */
export function getTeacherClassIds(teacherId: string, assignments: Assignment[]): string[] {
  const classIds = new Set<string>();
  assignments.forEach((a) => {
    if (a.teacherId === teacherId && a.classId) {
      classIds.add(a.classId);
    }
  });
  return Array.from(classIds);
}

/**
 * Gets unique Class objects assigned to a teacher.
 */
export function getTeacherAssignedClasses(
  teacherId: string,
  assignments: Assignment[],
  classes: ClassItem[]
): ClassItem[] {
  const classIds = new Set(getTeacherClassIds(teacherId, assignments));
  return classes.filter((c) => classIds.has(c.id));
}

/**
 * Calculates number of unique classes assigned to a teacher.
 */
export function getTeacherClassCount(teacherId: string, assignments: Assignment[]): number {
  return getTeacherClassIds(teacherId, assignments).length;
}

/**
 * Gets unique Subject objects assigned to a teacher.
 */
export function getTeacherAssignedSubjects(
  teacherId: string,
  assignments: Assignment[],
  subjects: Subject[]
): Subject[] {
  const subjectIds = new Set<string>();
  assignments.forEach((a) => {
    if (a.teacherId === teacherId && a.subjectId) {
      subjectIds.add(a.subjectId);
    }
  });
  return subjects.filter((s) => subjectIds.has(s.id));
}

/**
 * Calculates placed periods for a teacher in schedule cells.
 */
export function getTeacherPlacedCellCount(teacherId: string, cells: ScheduleCell[]): number {
  return cells.filter((c) => c.teacherId === teacherId).length;
}

/**
 * Returns the maximum sessions (buổi/tuần) for a teacher.
 * Valid range: 1..7. Default fallback for legacy data: 7.
 */
export function getTeacherMaxSessionsPerWeek(teacher: Teacher): number {
  if (
    teacher.maxSessionsPerWeek !== undefined &&
    teacher.maxSessionsPerWeek !== null &&
    teacher.maxSessionsPerWeek >= 1 &&
    teacher.maxSessionsPerWeek <= 7
  ) {
    return teacher.maxSessionsPerWeek;
  }
  return 7;
}

export type TeacherWeeklyStatus = 'within_limit' | 'reached_max' | 'exceeded';

export interface TeacherLimitCheck {
  assigned: number;
  max: number;
  status: TeacherWeeklyStatus;
  label: string;
  badgeClass: string;
  diff: number;
}

/**
 * Checks teacher weekly period status against reference standard (20/23 periods).
 * Reference standard principles:
 * - Assigned > Standard -> 🟠 Dư X tiết (WARNING / REFERENCE ONLY, NOT A HARD CONSTRAINT)
 * - Assigned === Standard -> 🟢 Đúng định mức
 * - Assigned < Standard -> 🔵 Thiếu X tiết
 */
export function checkTeacherWeeklyLimit(teacher: Teacher, assignments: Assignment[]): TeacherLimitCheck {
  const assigned = calculateTeacherWeeklyPeriods(teacher.id, assignments);
  const max = getTeacherMaxWeeklyPeriods(teacher);

  if (assigned > max) {
    const diff = assigned - max;
    return {
      assigned,
      max,
      status: 'exceeded',
      label: `🟠 Dư ${diff} tiết`,
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
      diff,
    };
  }

  if (assigned === max) {
    return {
      assigned,
      max,
      status: 'reached_max',
      label: '🟢 Đúng định mức',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold',
      diff: 0,
    };
  }

  // assigned < max
  const diff = max - assigned;
  return {
    assigned,
    max,
    status: 'within_limit',
    label: `🔵 Thiếu ${diff} tiết`,
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 font-bold',
    diff,
  };
}

/**
 * Summary statistics for teachers list view header.
 */
export function getTeacherStatsSummary(teachers: Teacher[], assignments: Assignment[]) {
  const totalTeachers = teachers.length;
  let teachersWithAssignments = 0;
  let teachersWithoutAssignments = 0;
  let totalAssignedPeriods = 0;
  let exceededTeachers = 0;

  teachers.forEach((t) => {
    const assigned = calculateTeacherWeeklyPeriods(t.id, assignments);
    const max = getTeacherMaxWeeklyPeriods(t);
    totalAssignedPeriods += assigned;

    if (assigned > 0) {
      teachersWithAssignments++;
    } else {
      teachersWithoutAssignments++;
    }

    if (assigned > max) {
      exceededTeachers++;
    }
  });

  return {
    totalTeachers,
    teachersWithAssignments,
    teachersWithoutAssignments,
    totalAssignedPeriods,
    exceededTeachers,
  };
}

/**
 * Returns set of unique sessions (day_shift) taught by a teacher in the schedule.
 * A session is defined by day (e.g., T2) + shift (morning/afternoon).
 */
export function getTeacherSessions(teacherId: string, cells: ScheduleCell[]): Set<string> {
  const sessions = new Set<string>();
  cells.forEach((c) => {
    if (c.teacherId === teacherId && c.day && c.shift) {
      sessions.add(`${c.day}_${c.shift}`);
    }
  });
  return sessions;
}

/**
 * Returns number of unique sessions taught by a teacher per week.
 */
export function getTeacherSessionCount(teacherId: string, cells: ScheduleCell[]): number {
  return getTeacherSessions(teacherId, cells).size;
}

export interface TeacherSessionCheck {
  count: number;
  max: number;
  isExceeded: boolean;
  isAtMax: boolean;
  label: string;
  badgeClass: string;
}

/**
 * Checks if teacher exceeds or reaches maximum sessions/week setting (maxSessionsPerWeek).
 * maxSessionsPerWeek is a HARD CONSTRAINT (Ràng buộc cứng).
 */
export function checkTeacherSessionLimit(
  teacherOrId: Teacher | string,
  cells: ScheduleCell[],
  teachers?: Teacher[]
): TeacherSessionCheck {
  let teacher: Teacher | undefined;
  let teacherId: string;

  if (typeof teacherOrId === 'string') {
    teacherId = teacherOrId;
    teacher = teachers?.find((t) => t.id === teacherId);
  } else {
    teacher = teacherOrId;
    teacherId = teacher.id;
  }

  const count = getTeacherSessionCount(teacherId, cells);
  const max = teacher ? getTeacherMaxSessionsPerWeek(teacher) : 7;

  if (count > max) {
    return {
      count,
      max,
      isExceeded: true,
      isAtMax: false,
      label: `🔴 ${count}/${max} buổi (Vượt ${count - max} buổi)`,
      badgeClass: 'bg-red-50 text-red-800 border border-red-300 font-bold',
    };
  }

  if (count === max) {
    return {
      count,
      max,
      isExceeded: false,
      isAtMax: true,
      label: `🟠 ${count}/${max} buổi (Đã đạt tối đa)`,
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
    };
  }

  return {
    count,
    max,
    isExceeded: false,
    isAtMax: false,
    label: `🟢 ${count}/${max} buổi`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold',
  };
}

/**
 * Calculates total gap/idle periods (tiết trống) for a teacher in a schedule.
 * A gap period is an unassigned period between min and max period in the same session.
 */
export function getTeacherGapPeriods(teacherId: string, cells: ScheduleCell[]): number {
  const teacherCells = cells.filter((c) => c.teacherId === teacherId);
  const sessionPeriods = new Map<string, number[]>();

  teacherCells.forEach((c) => {
    const key = `${c.day}_${c.shift}`;
    if (!sessionPeriods.has(key)) {
      sessionPeriods.set(key, []);
    }
    sessionPeriods.get(key)!.push(c.periodNumber);
  });

  let totalGaps = 0;
  sessionPeriods.forEach((periods) => {
    if (periods.length <= 1) return;
    const minP = Math.min(...periods);
    const maxP = Math.max(...periods);
    const pSet = new Set(periods);
    for (let p = minP; p <= maxP; p++) {
      if (!pSet.has(p)) {
        totalGaps++;
      }
    }
  });

  return totalGaps;
}

