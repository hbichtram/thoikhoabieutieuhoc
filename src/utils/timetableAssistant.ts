import {
  ScheduleCell,
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  DayOfWeek,
  PeriodShift,
  ConflictIssue,
  MissingPeriodItem,
} from '../types';
import {
  checkFullSchedule,
  validateSubjectShiftLimit,
  validateConsecutiveSubjectLimit,
  validateGvbmConstraints,
} from './conflictChecker';

export interface AssistantProposal {
  id: string;
  rank: number; // 1 = Best
  title: string;
  score: number; // 0 - 100
  targetDay: DayOfWeek;
  targetShift: PeriodShift;
  targetPeriodNumber: number;
  description: string;
  reasons: string[];
  actionType: 'add_cell' | 'move_cell' | 'swap_cells' | 'special_advice';
  cellToMoveId?: string;
  newCellPayload?: Partial<ScheduleCell>;
  swapCellPayload?: Partial<ScheduleCell>;
  beforeCount: { errors: number; warnings: number; missing: number };
  afterCount: { errors: number; warnings: number; missing: number };
  isOptimal: boolean;
}

export interface AssistantAnalysisResult {
  issueId: string;
  issueType: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  cause: string;
  relatedEntity: {
    teacher?: Teacher;
    classItem?: ClassItem;
    subject?: Subject;
    assignment?: Assignment;
  };
  contextDay?: DayOfWeek;
  contextShift?: PeriodShift;
  contextPeriod?: number;
  proposals: AssistantProposal[];
  isSpecialCase?: boolean;
  specialAdvice?: string;
}

const ALL_DAYS: DayOfWeek[] = ['T2', 'T3', 'T4', 'T5', 'T6'];

const DAY_NAMES: Record<DayOfWeek, string> = {
  T2: 'Thứ 2',
  T3: 'Thứ 3',
  T4: 'Thứ 4',
  T5: 'Thứ 5',
  T6: 'Thứ 6',
};

/**
 * Evaluates the safety and soft constraints of placing an assignment into a slot.
 * Returns score (0 - 100) and breakdown reasons.
 */
function evaluateSlotScore(
  assignment: Assignment,
  targetDay: DayOfWeek,
  targetShift: PeriodShift,
  targetPeriodNumber: number,
  currentCells: ScheduleCell[],
  teachers: Teacher[],
  classes: ClassItem[],
  subjects: Subject[],
  timeConfig: TimeConfig
): { score: number; reasons: string[]; isValidHard: boolean; hardViolation?: string } {
  const teacher = teachers.find((t) => t.id === assignment.teacherId);
  const classItem = classes.find((c) => c.id === assignment.classId);
  const subject = subjects.find((s) => s.id === assignment.subjectId);

  // 1. HARD CONSTRAINTS CHECK
  // A. Check dynamic school slot limits (Morning vs Afternoon from TimeConfig - NEVER hardcode!)
  const maxPeriod = targetShift === 'morning' ? timeConfig.morningPeriodsCount : timeConfig.afternoonPeriodsCount;
  if (targetPeriodNumber < 1 || targetPeriodNumber > maxPeriod) {
    return {
      score: 0,
      reasons: [],
      isValidHard: false,
      hardViolation: `Tiết ${targetPeriodNumber} vượt quá giới hạn ${targetShift === 'morning' ? 'sáng' : 'chiều'} (${maxPeriod} tiết)`,
    };
  }

  // B. School disabled slot
  const isSchoolDisabled = timeConfig.disabledSlots.some(
    (d) => d.day === targetDay && d.shift === targetShift && Number(d.periodNumber) === Number(targetPeriodNumber)
  );
  if (isSchoolDisabled) {
    return { score: 0, reasons: [], isValidHard: false, hardViolation: 'Trường đã tắt khung giờ này' };
  }

  // C. Teacher unavailable slot
  if (teacher) {
    const isTeacherUnavail = teacher.unavailableSlots.some(
      (u) => u.day === targetDay && u.shift === targetShift && Number(u.periodNumber) === Number(targetPeriodNumber)
    );
    if (isTeacherUnavail) {
      return { score: 0, reasons: [], isValidHard: false, hardViolation: `Giáo viên ${teacher.name} đã khóa khung giờ này` };
    }
  }

  // D. Class already occupied at this slot
  const classOccupied = currentCells.some(
    (c) => c.classId === assignment.classId && c.day === targetDay && c.shift === targetShift && Number(c.periodNumber) === Number(targetPeriodNumber)
  );
  if (classOccupied) {
    return { score: 0, reasons: [], isValidHard: false, hardViolation: `Lớp ${classItem?.name} đã có môn học khác tại tiết này` };
  }

  // E. Teacher already occupied at this slot
  if (teacher) {
    const teacherOccupied = currentCells.some(
      (c) => c.teacherId === teacher.id && c.day === targetDay && c.shift === targetShift && Number(c.periodNumber) === Number(targetPeriodNumber)
    );
    if (teacherOccupied) {
      return { score: 0, reasons: [], isValidHard: false, hardViolation: `Giáo viên ${teacher.name} đã có giờ dạy tại lớp khác` };
    }
  }

  // F. Simulate putting cell in currentCells to check domain constraints
  const simulatedCell: ScheduleCell = {
    id: `sim_${Date.now()}_${Math.random()}`,
    assignmentId: assignment.id,
    classId: assignment.classId,
    subjectId: assignment.subjectId,
    teacherId: assignment.teacherId || '',
    day: targetDay,
    shift: targetShift,
    periodNumber: targetPeriodNumber,
    isLocked: false,
  };

  const simulatedCells = [...currentCells, simulatedCell];

  // G. Subject Shift Limit (max 2 per shift)
  const shiftLimitCheck = validateSubjectShiftLimit(simulatedCells, subjects, assignment.classId);
  if (!shiftLimitCheck.valid) {
    return { score: 0, reasons: [], isValidHard: false, hardViolation: shiftLimitCheck.reason || 'Vượt quá 2 tiết môn trong buổi' };
  }

  // H. Consecutive Subject Limit (max 2 consecutive of same subject)
  const consecCheck = validateConsecutiveSubjectLimit(simulatedCells, subjects, assignment.classId);
  if (!consecCheck.valid) {
    return { score: 0, reasons: [], isValidHard: false, hardViolation: consecCheck.reason || 'Vượt quá 2 tiết liên tiếp cùng môn' };
  }

  // I. GVBM Constraints (Subject teachers: min 2 periods/shift, no gaps)
  if (teacher && teacher.type !== 'homeroom') {
    const gvbmCheck = validateGvbmConstraints(simulatedCells, teachers, teacher.id, targetDay, targetShift);
    if (!gvbmCheck.valid) {
      return { score: 0, reasons: [], isValidHard: false, hardViolation: gvbmCheck.reason || 'Vi phạm ràng buộc GVBM' };
    }
  }

  // 2. SOFT CONSTRAINTS SCORING (0 - 100)
  let score = 0;
  const reasons: string[] = [];

  // +30: Không có xung đột
  score += 30;
  reasons.push('✓ Không có bất kỳ xung đột lịch dạy hay thời khóa biểu');

  // +20: Giáo viên phù hợp & rảnh
  score += 20;
  reasons.push(`✓ Giáo viên ${teacher ? teacher.name : 'phụ trách'} hoàn toàn rảnh giờ`);

  // +20: Lớp phù hợp & phòng học trống
  score += 20;
  reasons.push(`✓ Lớp ${classItem ? classItem.name : ''} đang trống tiết`);

  // +15: Không tạo lỗi mới (kiểm tra phân bố ngày của giáo viên)
  let noNewIssues = true;
  if (teacher) {
    const teacherDayCount = simulatedCells.filter(
      (c) => c.teacherId === teacher.id && c.day === targetDay
    ).length;
    if (teacherDayCount > teacher.maxPeriodsPerDay) {
      noNewIssues = false;
    }
  }
  if (noNewIssues) {
    score += 15;
    reasons.push('✓ Không làm giáo viên vượt định mức tiết tối đa trong ngày');
  } else {
    score += 5;
    reasons.push('⚠️ Lưu ý: Có thể làm giáo viên chạm ngưỡng định mức ngày');
  }

  // +10: Phân bố môn học hợp lý (tránh tập trung nhiều tiết môn trong ngày)
  const classSubjectDayCount = currentCells.filter(
    (c) => c.classId === assignment.classId && c.day === targetDay && c.subjectId === assignment.subjectId
  ).length;

  if (classSubjectDayCount === 0) {
    score += 10;
    reasons.push(`✓ Giúp phân bố môn ${subject?.name || ''} trải đều sang ${DAY_NAMES[targetDay]}`);
  } else if (classSubjectDayCount === 1) {
    score += 6;
    reasons.push(`✓ Môn ${subject?.name || ''} có tiết thứ 2 trong ngày (hợp lệ)`);
  } else {
    score += 1;
    reasons.push(`⚠️ Môn ${subject?.name || ''} đã có trong ngày`);
  }

  // +5: Tiết đầu buổi học sinh tiếp thu tốt
  if (targetPeriodNumber <= 3) {
    score += 5;
    reasons.push('✓ Vị trí tiết học đầu buổi học sinh tiếp thu tốt');
  } else {
    score += 3;
  }

  return {
    score: Math.min(100, score),
    reasons,
    isValidHard: true,
  };
}

/**
 * Analyzes an issue and generates smart, ranked, verified solution proposals.
 */
export function analyzeIssueAndFindProposals(
  issue: ConflictIssue | MissingPeriodItem | { id: string; type?: string; message?: string; [key: string]: any },
  currentCells: ScheduleCell[],
  teachers: Teacher[],
  classes: ClassItem[],
  subjects: Subject[],
  assignments: Assignment[],
  timeConfig: TimeConfig
): AssistantAnalysisResult {
  const currentStats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, currentCells);
  const beforeCount = {
    errors: currentStats.criticalErrorCount,
    warnings: currentStats.warningCount,
    missing: currentStats.missingCount || 0,
  };

  const isMissingIssue = 'missing' in issue;
  const issueType = 'type' in issue && issue.type ? issue.type : (isMissingIssue ? 'missing_periods' : 'unknown');

  // Case A: Missing Periods (Thiếu tiết phân công môn học)
  if (isMissingIssue) {
    const classId = issue.classId;
    const subjectId = issue.subjectId;
    const teacherId = issue.teacherId;

    const matchedClass = classes.find((c) => c.id === classId);
    const matchedSubject = subjects.find((s) => s.id === subjectId);
    const matchedTeacher = teachers.find((t) => t.id === teacherId);
    const matchedAssignment = assignments.find(
      (a) => a.classId === classId && a.subjectId === subjectId && (a.teacherId === teacherId || !teacherId)
    );

    if (!matchedAssignment) {
      return {
        issueId: issue.id,
        issueType: 'missing_periods',
        severity: 'critical',
        title: `Thiếu tiết phân công môn học`,
        cause: `Chưa tìm thấy bản ghi Phân công chuyên môn tương ứng cho Lớp ${matchedClass?.name} - Môn ${matchedSubject?.name}.`,
        relatedEntity: { classItem: matchedClass, subject: matchedSubject, teacher: matchedTeacher },
        proposals: [],
        isSpecialCase: true,
        specialAdvice: 'Vui lòng kiểm tra lại bảng Phân công chuyên môn để hoàn tất phân công giáo viên trước khi xếp tiết.',
      };
    }

    // Scan all valid open slots
    interface CandidateSlot {
      day: DayOfWeek;
      shift: PeriodShift;
      periodNumber: number;
      score: number;
      reasons: string[];
    }

    const candidateSlots: CandidateSlot[] = [];

    ALL_DAYS.forEach((day) => {
      // Morning
      for (let p = 1; p <= timeConfig.morningPeriodsCount; p++) {
        const evalRes = evaluateSlotScore(matchedAssignment, day, 'morning', p, currentCells, teachers, classes, subjects, timeConfig);
        if (evalRes.isValidHard) {
          candidateSlots.push({
            day,
            shift: 'morning',
            periodNumber: p,
            score: evalRes.score,
            reasons: evalRes.reasons,
          });
        }
      }
      // Afternoon
      for (let p = 1; p <= timeConfig.afternoonPeriodsCount; p++) {
        const evalRes = evaluateSlotScore(matchedAssignment, day, 'afternoon', p, currentCells, teachers, classes, subjects, timeConfig);
        if (evalRes.isValidHard) {
          candidateSlots.push({
            day,
            shift: 'afternoon',
            periodNumber: p,
            score: evalRes.score,
            reasons: evalRes.reasons,
          });
        }
      }
    });

    // Sort descending by score
    candidateSlots.sort((a, b) => b.score - a.score);

    // Pick top 5 proposals
    const topCandidates = candidateSlots.slice(0, 5);

    const proposals: AssistantProposal[] = topCandidates.map((slot, index) => {
      const newCell: ScheduleCell = {
        id: `cell_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        assignmentId: matchedAssignment.id,
        classId: matchedAssignment.classId,
        subjectId: matchedAssignment.subjectId,
        teacherId: matchedAssignment.teacherId || '',
        day: slot.day,
        shift: slot.shift,
        periodNumber: slot.periodNumber,
        isLocked: false,
      };

      // Simulate after-stats
      const simCells = [...currentCells, newCell];
      const afterStats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, simCells);

      const dayText = DAY_NAMES[slot.day];
      const shiftText = slot.shift === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều';

      return {
        id: `prop_add_${slot.day}_${slot.shift}_${slot.periodNumber}`,
        rank: index + 1,
        title: `${dayText} - ${shiftText} Tiết ${slot.periodNumber}`,
        score: slot.score,
        targetDay: slot.day,
        targetShift: slot.shift,
        targetPeriodNumber: slot.periodNumber,
        description: `Xếp 1 tiết môn "${matchedSubject?.name || 'Môn học'}" của Lớp ${matchedClass?.name || ''} vào ${dayText} - ${shiftText} Tiết ${slot.periodNumber} (${matchedTeacher ? matchedTeacher.name : 'Chưa có GV'}).`,
        reasons: slot.reasons,
        actionType: 'add_cell',
        newCellPayload: newCell,
        beforeCount,
        afterCount: {
          errors: afterStats.criticalErrorCount,
          warnings: afterStats.warningCount,
          missing: afterStats.missingCount || 0,
        },
        isOptimal: index === 0,
      };
    });

    return {
      issueId: issue.id,
      issueType: 'missing_periods',
      severity: 'critical',
      title: `Thiếu ${('missing' in issue ? issue.missing : 1)} tiết môn ${matchedSubject?.name || ''} (Lớp ${matchedClass?.name || ''})`,
      cause: `Lớp ${matchedClass?.name || ''} môn ${matchedSubject?.name || ''} được phân công ${matchedAssignment.periodsPerWeek} tiết/tuần nhưng hiện mới xếp được ${currentStats.assignedPeriods || 0} tiết.`,
      relatedEntity: {
        classItem: matchedClass,
        subject: matchedSubject,
        teacher: matchedTeacher,
        assignment: matchedAssignment,
      },
      proposals,
    };
  }

  // Case B: Teacher Overlap (Trùng tiết giáo viên)
  if (issueType === 'teacher_overlap') {
    const teacherId = issue.teacherId;
    const day = issue.day as DayOfWeek;
    const shift = issue.shift as PeriodShift;
    const periodNumber = issue.periodNumber as number;

    const matchedTeacher = teachers.find((t) => t.id === teacherId);
    const conflictingCells = currentCells.filter(
      (c) => c.teacherId === teacherId && c.day === day && c.shift === shift && Number(c.periodNumber) === Number(periodNumber)
    );

    const proposals: AssistantProposal[] = [];

    // For each conflicting cell, find alternative open slots
    conflictingCells.forEach((confCell) => {
      const cls = classes.find((c) => c.id === confCell.classId);
      const sub = subjects.find((s) => s.id === confCell.subjectId);
      const asg = assignments.find((a) => a.id === confCell.assignmentId) || {
        id: confCell.assignmentId,
        classId: confCell.classId,
        subjectId: confCell.subjectId,
        teacherId: confCell.teacherId,
        periodsPerWeek: 1,
      };

      ALL_DAYS.forEach((candDay) => {
        const maxP = shift === 'morning' ? timeConfig.morningPeriodsCount : timeConfig.afternoonPeriodsCount;
        for (let p = 1; p <= maxP; p++) {
          if (candDay === day && p === periodNumber) continue;

          // Exclude the cell being moved from simulation
          const remainingCells = currentCells.filter((c) => c.id !== confCell.id);
          const evalRes = evaluateSlotScore(asg, candDay, shift, p, remainingCells, teachers, classes, subjects, timeConfig);

          if (evalRes.isValidHard) {
            const movedCell: ScheduleCell = {
              ...confCell,
              day: candDay,
              shift,
              periodNumber: p,
            };
            const simCells = [...remainingCells, movedCell];
            const afterStats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, simCells);

            proposals.push({
              id: `prop_move_overlap_${confCell.id}_${candDay}_${p}`,
              rank: 0,
              title: `Di chuyển tiết lớp ${cls?.name || ''} sang ${DAY_NAMES[candDay]} - Tiết ${p}`,
              score: evalRes.score,
              targetDay: candDay,
              targetShift: shift,
              targetPeriodNumber: p,
              description: `Dời tiết môn ${sub?.name || ''} của Lớp ${cls?.name || ''} từ ${DAY_NAMES[day]} Tiết ${periodNumber} sang ${DAY_NAMES[candDay]} Tiết ${p} để giải phóng trùng lịch.`,
              reasons: evalRes.reasons,
              actionType: 'move_cell',
              cellToMoveId: confCell.id,
              newCellPayload: movedCell,
              beforeCount,
              afterCount: {
                errors: afterStats.criticalErrorCount,
                warnings: afterStats.warningCount,
                missing: afterStats.missingCount || 0,
              },
              isOptimal: false,
            });
          }
        }
      });
    });

    proposals.sort((a, b) => b.score - a.score);
    const topProposals = proposals.slice(0, 5).map((p, idx) => ({
      ...p,
      rank: idx + 1,
      isOptimal: idx === 0,
    }));

    return {
      issueId: issue.id,
      issueType: 'teacher_overlap',
      severity: 'critical',
      title: `Trùng tiết Giáo viên ${matchedTeacher?.name || ''}`,
      cause: `Giáo viên ${matchedTeacher?.name || ''} đang bị xếp cùng lúc ở nhiều lớp vào ${DAY_NAMES[day] || day} (Tiết ${periodNumber}).`,
      relatedEntity: { teacher: matchedTeacher },
      contextDay: day,
      contextShift: shift,
      contextPeriod: periodNumber,
      proposals: topProposals,
    };
  }

  // Case C: Class Overlap (Trùng tiết trong cùng một lớp)
  if (issueType === 'class_overlap') {
    const classId = issue.classId;
    const day = issue.day as DayOfWeek;
    const shift = issue.shift as PeriodShift;
    const periodNumber = issue.periodNumber as number;

    const matchedClass = classes.find((c) => c.id === classId);
    const conflictingCells = currentCells.filter(
      (c) => c.classId === classId && c.day === day && c.shift === shift && Number(c.periodNumber) === Number(periodNumber)
    );

    const proposals: AssistantProposal[] = [];

    conflictingCells.forEach((confCell) => {
      const sub = subjects.find((s) => s.id === confCell.subjectId);
      const tch = teachers.find((t) => t.id === confCell.teacherId);
      const asg = assignments.find((a) => a.id === confCell.assignmentId) || {
        id: confCell.assignmentId,
        classId: confCell.classId,
        subjectId: confCell.subjectId,
        teacherId: confCell.teacherId,
        periodsPerWeek: 1,
      };

      ALL_DAYS.forEach((candDay) => {
        const maxP = shift === 'morning' ? timeConfig.morningPeriodsCount : timeConfig.afternoonPeriodsCount;
        for (let p = 1; p <= maxP; p++) {
          if (candDay === day && p === periodNumber) continue;

          const remainingCells = currentCells.filter((c) => c.id !== confCell.id);
          const evalRes = evaluateSlotScore(asg, candDay, shift, p, remainingCells, teachers, classes, subjects, timeConfig);

          if (evalRes.isValidHard) {
            const movedCell: ScheduleCell = {
              ...confCell,
              day: candDay,
              shift,
              periodNumber: p,
            };
            const simCells = [...remainingCells, movedCell];
            const afterStats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, simCells);

            proposals.push({
              id: `prop_move_class_overlap_${confCell.id}_${candDay}_${p}`,
              rank: 0,
              title: `Dời môn ${sub?.name || ''} sang ${DAY_NAMES[candDay]} - Tiết ${p}`,
              score: evalRes.score,
              targetDay: candDay,
              targetShift: shift,
              targetPeriodNumber: p,
              description: `Dời tiết môn ${sub?.name || ''} (GV ${tch?.name || ''}) sang ${DAY_NAMES[candDay]} Tiết ${p} để lớp không bị học 2 môn cùng lúc.`,
              reasons: evalRes.reasons,
              actionType: 'move_cell',
              cellToMoveId: confCell.id,
              newCellPayload: movedCell,
              beforeCount,
              afterCount: {
                errors: afterStats.criticalErrorCount,
                warnings: afterStats.warningCount,
                missing: afterStats.missingCount || 0,
              },
              isOptimal: false,
            });
          }
        }
      });
    });

    proposals.sort((a, b) => b.score - a.score);
    const topProposals = proposals.slice(0, 5).map((p, idx) => ({
      ...p,
      rank: idx + 1,
      isOptimal: idx === 0,
    }));

    return {
      issueId: issue.id,
      issueType: 'class_overlap',
      severity: 'critical',
      title: `Trùng môn học tại Lớp ${matchedClass?.name || ''}`,
      cause: `Lớp ${matchedClass?.name || ''} đang có 2 môn học được xếp vào cùng một thời điểm (${DAY_NAMES[day] || day} Tiết ${periodNumber}).`,
      relatedEntity: { classItem: matchedClass },
      contextDay: day,
      contextShift: shift,
      contextPeriod: periodNumber,
      proposals: topProposals,
    };
  }

  // Case D: Subject Clustering (Môn học phân bố chưa hợp lý)
  if (issueType === 'subject_clustering') {
    const classId = issue.classId;
    const subjectId = issue.subjectId;
    const day = issue.day as DayOfWeek;

    const matchedClass = classes.find((c) => c.id === classId);
    const matchedSubject = subjects.find((s) => s.id === subjectId);

    const clusteredCells = currentCells.filter(
      (c) => c.classId === classId && c.subjectId === subjectId && c.day === day
    );

    const proposals: AssistantProposal[] = [];

    // Find cells that can be moved to other days with 0 periods of this subject
    clusteredCells.forEach((cell) => {
      const asg = assignments.find((a) => a.id === cell.assignmentId) || {
        id: cell.assignmentId,
        classId: cell.classId,
        subjectId: cell.subjectId,
        teacherId: cell.teacherId,
        periodsPerWeek: 1,
      };

      ALL_DAYS.forEach((targetDay) => {
        if (targetDay === day) return;

        const maxP = cell.shift === 'morning' ? timeConfig.morningPeriodsCount : timeConfig.afternoonPeriodsCount;
        for (let p = 1; p <= maxP; p++) {
          const remainingCells = currentCells.filter((c) => c.id !== cell.id);
          const evalRes = evaluateSlotScore(asg, targetDay, cell.shift, p, remainingCells, teachers, classes, subjects, timeConfig);

          if (evalRes.isValidHard) {
            const movedCell: ScheduleCell = {
              ...cell,
              day: targetDay,
              periodNumber: p,
            };
            const simCells = [...remainingCells, movedCell];
            const afterStats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, simCells);

            proposals.push({
              id: `prop_cluster_${cell.id}_${targetDay}_${p}`,
              rank: 0,
              title: `Dời sang ${DAY_NAMES[targetDay]} - Tiết ${p}`,
              score: evalRes.score + 5,
              targetDay,
              targetShift: cell.shift,
              targetPeriodNumber: p,
              description: `Chuyển bớt 1 tiết môn "${matchedSubject?.name || ''}" sang ${DAY_NAMES[targetDay]} giúp học sinh tiếp thu đều đặn.`,
              reasons: evalRes.reasons,
              actionType: 'move_cell',
              cellToMoveId: cell.id,
              newCellPayload: movedCell,
              beforeCount,
              afterCount: {
                errors: afterStats.criticalErrorCount,
                warnings: afterStats.warningCount,
                missing: afterStats.missingCount || 0,
              },
              isOptimal: false,
            });
          }
        }
      });
    });

    proposals.sort((a, b) => b.score - a.score);
    const topProposals = proposals.slice(0, 5).map((p, idx) => ({
      ...p,
      rank: idx + 1,
      isOptimal: idx === 0,
    }));

    return {
      issueId: issue.id,
      issueType: 'subject_clustering',
      severity: issue.severity || 'warning',
      title: `Phân bố môn ${matchedSubject?.name || ''} (Lớp ${matchedClass?.name || ''})`,
      cause: issue.message || `Môn ${matchedSubject?.name || ''} đang bị dồn nhiều tiết trong một ngày.`,
      relatedEntity: { classItem: matchedClass, subject: matchedSubject },
      contextDay: day,
      proposals: topProposals,
    };
  }

  // Case E: Teacher Max Periods / Workload Issue
  if (issueType === 'teacher_max_periods') {
    const teacherId = issue.teacherId;
    const matchedTeacher = teachers.find((t) => t.id === teacherId);

    return {
      issueId: issue.id,
      issueType: 'teacher_max_periods',
      severity: 'warning',
      title: `Định mức tiết dạy: ${matchedTeacher?.name || 'Giáo viên'}`,
      cause: issue.message || `Giáo viên vượt quá số tiết tối đa trong ngày/tuần quy định.`,
      relatedEntity: { teacher: matchedTeacher },
      proposals: [],
      isSpecialCase: true,
      specialAdvice:
        'Đây là vấn đề định mức phân công chuyên môn hoặc số tiết giới hạn của giáo viên, không phải lỗi xung đột vị trí ô TKB. Bạn có thể điều chỉnh lại định mức tối đa của giáo viên trong phần Danh mục Giáo viên hoặc điều chỉnh phân công chuyên môn.',
    };
  }

  // Default Fallback
  return {
    issueId: issue.id,
    issueType: issueType,
    severity: (issue.severity as any) || 'warning',
    title: issue.message || 'Vấn đề Thời khóa biểu',
    cause: issue.message || 'Cần kiểm tra và điều chỉnh các vị trí xếp tiết phù hợp.',
    relatedEntity: {},
    proposals: [],
    isSpecialCase: true,
    specialAdvice: 'Vui lòng kiểm tra trực quan ô thời khóa biểu liên quan để sắp xếp lại vị trí thích hợp.',
  };
}
