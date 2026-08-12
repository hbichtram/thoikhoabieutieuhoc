import { ScheduleCell, Assignment, PeriodShift } from '../types';

/**
 * Normalizes a single ScheduleCell entry to ensure consistent data format across all views.
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
