import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Save,
  RotateCw,
  Undo2,
  Redo2,
  ShieldAlert,
  Users,
  GraduationCap,
} from 'lucide-react';
import {
  ScheduleCell,
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  DayOfWeek,
  PeriodShift,
  SuggestionSlot,
  MissingPeriodItem,
  ConflictIssue,
} from '../../types';
import { getSlotSuggestions, checkFullSchedule, validateConsecutiveSubjectLimit, validateSubjectShiftLimit, validateGvbmConstraints } from '../../utils/conflictChecker';
import { getStoredLastSavedAt, setStoredLastSavedAt } from '../../services/storage';
import { runAutoScheduler, AutoScheduleResult } from '../../utils/autoScheduler';
import {
  getTeacherSessionCount,
  getTeacherMaxSessionsPerWeek,
} from '../../utils/teacherUtils';
import { normalizeScheduleCells, isCellForAssignment, countPlacedPeriodsForAssignment } from '../../utils/timetableUtils';

interface TimetableDesignViewProps {
  cells: ScheduleCell[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
  timeConfig: TimeConfig;
  onUpdateCells: (newCells: ScheduleCell[]) => void;
  onHasUnsavedChangesChange?: (hasUnsaved: boolean) => void;
}

export const TimetableDesignView: React.FC<TimetableDesignViewProps> = ({
  cells,
  teachers,
  classes,
  subjects,
  assignments,
  timeConfig,
  onUpdateCells,
  onHasUnsavedChangesChange,
}) => {
  // Working schedule state vs last saved schedule state with normalization
  const [savedCells, setSavedCells] = useState<ScheduleCell[]>(() => normalizeScheduleCells(cells, assignments));
  const [workingCells, setWorkingCells] = useState<ScheduleCell[]>(() => normalizeScheduleCells(cells, assignments));

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ScheduleCell[][]>(() => [normalizeScheduleCells(cells, assignments)]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Last saved timestamp
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(getStoredLastSavedAt());

  // Modal & Toast States
  const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [validationCategory, setValidationCategory] = useState<'empty' | 'missing' | 'conflict'>('conflict');
  const [validationMissingItems, setValidationMissingItems] = useState<MissingPeriodItem[]>([]);
  const [validationConflicts, setValidationConflicts] = useState<ConflictIssue[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isReshuffleModalOpen, setIsReshuffleModalOpen] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [autoScheduleStepText, setAutoScheduleStepText] = useState('');
  const [autoScheduleResult, setAutoScheduleResult] = useState<AutoScheduleResult | null>(null);

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [infoToast, setInfoToast] = useState<string | null>(null);

  // View mode: 'class' | 'teacher'
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');

  // Selected class or teacher
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');

  // Active Assignment for position suggestion
  const [suggestingAssignment, setSuggestingAssignment] = useState<Assignment | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionSlot[]>([]);

  // Dragged assignment or cell state
  const [draggedItem, setDraggedItem] = useState<{
    type: 'unassigned' | 'cell';
    assignmentId: string;
    sourceCellId?: string;
  } | null>(null);

  const [hoveredSlot, setHoveredSlot] = useState<{
    day: DayOfWeek;
    shift: PeriodShift;
    periodNumber: number;
  } | null>(null);

  // Keep savedCells & workingCells in sync if external props `cells` change initially or after load
  useEffect(() => {
    const normalized = normalizeScheduleCells(cells, assignments);
    if (JSON.stringify(normalized) !== JSON.stringify(savedCells) && historyIndex === 0) {
      setSavedCells(normalized);
      setWorkingCells(normalized);
      setHistory([normalized]);
      setHistoryIndex(0);
    }
  }, [cells, assignments]);

  // Compute if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(workingCells) !== JSON.stringify(savedCells);

  // Notify parent component of unsaved status & register window beforeunload warning
  useEffect(() => {
    onHasUnsavedChangesChange?.(hasUnsavedChanges);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '⚠️ Bạn có thay đổi TKB chưa được lưu. Bạn có muốn rời khỏi trang không?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, onHasUnsavedChangesChange]);

  // Helper to mutate working cells with history tracking and real-time App state sync
  const updateGridCells = (newCells: ScheduleCell[]) => {
    const normalized = normalizeScheduleCells(newCells, assignments);
    console.log(`[TKB DESIGN] scheduleEntries.length: ${normalized.length}`);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(normalized);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setWorkingCells(normalized);
    onUpdateCells(normalized);
  };

  // Undo Handler
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setWorkingCells(history[prevIdx]);
    }
  };

  // Redo Handler
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setWorkingCells(history[nextIdx]);
    }
  };

  // Reshuffle Handler (Clears unlocked cells to allow re-arranging)
  const handleReshuffleConfirm = () => {
    const keptCells = workingCells.filter((c) => c.isLocked);
    updateGridCells(keptCells);
    setIsReshuffleModalOpen(false);
    setInfoToast('Đã mở lại các tiết chưa khóa để xếp lại!');
    setTimeout(() => setInfoToast(null), 3000);
  };

  // Auto Schedule Handler
  const handleRunAutoSchedule = () => {
    setIsAutoScheduling(true);
    setAutoScheduleStepText('Đang phân tích ràng buộc...');

    setTimeout(() => {
      setAutoScheduleStepText('Đang tối ưu thời khóa biểu...');

      setTimeout(() => {
        const result = runAutoScheduler(
          teachers,
          classes,
          subjects,
          assignments,
          timeConfig,
          workingCells,
          true
        );
        updateGridCells(result.newCells);
        setAutoScheduleResult(result);
        setIsAutoScheduling(false);
      }, 300);
    }, 300);
  };

  // Check Full TKB Rules Handler
  const handleCheckTkb = () => {
    const stats = checkFullSchedule(
      teachers,
      classes,
      subjects,
      assignments,
      timeConfig,
      workingCells
    );

    if (workingCells.length === 0) {
      setValidationCategory('empty');
      setValidationErrors([
        'Thời khóa biểu hiện tại chưa có tiết học nào được xếp.'
      ]);
      setValidationMissingItems([]);
      setValidationConflicts([]);
      setIsErrorModalOpen(true);
      return;
    }

    const hardConflicts = stats.conflicts || [];
    const missingItems = stats.missingPeriods || [];
    const warningItems = stats.warnings || [];

    if (hardConflicts.length === 0 && missingItems.length === 0 && warningItems.length === 0) {
      setSuccessToast('🟢 TKB HOÀN HẢO! Tất cả các tiết đã được xếp đủ và không phát sinh bất kỳ xung đột nào.');
      setTimeout(() => setSuccessToast(null), 5000);
      return;
    }

    if (hardConflicts.length > 0) {
      setValidationCategory('conflict');
      setValidationConflicts(hardConflicts);
      setValidationMissingItems(missingItems);
      setValidationErrors(hardConflicts.map((c) => c.message));
      setIsErrorModalOpen(true);
      return;
    }

    if (missingItems.length > 0) {
      setValidationCategory('missing');
      setValidationMissingItems(missingItems);
      setValidationConflicts([]);
      setValidationErrors(missingItems.map((m) => m.message));
      setIsErrorModalOpen(true);
      return;
    }

    if (warningItems.length > 0) {
      setValidationCategory('conflict');
      setValidationConflicts(warningItems);
      setValidationMissingItems([]);
      setValidationErrors(warningItems.map((w) => `🟠 ${w.message}`));
      setIsErrorModalOpen(true);
    }
  };

  const days: DayOfWeek[] = timeConfig.enabledDays;

  // Selected current entity
  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // Determine GVCN vs GVBM status
  const isClassView = viewMode === 'class';

  // In Class view, find the homeroom teacher of this class
  const classHomeroomTeacher = isClassView && currentClass
    ? teachers.find((t) => t.id === currentClass.homeroomTeacherId || t.homeroomClassId === currentClass.id)
    : null;

  // In Teacher view, check if selected teacher is a GVCN
  const isHomeroomTeacher = !isClassView && currentTeacher && (
    currentTeacher.type === 'homeroom' ||
    Boolean(classes.find((c) => c.homeroomTeacherId === currentTeacher.id || c.id === currentTeacher.homeroomClassId))
  );

  const teacherHomeroomClass = isHomeroomTeacher && currentTeacher
    ? classes.find((c) => c.homeroomTeacherId === currentTeacher.id || c.id === currentTeacher.homeroomClassId)
    : null;

  // Relevant assignments for current entity
  const currentEntityAssignments = assignments.filter((a) => {
    if (viewMode === 'class') return a.classId === selectedClassId;
    return a.teacherId === selectedTeacherId;
  });

  // Calculate unassigned periods for each assignment of current entity using workingCells
  const unassignedTrayItems = currentEntityAssignments.map((a) => {
    const placedCount = countPlacedPeriodsForAssignment(workingCells, a);
    const remainingCount = a.periodsPerWeek - placedCount;
    return {
      assignment: a,
      placedCount,
      remainingCount,
      teacher: teachers.find((t) => t.id === a.teacherId),
      cls: classes.find((c) => c.id === a.classId),
      subject: subjects.find((s) => s.id === a.subjectId),
    };
  });

  const totalUnassignedCount = unassignedTrayItems.reduce((acc, item) => acc + Math.max(0, item.remainingCount), 0);

  // Handle slot suggestion toggle
  const handleToggleSuggestion = (a: Assignment) => {
    if (suggestingAssignment?.id === a.id) {
      setSuggestingAssignment(null);
      setSuggestions([]);
    } else {
      setSuggestingAssignment(a);
      const suggs = getSlotSuggestions(a, teachers, classes, subjects, timeConfig, workingCells);
      setSuggestions(suggs);
    }
  };

  // Lock / Unlock Cell
  const handleToggleLockCell = (cellId: string) => {
    const updated = workingCells.map((c) =>
      c.id === cellId ? { ...c, isLocked: !c.isLocked } : c
    );
    updateGridCells(updated);
  };

  // Delete Cell
  const handleDeleteCell = (cellId: string) => {
    const updated = workingCells.filter((c) => c.id !== cellId);
    updateGridCells(updated);
  };

  // Place Assignment into Slot (or Move Cell) - STRICTLY 1 PERIOD PER DROP
  const placeAssignmentIntoSlot = (
    assignmentId: string,
    targetDay: DayOfWeek,
    targetShift: PeriodShift,
    targetPeriodNumber: number,
    sourceCellId?: string
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Check if target slot already has a cell in current view mode
    const existingCell = workingCells.find((c) => {
      if (c.day !== targetDay) return false;
      if (c.shift !== targetShift) return false;
      if (c.periodNumber !== targetPeriodNumber) return false;
      return viewMode === 'class'
        ? c.classId === selectedClassId
        : c.teacherId === selectedTeacherId;
    });

    if (existingCell) {
      if (existingCell.isLocked) {
        alert('🔒 Không thể đè lên ô đã bị khóa!');
      } else {
        alert('🔴 Ô này đã có tiết. Vui lòng chọn ô trống.');
      }
      return;
    }

    // Rule 1: Dragging from unassigned tray (new placement) -> STRICTLY 1 PERIOD
    if (!sourceCellId) {
      const placedCount = countPlacedPeriodsForAssignment(workingCells, assignment);
      if (placedCount >= assignment.periodsPerWeek) {
        alert('⚠️ Môn học này đã xếp đủ số tiết theo quy định!');
        return;
      }

      const newCell: ScheduleCell = {
        id: `sc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        classId: assignment.classId,
        day: targetDay,
        shift: targetShift,
        periodNumber: targetPeriodNumber,
        assignmentId: assignment.id,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        isLocked: false,
      };

      const proposedCells = [...workingCells, newCell];
      const consecVal = validateConsecutiveSubjectLimit(
        proposedCells,
        subjects,
        assignment.classId,
        targetDay,
        targetShift
      );
      if (!consecVal.valid) {
        alert(`🔴 Không thể xếp tiết này.\n${consecVal.reason}`);
        return;
      }

      const shiftLimitVal = validateSubjectShiftLimit(
        proposedCells,
        subjects,
        assignment.classId,
        targetDay,
        targetShift
      );
      if (!shiftLimitVal.valid) {
        alert(`🔴 Không thể xếp tiết này.\n${shiftLimitVal.reason}`);
        return;
      }

      const gvbmVal = validateGvbmConstraints(
        proposedCells,
        teachers,
        assignment.teacherId,
        targetDay,
        targetShift
      );
      if (!gvbmVal.valid && gvbmVal.errorType === 'TEACHER_GAP_IN_SHIFT') {
        alert(`🔴 Không thể xếp tiết này.\n${gvbmVal.reason}`);
        return;
      }

      updateGridCells(proposedCells);
    } else {
      // Rule 2: Moving an existing placed cell to a new target slot -> STRICTLY 1 PERIOD MOVE
      const proposedCells = workingCells.map((c) =>
        c.id === sourceCellId
          ? {
              ...c,
              day: targetDay,
              shift: targetShift,
              periodNumber: targetPeriodNumber,
            }
          : c
      );

      const consecVal = validateConsecutiveSubjectLimit(
        proposedCells,
        subjects,
        assignment.classId,
        targetDay,
        targetShift
      );
      if (!consecVal.valid) {
        alert(`🔴 Không thể di chuyển tiết này.\n${consecVal.reason}`);
        return;
      }

      const shiftLimitVal = validateSubjectShiftLimit(
        proposedCells,
        subjects,
        assignment.classId,
        targetDay,
        targetShift
      );
      if (!shiftLimitVal.valid) {
        alert(`🔴 Không thể di chuyển tiết này.\n${shiftLimitVal.reason}`);
        return;
      }

      const gvbmVal = validateGvbmConstraints(
        proposedCells,
        teachers,
        assignment.teacherId,
        targetDay,
        targetShift
      );
      if (!gvbmVal.valid && gvbmVal.errorType === 'TEACHER_GAP_IN_SHIFT') {
        alert(`🔴 Không thể di chuyển tiết này.\n${gvbmVal.reason}`);
        return;
      }

      updateGridCells(proposedCells);
    }
  };

  // Open Save Confirmation or Validation Modal
  const handleInitiateSave = () => {
    const stats = checkFullSchedule(
      teachers,
      classes,
      subjects,
      assignments,
      timeConfig,
      workingCells
    );

    // 1. EMPTY TIMETABLE: 0 cells placed
    if (workingCells.length === 0) {
      setValidationCategory('empty');
      setValidationErrors([
        'Thời khóa biểu hiện tại chưa có tiết học nào được xếp.'
      ]);
      setValidationMissingItems([]);
      setValidationConflicts([]);
      setIsErrorModalOpen(true);
      return;
    }

    const hardConflicts = stats.conflicts || [];
    const missingItems = stats.missingPeriods || [];

    // 2. HARD CONFLICTS PRESENT
    if (hardConflicts.length > 0) {
      setValidationCategory('conflict');
      setValidationConflicts(hardConflicts);
      setValidationMissingItems(missingItems);
      setValidationErrors(hardConflicts.map((c) => c.message));
      setIsErrorModalOpen(true);
      return;
    }

    // 3. NO HARD CONFLICTS, BUT MISSING PERIODS EXIST
    if (missingItems.length > 0) {
      setValidationCategory('missing');
      setValidationMissingItems(missingItems);
      setValidationConflicts([]);
      setValidationErrors(missingItems.map((m) => m.message));
      setIsErrorModalOpen(true);
      return;
    }

    // 4. PERFECT TIMETABLE (0 Hard Conflicts, 0 Missing Periods)
    setValidationCategory('conflict');
    setIsConfirmSaveModalOpen(true);
  };

  // Execute Save
  const handleConfirmSave = () => {
    try {
      const normalizedWorking = normalizeScheduleCells(workingCells, assignments);
      console.log(`[TKB SAVE] scheduleEntries.length: ${normalizedWorking.length}`);
      onUpdateCells(normalizedWorking);
      setSavedCells(normalizedWorking);

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

      setStoredLastSavedAt(timeStr);
      setLastSavedAt(timeStr);

      setIsConfirmSaveModalOpen(false);
      setSuccessToast('✅ Đã lưu thời khóa biểu thành công.');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Lỗi khi lưu thời khóa biểu:', err);
      alert('❌ Lưu TKB thất bại. Vui lòng thử lại.');
    }
  };

  // Rows definition: MORNING (1..4) and AFTERNOON (1..3)
  const periodRows = [
    { id: 'm1', label: 'Tiết 1', shift: 'morning' as PeriodShift, periodNumber: 1, isMorning: true },
    { id: 'm2', label: 'Tiết 2', shift: 'morning' as PeriodShift, periodNumber: 2, isMorning: true },
    { id: 'm3', label: 'Tiết 3', shift: 'morning' as PeriodShift, periodNumber: 3, isMorning: true },
    { id: 'm4', label: 'Tiết 4', shift: 'morning' as PeriodShift, periodNumber: 4, isMorning: true },
    { id: 'a1', label: 'Tiết 1', shift: 'afternoon' as PeriodShift, periodNumber: 1, isMorning: false },
    { id: 'a2', label: 'Tiết 2', shift: 'afternoon' as PeriodShift, periodNumber: 2, isMorning: false },
    { id: 'a3', label: 'Tiết 3', shift: 'afternoon' as PeriodShift, periodNumber: 3, isMorning: false },
  ];

  // Stats calculation for active entity
  const currentEntityPlacedPeriods = workingCells.filter((c) =>
    viewMode === 'class' ? c.classId === selectedClassId : c.teacherId === selectedTeacherId
  ).length;

  const currentEntityRequiredPeriods = currentEntityAssignments.reduce((acc, a) => acc + a.periodsPerWeek, 0);

  const teacherSessions = currentTeacher ? getTeacherSessionCount(selectedTeacherId, workingCells) : 0;
  const teacherMaxSessions = currentTeacher ? getTeacherMaxSessionsPerWeek(currentTeacher) : 6;

  return (
    <div className="h-[calc(100vh-62px)] flex flex-col overflow-hidden bg-slate-100/70 font-sans">
      {/* 1. COMPACT TOOLBAR HEADER (~50px) */}
      <div className="bg-slate-900 text-white px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-md z-10">
        {/* Left Section: View Mode & Selector & Stats */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-medium border border-slate-700">
            <button
              onClick={() => {
                setViewMode('class');
                setSuggestingAssignment(null);
              }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'class'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Theo Lớp Học</span>
            </button>

            <button
              onClick={() => {
                setViewMode('teacher');
                setSuggestingAssignment(null);
              }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'teacher'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Theo Giáo Viên</span>
            </button>
          </div>

          {/* Selector Dropdown */}
          {viewMode === 'class' ? (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.name} ({c.grade ? `Khối ${c.grade}` : 'Tiểu học'})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          )}

          {/* Stats Badge */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg">
            {viewMode === 'teacher' ? (
              <>
                <span className="text-slate-300 font-medium">Tiết:</span>
                <span className="font-bold text-blue-400">
                  {currentEntityPlacedPeriods}/{currentTeacher?.maxWeeklyPeriods || 23}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">Buổi:</span>
                <span className={`font-bold ${teacherSessions > teacherMaxSessions ? 'text-red-400' : 'text-emerald-400'}`}>
                  {teacherSessions}/{teacherMaxSessions}
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-300 font-medium">Đã xếp:</span>
                <span className="font-bold text-emerald-400">
                  {currentEntityPlacedPeriods}/{currentEntityRequiredPeriods} tiết
                </span>
              </>
            )}
          </div>

          {/* Unsaved Status Indicator */}
          {hasUnsavedChanges ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Có thay đổi chưa lưu</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Đã lưu {lastSavedAt ? `(${lastSavedAt})` : ''}</span>
            </div>
          )}
        </div>

        {/* Right Section: Actions Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            title="Hoàn tác (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Hoàn tác</span>
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            title="Làm lại (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Làm lại</span>
          </button>

          <button
            onClick={handleReshuffleConfirm}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
            title="Giải phóng các tiết chưa khóa để xếp lại"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Xếp lại</span>
          </button>

          <button
            onClick={handleCheckTkb}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
            title="Kiểm tra toàn bộ quy định và vi phạm của TKB hiện tại"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Kiểm tra TKB</span>
          </button>

          <button
            onClick={handleRunAutoSchedule}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 active:scale-95 border border-indigo-400/30"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>✨ Tự động xếp</span>
          </button>

          <button
            onClick={handleInitiateSave}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>💾 LƯU TKB</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE CONTAINER (2 COLUMNS: UNASSIGNED TRAY & TIMETABLE GRID) */}
      <div className="flex-1 flex gap-2.5 p-2.5 overflow-hidden min-h-0">
        {/* LEFT COLUMN: KHAY TIẾT CHƯA XẾP (~25% WIDTH) */}
        <div className="w-72 md:w-80 shrink-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          {/* Tray Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-extrabold text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                TIẾT CHƯA XẾP
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Kéo thả môn học vào TKB
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
              totalUnassignedCount > 0
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {totalUnassignedCount > 0 ? `Còn ${totalUnassignedCount} tiết` : '✓ Đủ tiết'}
            </span>
          </div>

          {/* Tray Items List (Scrollable internally) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {unassignedTrayItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Chưa có phân công chuyên môn cho đối tượng này.
              </div>
            ) : (
              unassignedTrayItems.map((item) => {
                const isDepleted = item.remainingCount <= 0;
                const isSuggesting = suggestingAssignment?.id === item.assignment.id;

                return (
                  <div
                    key={item.assignment.id}
                    draggable={!isDepleted}
                    onDragStart={(e) => {
                      if (isDepleted) return;
                      e.stopPropagation();
                      e.dataTransfer.setData('text/plain', item.assignment.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedItem({
                        type: 'unassigned',
                        assignmentId: item.assignment.id,
                      });
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      setDraggedItem(null);
                      setHoveredSlot(null);
                    }}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isDepleted
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : isSuggesting
                        ? 'bg-blue-50/90 border-blue-300 shadow-xs ring-1 ring-blue-400'
                        : 'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-xs cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.subject?.color || '#3B82F6' }}
                        />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {isClassView
                            ? item.subject?.name || 'Môn học'
                            : isHomeroomTeacher
                            ? `${item.subject?.name || 'Môn học'}${item.cls ? ` (${item.cls.name})` : ''}`
                            : `${item.cls ? `Lớp ${item.cls.name} – ` : ''}${item.subject?.name || 'Môn học'}`}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          isDepleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isDepleted ? '✓Đủ' : `Còn ${item.remainingCount}`}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span className="truncate max-w-[130px]">
                        {viewMode === 'class'
                          ? item.teacher?.name || 'Chưa gán GV'
                          : isHomeroomTeacher
                          ? (item.cls?.id === teacherHomeroomClass?.id ? 'Lớp chủ nhiệm' : `Lớp ${item.cls?.name || '?'}`)
                          : `Lớp ${item.cls?.name || '?'}`}
                      </span>
                      <span className="text-slate-400 font-normal">
                        {item.placedCount}/{item.assignment.periodsPerWeek} tiết
                      </span>
                    </div>

                    {/* Action Suggestion Button */}
                    {!isDepleted && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => handleToggleSuggestion(item.assignment)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                            isSuggesting
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{isSuggesting ? 'Ẩn gợi ý' : 'Gợi ý vị trí'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BẢNG THỜI KHÓA BIỂU (~75% WIDTH) */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden h-full">
          {/* Header Banner distinguishing GVCN vs GVBM */}
          <div className="bg-slate-900 text-white px-3.5 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="font-extrabold text-xs md:text-sm tracking-wide uppercase">
                {isClassView
                  ? `THỜI KHÓA BIỂU – LỚP ${currentClass?.name || ''}`
                  : teacherHomeroomClass
                  ? `THỜI KHÓA BIỂU – LỚP ${teacherHomeroomClass.name}`
                  : `THỜI KHÓA BIỂU – GIÁO VIÊN: ${currentTeacher?.name || ''}`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {isClassView && (
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-0.5 rounded-md font-semibold">
                  GVCN: <b className="text-amber-300">{classHomeroomTeacher ? classHomeroomTeacher.name : 'Chưa phân công'}</b>
                </span>
              )}
              {!isClassView && isHomeroomTeacher && (
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-0.5 rounded-md font-semibold">
                  GVCN: <b className="text-amber-300">{currentTeacher?.name}</b> ({teacherHomeroomClass ? `Lớp ${teacherHomeroomClass.name}` : 'Chưa gán lớp'})
                </span>
              )}
              {!isClassView && !isHomeroomTeacher && currentTeacher && (
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-0.5 rounded-md font-semibold text-slate-300">
                  Giáo viên bộ môn ({currentTeacher.code})
                </span>
              )}
            </div>
          </div>

          {/* Table Container - Scrollable Internally */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-left min-w-[700px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800 sticky top-0 z-20 h-9 text-xs">
                  <th className="p-1.5 border-r border-slate-800 w-24 text-center uppercase tracking-wider text-[11px]">
                    TIẾT / BUỔI
                  </th>
                  {days.map((day) => (
                    <th key={day} className="p-1.5 border-r border-slate-800 text-center font-bold text-xs">
                      THỨ {day.replace('T', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodRows.map((row, rIdx) => {
                  const isMorningHeader = rIdx === 0;
                  const isAfternoonHeader = rIdx === 4;

                  return (
                    <React.Fragment key={row.id}>
                      {/* Morning Header Divider */}
                      {isMorningHeader && (
                        <tr className="bg-blue-50/80 text-blue-900 font-bold border-y border-blue-200 text-center h-6">
                          <td className="font-bold text-[10px] uppercase bg-blue-100/90 text-blue-950 border-r border-blue-200 px-1">
                            SÁNG
                          </td>
                          <td colSpan={days.length} className="text-[11px] uppercase tracking-wider font-extrabold py-0.5">
                            ☀️ BUỔI SÁNG (TIẾT 1 – TIẾT 4)
                          </td>
                        </tr>
                      )}

                      {/* Afternoon Header Divider */}
                      {isAfternoonHeader && (
                        <tr className="bg-amber-50/80 text-amber-900 font-bold border-y border-amber-200 text-center h-6">
                          <td className="font-bold text-[10px] uppercase bg-amber-100/90 text-amber-950 border-r border-amber-200 px-1">
                            CHIỀU
                          </td>
                          <td colSpan={days.length} className="text-[11px] uppercase tracking-wider font-extrabold py-0.5">
                            🌤 BUỔI CHIỀU (TIẾT 1 – TIẾT 3)
                          </td>
                        </tr>
                      )}

                      {/* Row Grid */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50/40 h-[44px]">
                        {/* Period Column Label */}
                        <td className="p-1 font-bold text-slate-800 border-r border-slate-200 bg-slate-50 text-center w-24 shrink-0">
                          <div className="text-xs font-black text-slate-900">{row.label}</div>
                          <div className="text-[9px] text-slate-500 font-normal">
                            {row.isMorning ? 'Sáng' : 'Chiều'}
                          </div>
                        </td>

                        {/* Day Cells */}
                        {days.map((day) => {
                          const shift: PeriodShift = row.shift;
                          const pNum = row.periodNumber;

                          // Cell lookup - STRICT 1-1-1 MATCH
                          const cellInSlot = workingCells.find((c) => {
                            if (c.day !== day) return false;
                            if (c.shift !== shift) return false;
                            if (c.periodNumber !== pNum) return false;
                            return viewMode === 'class'
                              ? c.classId === selectedClassId
                              : c.teacherId === selectedTeacherId;
                          });

                          const subject = cellInSlot
                            ? subjects.find((s) => s.id === cellInSlot.subjectId)
                            : null;
                          const teacher = cellInSlot
                            ? teachers.find((t) => t.id === cellInSlot.teacherId)
                            : null;
                          const cls = cellInSlot
                            ? classes.find((c) => c.id === cellInSlot.classId)
                            : null;

                          // Check suggestion
                          const suggestion = suggestions.find(
                            (s) =>
                              s.day === day &&
                              s.shift === shift &&
                              s.periodNumber === pNum
                          );

                          // Check disabled school slot
                          const isDisabledSchool = timeConfig.disabledSlots.some(
                            (d) =>
                              d.day === day &&
                              d.shift === shift &&
                              d.periodNumber === pNum
                          );

                          const isHovered =
                            hoveredSlot?.day === day &&
                            hoveredSlot?.shift === shift &&
                            hoveredSlot?.periodNumber === pNum;

                          return (
                            <td
                              key={day}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                setHoveredSlot({ day, shift, periodNumber: pNum });
                              }}
                              onDragLeave={(e) => {
                                e.stopPropagation();
                                setHoveredSlot(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setHoveredSlot(null);
                                if (draggedItem) {
                                  const itemToPlace = draggedItem;
                                  setDraggedItem(null);
                                  placeAssignmentIntoSlot(
                                    itemToPlace.assignmentId,
                                    day,
                                    shift,
                                    pNum,
                                    itemToPlace.sourceCellId
                                  );
                                }
                              }}
                              className={`p-1 border-r border-slate-200 transition-colors relative h-[44px] ${
                                isHovered ? 'bg-blue-100/70 ring-2 ring-blue-500 z-10' : ''
                              } ${isDisabledSchool ? 'bg-slate-100/90' : ''}`}
                            >
                              {isDisabledSchool ? (
                                <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-semibold italic bg-slate-100 border border-dashed border-slate-200 rounded-lg">
                                  🚫 Nghỉ
                                </div>
                              ) : cellInSlot ? (
                                <div
                                  draggable={!cellInSlot.isLocked}
                                  title={`Môn: ${subject?.name || 'Môn học'}\nLớp: Lớp ${cls?.name || currentClass?.name || '?'}\nGiáo viên: ${teacher?.name || currentTeacher?.name || 'Chưa gán'}\nBuổi: ${row.isMorning ? 'Sáng' : 'Chiều'}\nTiết: ${pNum}`}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData('text/plain', cellInSlot.assignmentId);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggedItem({
                                      type: 'cell',
                                      assignmentId: cellInSlot.assignmentId,
                                      sourceCellId: cellInSlot.id,
                                    });
                                  }}
                                  onDragEnd={(e) => {
                                    e.stopPropagation();
                                    setDraggedItem(null);
                                    setHoveredSlot(null);
                                  }}
                                  className={`h-full p-1 rounded-lg border text-left flex items-center justify-between transition-all group ${
                                    cellInSlot.isLocked
                                      ? 'bg-slate-100 border-slate-300 text-slate-800'
                                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs cursor-grab active:cursor-grabbing'
                                  }`}
                                  style={{
                                    borderLeftWidth: '3px',
                                    borderLeftColor: subject?.color || '#3B82F6',
                                  }}
                                >
                                  <div className="min-w-0 flex-1 pr-1">
                                    <div className="font-bold text-xs text-slate-900 truncate leading-tight">
                                      {subject?.name || 'Môn học'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium truncate">
                                      {isClassView
                                        ? teacher?.name || 'Chưa gán GV'
                                        : isHomeroomTeacher
                                        ? (teacherHomeroomClass && cls?.id === teacherHomeroomClass.id ? 'Lớp chủ nhiệm' : `Lớp ${cls?.name || '?'}`)
                                        : `Lớp ${cls?.name || '?'}`}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                                    <button
                                      onClick={() => handleToggleLockCell(cellInSlot.id)}
                                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                      title={cellInSlot.isLocked ? 'Mở khóa tiết' : 'Khóa tiết'}
                                    >
                                      {cellInSlot.isLocked ? (
                                        <Lock className="w-3 h-3 text-slate-700" />
                                      ) : (
                                        <Unlock className="w-3 h-3 text-slate-400" />
                                      )}
                                    </button>

                                    {!cellInSlot.isLocked && (
                                      <button
                                        onClick={() => handleDeleteCell(cellInSlot.id)}
                                        className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        title="Xóa tiết khỏi TKB"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : suggestion ? (
                                <button
                                  onClick={() => {
                                    if (suggestingAssignment && suggestion.isValid) {
                                      placeAssignmentIntoSlot(
                                        suggestingAssignment.id,
                                        day,
                                        shift,
                                        pNum
                                      );
                                    }
                                  }}
                                  disabled={!suggestion.isValid}
                                  className={`w-full h-full p-1 rounded-lg text-left border flex flex-col justify-between transition-all ${
                                    suggestion.isValid
                                      ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900 hover:bg-emerald-200 cursor-pointer shadow-2xs'
                                      : 'bg-red-50/80 border-red-200 text-red-800 cursor-not-allowed opacity-80'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 font-bold text-[10px]">
                                    {suggestion.isValid ? (
                                      <span className="text-emerald-800">🟢 Xếp vào đây</span>
                                    ) : (
                                      <span className="text-red-700">🔴 Không thể xếp</span>
                                    )}
                                  </div>
                                  {!suggestion.isValid && suggestion.reason && (
                                    <div className="text-[9px] text-red-600 leading-tight truncate">
                                      {suggestion.reason}
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <div className="h-full flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer font-medium text-center px-0.5">
                                  {day === 'T2' && shift === 'morning' && pNum === 1 ? (
                                    <span className="text-[9px] text-amber-700/80 font-bold">Ưu tiên trống (Chào cờ)</span>
                                  ) : day === 'T6' && shift === 'morning' && pNum === 4 ? (
                                    <span className="text-[9px] text-amber-700/80 font-bold">Ưu tiên trống (SHL)</span>
                                  ) : (
                                    '+ Trống'
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Save Modal */}
      {isConfirmSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">LƯU THỜI KHÓA BIỂU</h3>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                  TKB hợp lệ, không có lỗi.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Bạn có muốn lưu thời khóa biểu hiện tại không?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmSaveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
              >
                Hủy
              </button>

              <button
                onClick={handleConfirmSave}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Lưu TKB</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Result Modal (Empty / Missing / Conflict) */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header section based on Category */}
            {validationCategory === 'empty' && (
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">⚠️ THỜI KHÓA BIỂU TRỐNG</h3>
                    <p className="text-xs text-amber-700 font-semibold mt-0.5">
                      Chưa có tiết học nào được xếp vào bảng
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsErrorModalOpen(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {validationCategory === 'missing' && (
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">⚠️ TKB CHƯA HOÀN THÀNH (THIẾU TIẾT)</h3>
                    <p className="text-xs text-amber-700 font-semibold mt-0.5">
                      Còn {validationMissingItems.length} phân công chưa xếp đủ tiết ({validationMissingItems.reduce((a, b) => a + b.missing, 0)} tiết còn thiếu)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsErrorModalOpen(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {validationCategory === 'conflict' && (
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">🔴 XUNG ĐỘT THỜI KHÓA BIỂU</h3>
                    <p className="text-xs text-red-600 font-semibold mt-0.5">
                      Phát hiện {validationConflicts.length > 0 ? validationConflicts.length : validationErrors.length} lỗi vi phạm quy định bắt buộc:
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsErrorModalOpen(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content Body */}
            {validationCategory === 'empty' && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2 leading-relaxed">
                <p className="font-bold text-sm text-amber-950">Thời khóa biểu hiện tại đang trống hoàn toàn.</p>
                <p>
                  Hệ thống không thể lưu thời khóa biểu rỗng. Vui lòng kéo-thả môn học từ khay phân công hoặc sử dụng nút <strong>"✨ Tự động xếp"</strong> để khởi tạo TKB trước khi lưu.
                </p>
              </div>
            )}

            {validationCategory === 'missing' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Thời khóa biểu chưa thể lưu chính thức vì còn các tiết chưa được xếp đủ theo Phân công chuyên môn:
                </p>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {validationMissingItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold">Lớp {item.className}</span> —{' '}
                        <span className="font-semibold text-blue-800">{item.subjectName}</span> ({item.teacherName})
                      </div>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[11px] shrink-0">
                        Mới xếp {item.placed}/{item.required} tiết (thiếu {item.missing})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationCategory === 'conflict' && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {validationErrors.map((err, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-900 leading-relaxed"
                    >
                      {err}
                    </div>
                  ))}
                </div>

                {validationMissingItems.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                    ⚠️ Ngoài các lỗi xung đột trên, thời khóa biểu còn thiếu {validationMissingItems.reduce((a, b) => a + b.missing, 0)} tiết chưa xếp ({validationMissingItems.length} phân công).
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 italic">
                {validationCategory === 'empty' && 'Hãy xếp TKB trước khi lưu.'}
                {validationCategory === 'missing' && 'Hãy xếp đủ các tiết còn thiếu để hoàn tất TKB.'}
                {validationCategory === 'conflict' && 'Hãy sửa các lỗi xung đột đỏ trước khi lưu.'}
              </p>
              <button
                onClick={() => setIsErrorModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reshuffle Confirmation Modal */}
      {isReshuffleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">XẾP LẠI THỜI KHÓA BIỂU</h3>
                <p className="text-xs text-slate-500 mt-0.5">Xóa các tiết chưa khóa</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn giải phóng toàn bộ các tiết chưa khóa để tiến hành xếp lại thời khóa biểu không? Các tiết đã bị 🔒 khóa sẽ được giữ nguyên.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsReshuffleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
              >
                Hủy
              </button>

              <button
                onClick={handleReshuffleConfirm}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
              >
                Xác nhận xếp lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Schedule Result Summary Modal */}
      {autoScheduleResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base uppercase tracking-wide">
                    KẾT QUẢ XẾP TKB TỰ ĐỘNG
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đã xếp thành công <strong>{autoScheduleResult.totalPlaced}</strong> / <strong>{autoScheduleResult.totalRequired}</strong> tiết học
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAutoScheduleResult(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <div className="text-xl font-black text-emerald-700">
                  {autoScheduleResult.statsSummary.teachersWithinSessions}/{autoScheduleResult.statsSummary.totalTeachers}
                </div>
                <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                  🟢 Không vượt giới hạn buổi
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div className="text-xl font-black text-amber-700">
                  {autoScheduleResult.statsSummary.teachersWithGaps}
                </div>
                <div className="text-[11px] font-bold text-amber-800 mt-0.5">
                  🟠 Giáo viên có tiết trống
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                <div className="text-xl font-black text-red-700">
                  {autoScheduleResult.statsSummary.teachersExceededSessions}
                </div>
                <div className="text-[11px] font-bold text-red-800 mt-0.5">
                  🔴 Vượt số buổi tối đa
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                <div className="text-xl font-black text-purple-700">
                  {autoScheduleResult.statsSummary.teachersExceededPeriods}
                </div>
                <div className="text-[11px] font-bold text-purple-800 mt-0.5">
                  🟠 Dư định mức tiết
                </div>
              </div>
            </div>

            {/* Unplaced Reports Section if any */}
            {autoScheduleResult.unplacedReports.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>CẢNH BÁO: Còn {autoScheduleResult.unplacedReports.length} phân công chưa xếp hết số tiết:</span>
                </div>
                <div className="max-h-[220px] overflow-y-auto border border-amber-200 bg-amber-50/50 rounded-xl divide-y divide-amber-100 text-xs">
                  {autoScheduleResult.unplacedReports.map((report, idx) => (
                    <div key={idx} className="p-2.5 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900">{report.className}</span> —{' '}
                        <span className="font-semibold text-blue-700">{report.subjectName}</span> ({report.teacherName})
                        <div className="text-[11px] text-amber-900 mt-0.5">
                          💡 Lý do: {report.reason}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px] shrink-0">
                        Còn thiếu {report.missingPeriods} tiết
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Hoàn hảo! Đã phân bổ 100% tất cả các tiết học mà không phát sinh lỗi trùng lịch hay vượt giới hạn buổi dạy!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setAutoScheduleResult(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
              >
                Đã hiểu, tiếp tục chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Scheduling Progress Overlay */}
      {isAutoScheduling && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 border border-slate-200">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base">✨ Tự động xếp thời khóa biểu</h3>
              <p className="text-sm font-semibold text-indigo-600 animate-pulse">{autoScheduleStepText}</p>
            </div>
            <p className="text-xs text-slate-500">
              Hệ thống đang kiểm tra đầy đủ các ràng buộc cứng & ưu tiên các vị trí phù hợp.
            </p>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold z-50 border border-emerald-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Info Toast Notification */}
      {infoToast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold z-50 border border-slate-700">
          <Info className="w-5 h-5 text-blue-400" />
          <span>{infoToast}</span>
        </div>
      )}
    </div>
  );
};
