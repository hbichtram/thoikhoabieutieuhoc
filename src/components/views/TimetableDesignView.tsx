import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Save,
  RotateCw,
  Undo2,
  Redo2,
  Clock,
  ShieldAlert,
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
} from '../../types';
import { getSlotSuggestions, checkFullSchedule } from '../../utils/conflictChecker';
import { getStoredLastSavedAt, setStoredLastSavedAt } from '../../services/storage';
import { runAutoScheduler, AutoScheduleResult } from '../../utils/autoScheduler';
import {
  checkTeacherSessionLimit,
  getTeacherSessions,
  getTeacherGapPeriods,
  getTeacherMaxSessionsPerWeek,
} from '../../utils/teacherUtils';

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
  // Working schedule state vs last saved schedule state
  const [savedCells, setSavedCells] = useState<ScheduleCell[]>(cells);
  const [workingCells, setWorkingCells] = useState<ScheduleCell[]>(cells);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ScheduleCell[][]>([cells]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Last saved timestamp
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(getStoredLastSavedAt());

  // Modal & Toast States
  const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isReshuffleModalOpen, setIsReshuffleModalOpen] = useState(false);
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
    if (JSON.stringify(cells) !== JSON.stringify(savedCells) && historyIndex === 0) {
      setSavedCells(cells);
      setWorkingCells(cells);
      setHistory([cells]);
      setHistoryIndex(0);
    }
  }, [cells]);

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

  // Helper to mutate working cells with history tracking
  const updateGridCells = (newCells: ScheduleCell[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCells);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setWorkingCells(newCells);
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
  };

  const days: DayOfWeek[] = timeConfig.enabledDays;

  // Selected current entity
  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // Relevant assignments for current entity
  const currentEntityAssignments = assignments.filter((a) => {
    if (viewMode === 'class') return a.classId === selectedClassId;
    return a.teacherId === selectedTeacherId;
  });

  // Calculate unassigned periods for each assignment of current entity using workingCells
  const unassignedTrayItems = currentEntityAssignments.map((a) => {
    const placedCount = workingCells.filter((c) => c.assignmentId === a.id).length;
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

  // Place Assignment into Slot (or Move Cell)
  const placeAssignmentIntoSlot = (
    assignmentId: string,
    targetDay: DayOfWeek,
    targetShift: PeriodShift,
    targetPeriodNumber: number,
    sourceCellId?: string
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Check if target cell already has a scheduled cell for the target class
    const targetClassId = viewMode === 'class' ? selectedClassId : assignment.classId;

    const existingCell = workingCells.find(
      (c) =>
        c.classId === targetClassId &&
        c.day === targetDay &&
        c.shift === targetShift &&
        c.periodNumber === targetPeriodNumber
    );

    if (existingCell && existingCell.isLocked) {
      alert('Không thể đè lên ô đã bị khóa 🔒!');
      return;
    }

    // Check Hard Constraint: Max 6 sessions per week for teacher
    const teacherSessionSet = getTeacherSessions(
      assignment.teacherId,
      workingCells.filter((c) => c.id !== sourceCellId)
    );
    const isExistingSession = teacherSessionSet.has(`${targetDay}_${targetShift}`);
    if (!isExistingSession && teacherSessionSet.size >= 6) {
      const tch = teachers.find((t) => t.id === assignment.teacherId);
      const dayLabel = `Thứ ${targetDay.replace('T', '')}`;
      const shiftLabel = targetShift === 'morning' ? 'Sáng' : 'Chiều';
      alert(
        `🔴 KHÔNG THỂ XẾP: Giáo viên ${tch?.name || 'này'} đã dạy đủ 6 buổi/tuần. Việc xếp tiết này vào ${dayLabel} ${shiftLabel} sẽ tạo thành buổi thứ 7 (vượt quá giới hạn tối đa 6 buổi/tuần)!`
      );
      return;
    }

    // Remove existing cell in target slot if present (or source cell if moving)
    let updatedCells = workingCells.filter((c) => {
      if (sourceCellId && c.id === sourceCellId) return false;
      if (
        c.classId === targetClassId &&
        c.day === targetDay &&
        c.shift === targetShift &&
        c.periodNumber === targetPeriodNumber
      )
        return false;
      return true;
    });

    const newCell: ScheduleCell = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      classId: targetClassId,
      day: targetDay,
      shift: targetShift,
      periodNumber: targetPeriodNumber,
      assignmentId: assignment.id,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      isLocked: false,
    };

    updatedCells.push(newCell);
    updateGridCells(updatedCells);

    // Refresh suggestions if active
    if (suggestingAssignment) {
      const suggs = getSlotSuggestions(
        suggestingAssignment,
        teachers,
        classes,
        subjects,
        timeConfig,
        updatedCells
      );
      setSuggestions(suggs);
    }
  };

  // Validate timetable for hard errors before saving
  const validateTimetable = (targetCells: ScheduleCell[]): string[] => {
    const errors: string[] = [];

    const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
    const classMap = new Map<string, ClassItem>(classes.map((c) => [c.id, c]));
    const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
    const assignmentMap = new Map<string, Assignment>(assignments.map((a) => [a.id, a]));

    // 1. Check cell missing required data
    targetCells.forEach((cell) => {
      const dayName = `Thứ ${cell.day.replace('T', '')}`;
      const shiftName = cell.shift === 'morning' ? 'Sáng' : 'Chiều';
      const slotText = `${dayName} - Tiết ${cell.periodNumber} (${shiftName})`;

      const cls = classMap.get(cell.classId);
      const className = cls ? `Lớp ${cls.name}` : 'Lớp ?';

      if (!cell.teacherId || !teacherMap.has(cell.teacherId)) {
        errors.push(`🔴 ${slotText}: Tiết học tại ${className} thiếu thông tin giáo viên.`);
      }

      if (!cell.subjectId || !subjectMap.has(cell.subjectId)) {
        errors.push(`🔴 ${slotText}: Tiết học tại ${className} thiếu thông tin môn học.`);
      }

      if (!cell.assignmentId || !assignmentMap.has(cell.assignmentId)) {
        errors.push(
          `🔴 ${slotText}: Tiết học tại ${className} không thuộc phân công chuyên môn hợp lệ.`
        );
      }

      // Check teacher unavailable slots
      const tch = teacherMap.get(cell.teacherId);
      if (tch) {
        const isUnavailable = tch.unavailableSlots.some(
          (u) =>
            u.day === cell.day && u.shift === cell.shift && u.periodNumber === cell.periodNumber
        );
        if (isUnavailable) {
          errors.push(
            `🔴 ${slotText}: ${tch.name} bị xếp tiết vào khung giờ giáo viên đã đăng ký bận.`
          );
        }
      }

      // Check disabled school slots
      const isDisabledSchool = timeConfig.disabledSlots.some(
        (d) =>
          d.day === cell.day && d.shift === cell.shift && d.periodNumber === cell.periodNumber
      );
      if (isDisabledSchool) {
        errors.push(`🔴 ${slotText}: ${className} bị xếp tiết vào khung thời gian trường đã tắt.`);
      }
    });

    // 2. Check Teacher Overlap (1 teacher in 2 classes at same slot)
    const slotTeacherMap = new Map<string, ScheduleCell[]>();
    targetCells.forEach((cell) => {
      const key = `${cell.teacherId}_${cell.day}_${cell.shift}_${cell.periodNumber}`;
      if (!slotTeacherMap.has(key)) slotTeacherMap.set(key, []);
      slotTeacherMap.get(key)!.push(cell);
    });

    slotTeacherMap.forEach((cellGroup) => {
      if (cellGroup.length > 1) {
        const first = cellGroup[0];
        const tch = teacherMap.get(first.teacherId);
        const dayName = `Thứ ${first.day.replace('T', '')}`;
        const shiftName = first.shift === 'morning' ? 'Sáng' : 'Chiều';
        const classNames = cellGroup
          .map((c) => classMap.get(c.classId)?.name || '?')
          .join(', ');

        errors.push(
          `🔴 ${dayName} - Tiết ${first.periodNumber} (${shiftName}): ${
            tch?.name || 'Giáo viên'
          } đang dạy ${cellGroup.length} lớp cùng lúc (${classNames}).`
        );
      }
    });

    // 3. Check Class Overlap (1 class with 2 subjects/teachers at same slot)
    const slotClassMap = new Map<string, ScheduleCell[]>();
    targetCells.forEach((cell) => {
      const key = `${cell.classId}_${cell.day}_${cell.shift}_${cell.periodNumber}`;
      if (!slotClassMap.has(key)) slotClassMap.set(key, []);
      slotClassMap.get(key)!.push(cell);
    });

    slotClassMap.forEach((cellGroup) => {
      if (cellGroup.length > 1) {
        const first = cellGroup[0];
        const cls = classMap.get(first.classId);
        const dayName = `Thứ ${first.day.replace('T', '')}`;
        const shiftName = first.shift === 'morning' ? 'Sáng' : 'Chiều';
        const subNames = cellGroup
          .map((c) => subjectMap.get(c.subjectId)?.name || '?')
          .join(', ');

        errors.push(
          `🔴 ${dayName} - Tiết ${first.periodNumber} (${shiftName}): Lớp ${
            cls?.name || '?'
          } có ${cellGroup.length} môn cùng lúc (${subNames}).`
        );
      }
    });

    // 4. Check extra periods per assignment
    const assignmentPlacedCount = new Map<string, number>();
    targetCells.forEach((c) => {
      assignmentPlacedCount.set(c.assignmentId, (assignmentPlacedCount.get(c.assignmentId) || 0) + 1);
    });

    assignments.forEach((a) => {
      const placed = assignmentPlacedCount.get(a.id) || 0;
      if (placed > a.periodsPerWeek) {
        const cls = classMap.get(a.classId);
        const sub = subjectMap.get(a.subjectId);
        const tch = teacherMap.get(a.teacherId);
        errors.push(
          `🔴 Lớp ${cls?.name || '?'} môn ${sub?.name || '?'} (${tch?.name || '?'}): Đã xếp ${placed}/${a.periodsPerWeek} tiết (thừa ${placed - a.periodsPerWeek} tiết).`
        );
      }
    });

    // 5. Check Teacher Max Sessions/Week (Hard Constraint)
    teachers.forEach((tch) => {
      const maxSessions = getTeacherMaxSessionsPerWeek(tch);
      const sessions = getTeacherSessions(tch.id, targetCells);
      if (sessions.size > maxSessions) {
        errors.push(
          `🔴 ${tch.name}: Bị xếp vào ${sessions.size}/${maxSessions} buổi/tuần (VƯỢT QUÁ GIỚI HẠN TỐI ĐA ${maxSessions} BUỔI/TUẦN).`
        );
      }
    });

    return errors;
  };

  // Trigger Save Process
  const handleSaveButtonClick = () => {
    if (!hasUnsavedChanges) {
      setInfoToast('TKB hiện tại không có thay đổi cần lưu.');
      setTimeout(() => setInfoToast(null), 3000);
      return;
    }

    const errors = validateTimetable(workingCells);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsErrorModalOpen(true);
    } else {
      setIsConfirmSaveModalOpen(true);
    }
  };

  // Perform Final Official Save to Persistence
  const handleConfirmSave = () => {
    try {
      onUpdateCells(workingCells);
      setSavedCells(workingCells);

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

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Primary Action Toolbar with Save, Status Badge, Undo, Redo, Reshuffle */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Save Status & Last Saved Time */}
        <div className="flex items-center gap-3">
          {hasUnsavedChanges ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>🟠 Có thay đổi chưa lưu</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>🟢 Đã lưu</span>
            </div>
          )}

          {lastSavedAt ? (
            <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Lưu lần cuối: <strong className="text-slate-800 font-semibold">{lastSavedAt}</strong>
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-medium">Chưa lưu lần nào</div>
          )}
        </div>

        {/* Action Controls: Undo, Redo, Reshuffle, Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
            title="Hoàn tác thao tác trước [↶]"
          >
            <Undo2 className="w-4 h-4 text-slate-600" />
            <span>Hoàn tác</span>
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
            title="Làm lại thao tác vừa hoàn tác [↷]"
          >
            <Redo2 className="w-4 h-4 text-slate-600" />
            <span>Làm lại</span>
          </button>

          <button
            onClick={() => setIsReshuffleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
            title="Mở lại các tiết chưa khóa để xếp lại [🔄]"
          >
            <RotateCw className="w-4 h-4 text-slate-600" />
            <span>Xếp lại</span>
          </button>

          <button
            onClick={handleRunAutoSchedule}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            title="Tự động xếp TKB tối ưu theo các ưu tiên & không quá 6 buổi/tuần [✨]"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
            <span>Tự động xếp TKB</span>
          </button>

          <button
            onClick={handleSaveButtonClick}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50 shadow-emerald-600/20'
                : 'bg-emerald-700/80 hover:bg-emerald-600 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>💾 LƯU TKB</span>
          </button>
        </div>
      </div>

      {/* View Mode Toggle & Entity Selector Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Toggle Mode Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setViewMode('class');
                setSuggestingAssignment(null);
              }}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'class'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Lớp Học
            </button>

            <button
              onClick={() => {
                setViewMode('teacher');
                setSuggestingAssignment(null);
              }}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'teacher'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Giáo Viên
            </button>
          </div>

          {/* Select Dropdown */}
          {viewMode === 'class' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Chọn lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSuggestingAssignment(null);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} (Khối {c.grade})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Chọn giáo viên:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setSuggestingAssignment(null);
                }}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Entity Header Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Đang thao tác TKB</div>
            <div className="font-bold text-slate-900 text-base">
              {viewMode === 'class' ? `Lớp ${currentClass?.name}` : currentTeacher?.name}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid + Unassigned Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Unassigned Assignments Tray */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Khay Tiết Chưa Xếp</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Kéo thẻ môn bên dưới thả vào ô TKB hoặc bấm &quot;Gợi ý&quot;
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {unassignedTrayItems.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Chưa có phân công chuyên môn cho đối tượng này.
              </div>
            ) : (
              unassignedTrayItems.map((item) => {
                const isSuggesting = suggestingAssignment?.id === item.assignment.id;
                const isDepleted = item.remainingCount <= 0;

                return (
                  <div
                    key={item.assignment.id}
                    draggable={!isDepleted}
                    onDragStart={() => {
                      setDraggedItem({
                        type: 'unassigned',
                        assignmentId: item.assignment.id,
                      });
                    }}
                    onDragEnd={() => {
                      setDraggedItem(null);
                      setHoveredSlot(null);
                    }}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSuggesting
                        ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-500/30'
                        : isDepleted
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm hover:shadow cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.subject?.color || '#3B82F6' }}
                        />
                        <span className="font-bold text-slate-900 text-sm">{item.subject?.name}</span>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isDepleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.placedCount}/{item.assignment.periodsPerWeek} tiết
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                      <span>
                        {viewMode === 'class'
                          ? `GV: ${item.teacher?.name}`
                          : `Lớp: ${item.cls?.name}`}
                      </span>
                      {item.remainingCount > 0 && (
                        <span className="font-semibold text-blue-600">
                          Còn {item.remainingCount} tiết
                        </span>
                      )}
                    </div>

                    {/* Suggestion Button */}
                    {!isDepleted && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => handleToggleSuggestion(item.assignment)}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            isSuggesting
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isSuggesting ? 'Tắt gợi ý vị trí' : 'Gợi ý vị trí'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Timetable Grid Matrix */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {viewMode === 'class'
                  ? `BẢNG TKB LỚP ${currentClass?.name}`
                  : `BẢNG TKB - ${currentTeacher?.name}`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kéo thả các môn vào từng ô tiết. Biểu tượng 🟢 = Hợp lệ, 🔴 = Xung đột/Không xếp được.
              </p>
            </div>

            {suggestingAssignment && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                <span>
                  Đang gợi ý cho môn:{' '}
                  <b>{subjects.find((s) => s.id === suggestingAssignment.subjectId)?.name}</b>
                </span>
                <button
                  onClick={() => {
                    setSuggestingAssignment(null);
                    setSuggestions([]);
                  }}
                  className="p-0.5 hover:bg-blue-200 rounded text-blue-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                  <th className="p-3 border-r border-slate-800 w-24">Buổi / Tiết</th>
                  {days.map((day) => (
                    <th key={day} className="p-3 border-r border-slate-800 min-w-[130px]">
                      THỨ {day.replace('T', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Morning Section */}
                <tr className="bg-blue-100/70 font-bold text-blue-900 text-left">
                  <td colSpan={6} className="px-3 py-1.5 text-[11px] uppercase tracking-wider">
                    BUỔI SÁNG
                  </td>
                </tr>

                {[1, 2, 3, 4, 5].map((pNum) => (
                  <tr key={`m_${pNum}`} className="border-b border-slate-200 hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-700 border-r border-slate-200 bg-slate-50/80">
                      TIẾT {pNum}
                    </td>

                    {days.map((day) => {
                      const shift: PeriodShift = 'morning';

                      // Find scheduled cell for current entity at this slot in workingCells
                      const cellInSlot = workingCells.find((c) => {
                        if (viewMode === 'class') {
                          return (
                            c.classId === selectedClassId &&
                            c.day === day &&
                            c.shift === shift &&
                            c.periodNumber === pNum
                          );
                        } else {
                          return (
                            c.teacherId === selectedTeacherId &&
                            c.day === day &&
                            c.shift === shift &&
                            c.periodNumber === pNum
                          );
                        }
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

                      // Check suggestion status if active
                      const suggestion = suggestions.find(
                        (s) => s.day === day && s.shift === shift && s.periodNumber === pNum
                      );

                      // Check if slot disabled by school
                      const isDisabledSchool = timeConfig.disabledSlots.some(
                        (d) => d.day === day && d.shift === shift && d.periodNumber === pNum
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
                            setHoveredSlot({ day, shift, periodNumber: pNum });
                          }}
                          onDragLeave={() => setHoveredSlot(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setHoveredSlot(null);
                            if (draggedItem) {
                              placeAssignmentIntoSlot(
                                draggedItem.assignmentId,
                                day,
                                shift,
                                pNum,
                                draggedItem.sourceCellId
                              );
                            }
                          }}
                          className={`p-1.5 border-r border-slate-200 align-top transition-all min-h-[75px] ${
                            isDisabledSchool
                              ? 'bg-slate-100 text-slate-400'
                              : isHovered
                              ? 'bg-blue-100/80 ring-2 ring-blue-500'
                              : suggestion
                              ? suggestion.isValid
                                ? 'bg-emerald-50/80 ring-2 ring-emerald-400'
                                : 'bg-red-50/50'
                              : ''
                          }`}
                        >
                          {isDisabledSchool ? (
                            <div className="py-4 text-[10px] text-slate-400 font-semibold uppercase">
                              Trường tắt
                            </div>
                          ) : cellInSlot ? (
                            <div
                              draggable={!cellInSlot.isLocked}
                              onDragStart={() => {
                                setDraggedItem({
                                  type: 'cell',
                                  assignmentId: cellInSlot.assignmentId,
                                  sourceCellId: cellInSlot.id,
                                });
                              }}
                              onDragEnd={() => {
                                setDraggedItem(null);
                                setHoveredSlot(null);
                              }}
                              className={`p-2.5 rounded-xl border text-left shadow-sm relative group transition-all ${
                                cellInSlot.isLocked
                                  ? 'bg-amber-50 border-amber-300'
                                  : 'bg-white border-slate-300 hover:border-blue-400 hover:shadow cursor-grab active:cursor-grabbing'
                              }`}
                              style={{
                                borderLeftWidth: '5px',
                                borderLeftColor: subject?.color || '#2563EB',
                              }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-slate-900 text-xs leading-snug">
                                  {subject?.name}
                                </span>
                                {cellInSlot.isLocked && (
                                  <span className="text-amber-700 shrink-0" title="Ô này đã bị khóa">
                                    <Lock className="w-3 h-3" />
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-600 mt-1 font-medium">
                                {viewMode === 'class' ? teacher?.name : `Lớp ${cls?.name}`}
                              </div>

                              {/* Hover Cell Action buttons */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 rounded-md p-0.5 shadow border border-slate-200">
                                <button
                                  onClick={() => handleToggleLockCell(cellInSlot.id)}
                                  className={`p-1 rounded hover:bg-slate-100 ${
                                    cellInSlot.isLocked
                                      ? 'text-amber-700 font-bold'
                                      : 'text-slate-500'
                                  }`}
                                  title={cellInSlot.isLocked ? 'Mở khóa ô này' : 'Khóa ô này'}
                                >
                                  {cellInSlot.isLocked ? (
                                    <Unlock className="w-3 h-3" />
                                  ) : (
                                    <Lock className="w-3 h-3" />
                                  )}
                                </button>
                                {!cellInSlot.isLocked && (
                                  <button
                                    onClick={() => handleDeleteCell(cellInSlot.id)}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
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
                              className={`w-full h-full min-h-[55px] p-2 rounded-xl text-left border flex flex-col justify-between transition-all ${
                                suggestion.isValid
                                  ? 'bg-emerald-100/60 border-emerald-300 text-emerald-900 hover:bg-emerald-200/80 cursor-pointer shadow-sm'
                                  : 'bg-red-50/70 border-red-200 text-red-800 cursor-not-allowed opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-1 font-bold text-[11px]">
                                {suggestion.isValid ? (
                                  <span className="text-emerald-700">🟢 Xếp vào đây</span>
                                ) : (
                                  <span className="text-red-700">🔴 Không thể xếp</span>
                                )}
                              </div>
                              {!suggestion.isValid && suggestion.reason && (
                                <div className="text-[10px] text-red-600 mt-1 leading-tight font-sans">
                                  {suggestion.reason}
                                </div>
                              )}
                            </button>
                          ) : (
                            <div className="h-full min-h-[55px] flex items-center justify-center text-[11px] text-slate-300 hover:text-slate-400 border border-dashed border-slate-200 rounded-xl hover:bg-slate-50/50">
                              Trống
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Afternoon Section */}
                <tr className="bg-amber-100/70 font-bold text-amber-900 text-left">
                  <td colSpan={6} className="px-3 py-1.5 text-[11px] uppercase tracking-wider">
                    BUỔI CHIỀU
                  </td>
                </tr>

                {[1, 2, 3, 4, 5].map((pNum) => (
                  <tr key={`a_${pNum}`} className="border-b border-slate-200 hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-700 border-r border-slate-200 bg-slate-50/80">
                      TIẾT {pNum}
                    </td>

                    {days.map((day) => {
                      const shift: PeriodShift = 'afternoon';

                      const cellInSlot = workingCells.find((c) => {
                        if (viewMode === 'class') {
                          return (
                            c.classId === selectedClassId &&
                            c.day === day &&
                            c.shift === shift &&
                            c.periodNumber === pNum
                          );
                        } else {
                          return (
                            c.teacherId === selectedTeacherId &&
                            c.day === day &&
                            c.shift === shift &&
                            c.periodNumber === pNum
                          );
                        }
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

                      const suggestion = suggestions.find(
                        (s) => s.day === day && s.shift === shift && s.periodNumber === pNum
                      );

                      const isDisabledSchool = timeConfig.disabledSlots.some(
                        (d) => d.day === day && d.shift === shift && d.periodNumber === pNum
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
                            setHoveredSlot({ day, shift, periodNumber: pNum });
                          }}
                          onDragLeave={() => setHoveredSlot(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setHoveredSlot(null);
                            if (draggedItem) {
                              placeAssignmentIntoSlot(
                                draggedItem.assignmentId,
                                day,
                                shift,
                                pNum,
                                draggedItem.sourceCellId
                              );
                            }
                          }}
                          className={`p-1.5 border-r border-slate-200 align-top transition-all min-h-[75px] ${
                            isDisabledSchool
                              ? 'bg-slate-100 text-slate-400'
                              : isHovered
                              ? 'bg-blue-100/80 ring-2 ring-blue-500'
                              : suggestion
                              ? suggestion.isValid
                                ? 'bg-emerald-50/80 ring-2 ring-emerald-400'
                                : 'bg-red-50/50'
                              : ''
                          }`}
                        >
                          {isDisabledSchool ? (
                            <div className="py-4 text-[10px] text-slate-400 font-semibold uppercase">
                              Trường tắt
                            </div>
                          ) : cellInSlot ? (
                            <div
                              draggable={!cellInSlot.isLocked}
                              onDragStart={() => {
                                setDraggedItem({
                                  type: 'cell',
                                  assignmentId: cellInSlot.assignmentId,
                                  sourceCellId: cellInSlot.id,
                                });
                              }}
                              onDragEnd={() => {
                                setDraggedItem(null);
                                setHoveredSlot(null);
                              }}
                              className={`p-2.5 rounded-xl border text-left shadow-sm relative group transition-all ${
                                cellInSlot.isLocked
                                  ? 'bg-amber-50 border-amber-300'
                                  : 'bg-white border-slate-300 hover:border-blue-400 hover:shadow cursor-grab active:cursor-grabbing'
                              }`}
                              style={{
                                borderLeftWidth: '5px',
                                borderLeftColor: subject?.color || '#2563EB',
                              }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-slate-900 text-xs leading-snug">
                                  {subject?.name}
                                </span>
                                {cellInSlot.isLocked && (
                                  <span className="text-amber-700 shrink-0" title="Ô này đã bị khóa">
                                    <Lock className="w-3 h-3" />
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-600 mt-1 font-medium">
                                {viewMode === 'class' ? teacher?.name : `Lớp ${cls?.name}`}
                              </div>

                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 rounded-md p-0.5 shadow border border-slate-200">
                                <button
                                  onClick={() => handleToggleLockCell(cellInSlot.id)}
                                  className={`p-1 rounded hover:bg-slate-100 ${
                                    cellInSlot.isLocked
                                      ? 'text-amber-700 font-bold'
                                      : 'text-slate-500'
                                  }`}
                                  title={cellInSlot.isLocked ? 'Mở khóa ô này' : 'Khóa ô này'}
                                >
                                  {cellInSlot.isLocked ? (
                                    <Unlock className="w-3 h-3" />
                                  ) : (
                                    <Lock className="w-3 h-3" />
                                  )}
                                </button>
                                {!cellInSlot.isLocked && (
                                  <button
                                    onClick={() => handleDeleteCell(cellInSlot.id)}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
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
                              className={`w-full h-full min-h-[55px] p-2 rounded-xl text-left border flex flex-col justify-between transition-all ${
                                suggestion.isValid
                                  ? 'bg-emerald-100/60 border-emerald-300 text-emerald-900 hover:bg-emerald-200/80 cursor-pointer shadow-sm'
                                  : 'bg-red-50/70 border-red-200 text-red-800 cursor-not-allowed opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-1 font-bold text-[11px]">
                                {suggestion.isValid ? (
                                  <span className="text-emerald-700">🟢 Xếp vào đây</span>
                                ) : (
                                  <span className="text-red-700">🔴 Không thể xếp</span>
                                )}
                              </div>
                              {!suggestion.isValid && suggestion.reason && (
                                <div className="text-[10px] text-red-600 mt-1 leading-tight font-sans">
                                  {suggestion.reason}
                                </div>
                              )}
                            </button>
                          ) : (
                            <div className="h-full min-h-[55px] flex items-center justify-center text-[11px] text-slate-300 hover:text-slate-400 border border-dashed border-slate-200 rounded-xl hover:bg-slate-50/50">
                              Trống
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
                  TKB không có lỗi.
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

      {/* Error Validation Modal */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">⚠️ KHÔNG THỂ LƯU TKB</h3>
                  <p className="text-xs text-red-600 font-semibold mt-0.5">
                    Phát hiện {validationErrors.length} lỗi:
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

            {/* Error Message List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {validationErrors.map((err, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-900 leading-relaxed"
                >
                  {err}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 italic">
              Vui lòng điều chỉnh lại thời khóa biểu để khắc phục các xung đột trên trước khi lưu.
            </p>

            <div className="flex items-center justify-end pt-2">
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
                  🟢 Không vượt 6 buổi
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
                  🔴 Vượt 6 buổi (Lỗi)
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                <div className="text-xl font-black text-purple-700">
                  {autoScheduleResult.statsSummary.teachersExceededPeriods}
                </div>
                <div className="text-[11px] font-bold text-purple-800 mt-0.5">
                  🟠 Dư định mức (20/23)
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
                <span>Hoàn hảo! Đã phân bổ 100% tất cả các tiết học mà không phát sinh lỗi trùng lịch hay vượt 6 buổi/tuần!</span>
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

      {/* Success Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold z-50 animate-in slide-in-from-bottom-5 duration-200 border border-emerald-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Info Toast Notification */}
      {infoToast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold z-50 animate-in slide-in-from-bottom-5 duration-200 border border-slate-700">
          <Info className="w-5 h-5 text-blue-400" />
          <span>{infoToast}</span>
        </div>
      )}
    </div>
  );
};
