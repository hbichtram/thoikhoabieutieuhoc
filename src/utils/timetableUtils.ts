import { ScheduleCell, Assignment, PeriodShift, Teacher, ConflictIssue, DayOfWeek } from '../types';

/**
 * Normalizes a single ScheduleCell entry to ensure consistent data format across all views.
 * Morning: periodNumber strictly 1..4
 * Afternoon: periodNumber strictly 1..3
 */
export function normalizeScheduleCell(cell: ScheduleCell, assignments?: Assignment[]): ScheduleCell {
  if (!cell) return cell;

  let shift: PeriodShift = cell.shift || 'morning';
  let periodNumber: number = Number(cell.periodNumber) || 1;

  // Normalize legacy afternoon period numbers (5, 6, 7 -> 1, 2, 3)
  if (shift === 'afternoon' && periodNumber >= 5) {
    periodNumber = periodNumber - 4;
  } else if (periodNumber >= 5) {
    shift = 'afternoon';
    periodNumber = periodNumber - 4;
  }

  // Enforce strict period bounds per shift
  if (shift === 'afternoon') {
    periodNumber = Math.min(3, Math.max(1, periodNumber));
  } else {
    periodNumber = Math.min(4, Math.max(1, periodNumber));
  }

  let assignmentId = cell.assignmentId || '';

  // Fallback to match assignment by IDs if assignmentId is missing
  if (!assignmentId && assignments && assignments.length > 0) {
    const matchedAss = assignments.find(
      (a) =>
        String(a.classId).trim() === String(cell.classId).trim() &&
        String(a.subjectId).trim() === String(cell.subjectId).trim() &&
        String(a.teacherId).trim() === String(cell.teacherId).trim()
    );
    if (matchedAss) {
      assignmentId = matchedAss.id;
    }
  }

  return {
    ...cell,
    id: cell.id || `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    classId: String(cell.classId || '').trim(),
    teacherId: String(cell.teacherId || '').trim(),
    subjectId: String(cell.subjectId || '').trim(),
    assignmentId: String(assignmentId || '').trim(),
    day: cell.day,
    shift,
    periodNumber,
    isLocked: Boolean(cell.isLocked),
  };
}

/**
 * Normalizes an array of ScheduleCell objects.
 */
export function normalizeScheduleCells(cells: ScheduleCell[], assignments?: Assignment[]): ScheduleCell[] {
  if (!Array.isArray(cells)) return [];
  return cells.map((c) => normalizeScheduleCell(c, assignments));
}

/**
 * Normalizes and deduplicates ScheduleCells to prevent duplicate entries from corrupting calculations.
 * Primary Key: day + shift + periodNumber + assignmentId
 * Fallback Key: day + shift + periodNumber + classId + subjectId + teacherId
 */
export function deduplicateScheduleCells(cells: ScheduleCell[], assignments?: Assignment[]): ScheduleCell[] {
  if (!Array.isArray(cells)) return [];
  const normalized = normalizeScheduleCells(cells, assignments);
  const seen = new Set<string>();
  const result: ScheduleCell[] = [];

  for (const cell of normalized) {
    if (!cell) continue;
    const assId = String(cell.assignmentId || '').trim();
    const key = assId
      ? `${cell.day}_${cell.shift}_${cell.periodNumber}_${cell.classId}_${assId}`
      : `${cell.day}_${cell.shift}_${cell.periodNumber}_${cell.classId}_${cell.subjectId}_${cell.teacherId}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(cell);
    }
  }

  return result;
}

/**
 * Calculates consecutive period warnings for teachers.
 * Morning: max periods is 4 (Tiết 1..4). If teacher teaches all 4 periods continuously -> Warn!
 * Afternoon: max periods is 3 (Tiết 1..3). Dạy cả 3 tiết chiều = HỢP LỆ (0 warning).
 * Only warns if streak >= 4.
 */
export function getTeacherConsecutiveWarnings(
  cells: ScheduleCell[],
  teachers: Teacher[],
  assignments?: Assignment[]
): ConflictIssue[] {
  const cleanCells = deduplicateScheduleCells(cells, assignments);
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const warnings: ConflictIssue[] = [];

  // Group unique period numbers by teacherId_day_shift
  const teacherShiftSlots = new Map<string, Set<number>>();

  cleanCells.forEach((c) => {
    if (!c.teacherId) return;
    const key = `${c.teacherId}_${c.day}_${c.shift}`;
    if (!teacherShiftSlots.has(key)) {
      teacherShiftSlots.set(key, new Set<number>());
    }
    teacherShiftSlots.get(key)!.add(c.periodNumber);
  });

  const dayLabels: Record<string, string> = {
    T2: 'Thứ 2',
    T3: 'Thứ 3',
    T4: 'Thứ 4',
    T5: 'Thứ 5',
    T6: 'Thứ 6',
  };

  teacherShiftSlots.forEach((periodSet, key) => {
    const [teacherId, day, shift] = key.split('_') as [string, DayOfWeek, PeriodShift];
    const sorted = Array.from(periodSet).sort((a, b) => a - b);
    let streak = 1;
    let maxStreak = sorted.length > 0 ? 1 : 0;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }

    // Morning has 4 periods. Streak >= 4 means 4 continuous morning periods -> Warning.
    // Afternoon has 3 periods (1, 2, 3). Max streak in afternoon is 3 -> 100% VALID.
    // Streak >= 4 will NEVER trigger for afternoon 3 periods.
    if (maxStreak >= 4) {
      const tch = teacherMap.get(teacherId);
      const shiftLabel = shift === 'morning' ? 'Sáng' : 'Chiều';
      const dayText = dayLabels[day] || day;
      warnings.push({
        id: `consec_${key}`,
        type: 'consecutive_periods',
        severity: 'warning',
        message: `${tch?.name || 'Giáo viên'} có ${maxStreak} tiết dạy liên tiếp vào ${dayText} (${shiftLabel}).`,
        teacherId,
        day,
        shift,
      });
    }
  });

  return warnings;
}

/**
 * Determines whether a ScheduleCell belongs to a specific Assignment.
 * Uses assignmentId primary match with fallback to triple (classId, subjectId, teacherId).
 * NEVER compares names (className, teacherName, subjectName).
 */
export function isCellForAssignment(cell: ScheduleCell, assignment: Assignment): boolean {
  if (!cell || !assignment) return false;

  const cellAssignmentId = String(cell.assignmentId || '').trim();
  const assignmentId = String(assignment.id || '').trim();

  // 1. Primary match by assignmentId
  if (cellAssignmentId && assignmentId && cellAssignmentId === assignmentId) {
    return true;
  }

  // 2. Fallback match by (classId, subjectId, teacherId)
  return (
    String(cell.classId || '').trim() === String(assignment.classId || '').trim() &&
    String(cell.subjectId || '').trim() === String(assignment.subjectId || '').trim() &&
    String(cell.teacherId || '').trim() === String(assignment.teacherId || '').trim()
  );
}

/**
 * Counts placed periods for an assignment.
 */
export function countPlacedPeriodsForAssignment(cells: ScheduleCell[], assignment: Assignment): number {
  if (!Array.isArray(cells) || !assignment) return 0;
  return cells.filter((c) => isCellForAssignment(c, assignment)).length;
}
