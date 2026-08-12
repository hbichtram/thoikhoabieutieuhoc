import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Upload,
  UserCheck,
  BookOpen,
  School,
  X,
  User,
  Clock,
  Layers,
} from 'lucide-react';
import { Assignment, Teacher, ClassItem, Subject, ScheduleCell } from '../../types';
import {
  calculateTeacherWeeklyPeriods,
  getTeacherMaxWeeklyPeriods,
  getTeacherMaxSessionsPerWeek,
  getTeacherSessions,
} from '../../utils/teacherUtils';
import { ImportAssignmentsModal } from '../modals/ImportAssignmentsModal';
import { AddAssignmentModal } from '../modals/AddAssignmentModal';

interface AssignmentsViewProps {
  assignments: Assignment[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  cells?: ScheduleCell[];
  onAddAssignment: (a: Assignment) => void;
  onUpdateAssignment: (a: Assignment) => void;
  onDeleteAssignment: (id: string) => void;
  onBatchSetAssignments?: (assignments: Assignment[]) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments,
  teachers,
  classes,
  subjects,
  cells = [],
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onBatchSetAssignments,
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  // Deletion Confirmation & Warning Modals
  const [deleteWarningInfo, setDeleteWarningInfo] = useState<{
    teacherName: string;
    className: string;
    subjectName: string;
    cellCount: number;
  } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Assignment | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State for Single Assignment Edit Modal
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(2);
  const [editNotes, setEditNotes] = useState('');

  // Total weekly periods across all assignments
  const totalWeeklyPeriods = useMemo(() => {
    return assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);
  }, [assignments]);

  // Helper map for class period totals
  const classTotals = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((a) => {
      map.set(a.classId, (map.get(a.classId) || 0) + a.periodsPerWeek);
    });
    return map;
  }, [assignments]);

  // Teacher workload metrics
  const teacherMetrics = useMemo(() => {
    return teachers.map((t) => {
      const assignedPeriods = calculateTeacherWeeklyPeriods(t.id, assignments);
      const referenceQuota = getTeacherMaxWeeklyPeriods(t);
      const usedSessions = getTeacherSessions(t.id, cells).size;
      const maxSessions = getTeacherMaxSessionsPerWeek(t);

      const isExcessPeriods = assignedPeriods > referenceQuota;
      const isUnderPeriods = assignedPeriods < referenceQuota;
      const isAtMaxSessions = usedSessions === maxSessions;
      const isExceededSessions = usedSessions > maxSessions;
      const hasWarning = isExcessPeriods || isExceededSessions;

      return {
        teacher: t,
        assignedPeriods,
        referenceQuota,
        usedSessions,
        maxSessions,
        isExcessPeriods,
        isUnderPeriods,
        isAtMaxSessions,
        isExceededSessions,
        hasWarning,
        diffPeriods: assignedPeriods - referenceQuota,
      };
    });
  }, [teachers, assignments, cells]);

  // Overall Warning count
  const warningCount = useMemo(() => {
    return teacherMetrics.filter((m) => m.hasWarning).length;
  }, [teacherMetrics]);

  // Open Edit Modal
  const openEditModal = (a: Assignment) => {
    setEditingAssignment(a);
    setTeacherId(a.teacherId);
    setSubjectId(a.subjectId);
    setClassId(a.classId);
    setPeriodsPerWeek(a.periodsPerWeek);
    setEditNotes('');
  };

  // Batch import callback handler
  const handleBatchAddAssignments = (newAssignments: Assignment[], summaryText: string) => {
    if (onBatchSetAssignments) {
      onBatchSetAssignments([...assignments, ...newAssignments]);
    } else {
      newAssignments.forEach((a) => onAddAssignment(a));
    }
    setSuccessToast(summaryText);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Trigger Delete flow
  const handleInitiateDelete = (a: Assignment) => {
    const tch = teachers.find((t) => t.id === a.teacherId);
    const cls = classes.find((c) => c.id === a.classId);
    const sub = subjects.find((s) => s.id === a.subjectId);

    const teacherName = tch ? tch.name : 'Chưa rõ';
    const className = cls ? cls.name : 'Chưa rõ';
    const subjectName = sub ? sub.name : 'Chưa rõ';

    // Check if assignment is actively used in Timetable
    const matchingCells = cells.filter(
      (cell) =>
        cell.assignmentId === a.id ||
        (cell.teacherId === a.teacherId && cell.classId === a.classId && cell.subjectId === a.subjectId)
    );

    if (matchingCells.length > 0) {
      setDeleteWarningInfo({
        teacherName,
        className,
        subjectName,
        cellCount: matchingCells.length,
      });
      return;
    }

    setDeleteConfirmTarget(a);
  };

  // Confirm Delete Handler
  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    onDeleteAssignment(deleteConfirmTarget.id);
    setDeleteConfirmTarget(null);
    setSuccessToast('✅ Đã xóa phân công chuyên môn.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Filtered Assignments List
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const tch = teachers.find((t) => t.id === a.teacherId);
      const cls = classes.find((c) => c.id === a.classId);
      const sub = subjects.find((s) => s.id === a.subjectId);

      // Search match
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (tch?.name || '').toLowerCase().includes(q) ||
        (cls?.name || '').toLowerCase().includes(q) ||
        (sub?.name || '').toLowerCase().includes(q);

      const matchTeacher = selectedTeacherId === 'all' || a.teacherId === selectedTeacherId;
      const matchClass = selectedClassId === 'all' || a.classId === selectedClassId;
      const matchSubject = selectedSubjectId === 'all' || a.subjectId === selectedSubjectId;

      // Status Filter logic
      let matchStatus = true;
      if (selectedStatusFilter !== 'all' && tch) {
        const metric = teacherMetrics.find((m) => m.teacher.id === tch.id);
        if (metric) {
          if (selectedStatusFilter === 'normal') {
            matchStatus = !metric.isExcessPeriods && !metric.isExceededSessions && !metric.isUnderPeriods;
          } else if (selectedStatusFilter === 'excess') {
            matchStatus = metric.isExcessPeriods;
          } else if (selectedStatusFilter === 'under') {
            matchStatus = metric.isUnderPeriods;
          } else if (selectedStatusFilter === 'max_sessions') {
            matchStatus = metric.isAtMaxSessions;
          } else if (selectedStatusFilter === 'exceeded_sessions') {
            matchStatus = metric.isExceededSessions;
          } else if (selectedStatusFilter === 'warning') {
            matchStatus = metric.hasWarning;
          }
        }
      }

      return matchSearch && matchTeacher && matchClass && matchSubject && matchStatus;
    });
  }, [
    assignments,
    teachers,
    classes,
    subjects,
    searchTerm,
    selectedTeacherId,
    selectedClassId,
    selectedSubjectId,
    selectedStatusFilter,
    teacherMetrics,
  ]);

  const isFilterActive =
    searchTerm !== '' ||
    selectedTeacherId !== 'all' ||
    selectedClassId !== 'all' ||
    selectedSubjectId !== 'all' ||
    selectedStatusFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTeacherId('all');
    setSelectedClassId('all');
    setSelectedSubjectId('all');
    setSelectedStatusFilter('all');
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-4 font-sans bg-slate-50/50 min-h-screen">
      
      {/* 1. HEADER TRANG */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            <span>PHÂN CÔNG CHUYÊN MÔN</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Quản lý giáo viên – môn học – lớp học – số tiết và tải dạy
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Nhập từ Excel</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm phân công</span>
          </button>
        </div>
      </div>

      {/* 2. THANH TỔNG QUAN (Compact Statistics Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Stat 1: Giáo viên */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black text-slate-900 leading-none">{teachers.length}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Giáo viên</span>
          </div>
        </div>

        {/* Stat 2: Môn học */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black text-slate-900 leading-none">{subjects.length}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>Môn học</span>
          </div>
        </div>

        {/* Stat 3: Lớp học */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black text-slate-900 leading-none">{classes.length}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
            <School className="w-3.5 h-3.5 text-blue-600" />
            <span>Lớp học</span>
          </div>
        </div>

        {/* Stat 4: Phân công */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black text-slate-900 leading-none">{assignments.length}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
            <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
            <span>Phân công</span>
          </div>
        </div>

        {/* Stat 5: Tổng tiết/tuần */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1">
          <div className="text-2xl font-black text-indigo-700 leading-none">{totalWeeklyPeriods}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tổng tiết/tuần</span>
          </div>
        </div>
      </div>

      {/* 3. THANH TỔNG TIẾT THEO LỚP */}
      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3 text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
        <span className="font-extrabold text-slate-500 uppercase text-[11px] shrink-0 flex items-center gap-1">
          <span>🏫 Tổng tiết theo lớp:</span>
        </span>
        <div className="flex items-center gap-2">
          {classes.map((c) => {
            const totalP = classTotals.get(c.id) || 0;
            const isSelected = selectedClassId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(selectedClassId === c.id ? 'all' : c.id)}
                className={`px-3 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Lớp {c.name} <span className="font-bold ml-1">{totalP}t</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. THANH TÌM KIẾM + BỘ LỌC */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="🔍 Tìm giáo viên, lớp, môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tất cả GV */}
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 max-w-[160px] truncate cursor-pointer"
          >
            <option value="all">Tất cả GV ▼</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Tất cả lớp */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 max-w-[130px] truncate cursor-pointer"
          >
            <option value="all">Tất cả lớp ▼</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Lớp {c.name}
              </option>
            ))}
          </select>

          {/* Tất cả môn */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 max-w-[140px] truncate cursor-pointer"
          >
            <option value="all">Tất cả môn ▼</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Tất cả trạng thái */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái ▼</option>
            <option value="normal">🟢 Đủ tiết / Bình thường</option>
            <option value="under">🟡 Thiếu tiết định mức</option>
            <option value="excess">🔴 Vượt định mức</option>
            <option value="max_sessions">🟠 Đạt tối đa số buổi</option>
            <option value="exceeded_sessions">🔴 Vượt giới hạn số buổi</option>
            <option value="warning">⚠️ Có cảnh báo ({warningCount})</option>
          </select>

          {/* Clear Filters Button */}
          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200 transition-all text-xs cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 5. BẢNG PHÂN CÔNG CHÍNH */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <th className="p-3.5 pl-5">GIÁO VIÊN</th>
                <th className="p-3.5">MÔN</th>
                <th className="p-3.5">LỚP</th>
                <th className="p-3.5">TIẾT/TUẦN</th>
                <th className="p-3.5">TẢI DẠY</th>
                <th className="p-3.5">TRẠNG THÁI</th>
                <th className="p-3.5 text-right pr-5">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    Không tìm thấy phân công chuyên môn nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const tch = teachers.find((t) => t.id === a.teacherId);
                  const cls = classes.find((c) => c.id === a.classId);
                  const sub = subjects.find((s) => s.id === a.subjectId);

                  // Teacher workload metrics
                  const metric = tch ? teacherMetrics.find((m) => m.teacher.id === tch.id) : null;

                  // Status Badge Logic
                  let statusBadge = (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                      🟢 Đủ tiết
                    </span>
                  );

                  if (metric) {
                    if (metric.isExceededSessions) {
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-800 border border-red-300 inline-flex items-center gap-1">
                          🔴 Vượt {metric.usedSessions - metric.maxSessions} buổi
                        </span>
                      );
                    } else if (metric.isExcessPeriods) {
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-800 border border-red-300 inline-flex items-center gap-1">
                          🔴 Vượt {metric.diffPeriods} tiết
                        </span>
                      );
                    } else if (metric.isUnderPeriods) {
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                          🟡 Thiếu {Math.abs(metric.diffPeriods)} tiết
                        </span>
                      );
                    } else if (metric.isAtMaxSessions) {
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                          🟠 Đạt {metric.usedSessions}/{metric.maxSessions} buổi
                        </span>
                      );
                    }
                  }

                  // Workload Display: e.g. "15/23 tiết"
                  const loadDisplay = metric
                    ? `${metric.assignedPeriods}/${metric.referenceQuota} tiết`
                    : `${a.periodsPerWeek} tiết`;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* GIÁO VIÊN */}
                      <td className="p-3.5 pl-5">
                        <button
                          onClick={() =>
                            setSelectedTeacherId(selectedTeacherId === a.teacherId ? 'all' : a.teacherId)
                          }
                          className="font-bold text-slate-900 hover:text-indigo-600 text-left hover:underline flex items-center gap-1.5 cursor-pointer group"
                          title="Click để lọc tất cả phân công của giáo viên này"
                        >
                          <span>{tch ? tch.name : 'N/A'}</span>
                          <span className="text-[10px] font-semibold text-slate-400 group-hover:text-indigo-500">
                            ({tch?.isHomeroom ? 'GVCN' : 'GVBM'})
                          </span>
                        </button>
                      </td>

                      {/* MÔN */}
                      <td className="p-3.5">
                        {sub ? (
                          <span
                            className="px-2.5 py-1 rounded-lg text-white font-bold text-[11px] shadow-2xs inline-block"
                            style={{ backgroundColor: sub.color || '#3B82F6' }}
                          >
                            {sub.name}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>

                      {/* LỚP */}
                      <td className="p-3.5">
                        <button
                          onClick={() =>
                            setSelectedClassId(selectedClassId === a.classId ? 'all' : a.classId)
                          }
                          className="font-bold text-indigo-700 hover:text-indigo-900 text-xs hover:underline cursor-pointer"
                          title="Click để lọc phân công theo lớp này"
                        >
                          {cls ? `Lớp ${cls.name}` : 'N/A'}
                        </button>
                      </td>

                      {/* TIẾT/TUẦN */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {a.periodsPerWeek} tiết
                        </span>
                      </td>

                      {/* TẢI DẠY */}
                      <td className="p-3.5 font-semibold text-slate-800">
                        <span className="bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-900">
                          {loadDisplay}
                        </span>
                      </td>

                      {/* TRẠNG THÁI */}
                      <td className="p-3.5">{statusBadge}</td>

                      {/* THAO TÁC */}
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(a)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="✏️ Chỉnh sửa phân công"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleInitiateDelete(a)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="🗑️ Xóa phân công"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Assignment Batch Modal */}
      <AddAssignmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        assignments={assignments}
        onAddAssignments={handleBatchAddAssignments}
      />

      {/* Single Assignment Edit Modal */}
      {editingAssignment && (() => {
        const selTeacher = teachers.find((t) => t.id === teacherId);
        const selSubject = subjects.find((s) => s.id === subjectId);
        const currentOtherAssigned = assignments
          .filter((a) => a.teacherId === teacherId && a.id !== editingAssignment.id)
          .reduce((sum, a) => sum + a.periodsPerWeek, 0);
        const referenceQuota = selTeacher ? getTeacherMaxWeeklyPeriods(selTeacher) : 23;
        const totalAfterAdding = currentOtherAssigned + (periodsPerWeek || 0);
        const isExcess = totalAfterAdding > referenceQuota;
        const overflow = totalAfterAdding - referenceQuota;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wide flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                  <span>SỬA PHÂN CÔNG CHUYÊN MÔN</span>
                </h3>
                <button
                  onClick={() => setEditingAssignment(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!teacherId || !subjectId || !classId) return;
                  onUpdateAssignment({
                    ...editingAssignment,
                    teacherId,
                    subjectId,
                    classId,
                    periodsPerWeek,
                  });
                  setEditingAssignment(null);
                  setSuccessToast('✅ Đã cập nhật phân công chuyên môn.');
                  setTimeout(() => setSuccessToast(null), 3000);
                }}
                className="space-y-4 text-xs"
              >
                {/* I. THÔNG TIN GIÁO VIÊN */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-indigo-900">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>I. THÔNG TIN GIÁO VIÊN</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Chọn giáo viên</label>
                    <select
                      required
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 cursor-pointer"
                    >
                      {teachers.map((t) => {
                        const cur = calculateTeacherWeeklyPeriods(t.id, assignments);
                        const max = getTeacherMaxWeeklyPeriods(t);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code || 'GV'}) – Đã PC: {cur}/{max} tiết
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selTeacher && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600">
                      <div>Mã GV: <b className="text-slate-900">{selTeacher.code}</b></div>
                      <div>Loại GV: <b className="text-slate-900">{selTeacher.type === 'homeroom' ? 'GV Chủ nhiệm' : 'GV Bộ môn'}</b></div>
                      <div>Môn chính: <b className="text-indigo-700">{subjects.find(s => s.id === selTeacher.mainSubjectId)?.name || 'Bộ môn'}</b></div>
                      <div>Trạng thái: <b className="text-emerald-700">Đang hoạt động</b></div>
                    </div>
                  )}
                </div>

                {/* II. ĐỊNH MỨC */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-purple-900">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>II. ĐỊNH MỨC GIẢNG DẠY</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-center font-bold">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-normal">Định mức/tuần</div>
                      <div className="text-purple-700 font-extrabold text-sm mt-0.5">{referenceQuota} tiết</div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-normal">Tối đa/ngày</div>
                      <div className="text-slate-900 font-extrabold text-sm mt-0.5">{selTeacher?.maxPeriodsPerDay || 4} tiết</div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-normal">Số buổi tối đa</div>
                      <div className="text-emerald-700 font-extrabold text-sm mt-0.5">{selTeacher?.maxSessionsPerWeek || 6} buổi</div>
                    </div>
                  </div>
                </div>

                {/* III. PHÂN CÔNG */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 text-blue-900">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>III. CHI TIẾT PHÂN CÔNG</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Môn học</label>
                      <select
                        required
                        value={subjectId}
                        onChange={(e) => {
                          setSubjectId(e.target.value);
                          const sub = subjects.find((s) => s.id === e.target.value);
                          if (sub) setPeriodsPerWeek(sub.defaultPeriodsPerWeek);
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 cursor-pointer"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.defaultPeriodsPerWeek}t)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Lớp học</label>
                      <select
                        required
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 cursor-pointer"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            Lớp {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Số tiết phân công / tuần</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={periodsPerWeek}
                      onChange={(e) => setPeriodsPerWeek(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* IV. GHI CHÚ */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú phân công</label>
                  <input
                    type="text"
                    placeholder="Ghi chú thêm (không bắt buộc)..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* Warning / Status Notice */}
                {isExcess ? (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                    <div className="font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>DƯ {overflow} TIẾT SO VỚI ĐỊNH MỨC THAM CHIẾU</span>
                    </div>
                    <div>
                      Tổng tiết sau khi sửa: <b>{totalAfterAdding} tiết/tuần</b> (Định mức tham chiếu: {referenceQuota} tiết)
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px]">
                    Định mức tham chiếu: <b>{referenceQuota} tiết/tuần</b> · Đã gán: <b>{totalAfterAdding} tiết</b>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-2xs cursor-pointer"
                  >
                    Lưu cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Delete Warning Modal (when assignment used in timetable) */}
      {deleteWarningInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-red-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">⚠️ KHÔNG THỂ XÓA PHÂN CÔNG</h3>
                <p className="text-slate-500 text-xs">Phân công đã được sử dụng trong thời khóa biểu</p>
              </div>
            </div>

            <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
              <div className="font-medium">
                <span className="text-slate-500">Giáo viên:</span>{' '}
                <span className="font-bold text-slate-900">{deleteWarningInfo.teacherName}</span>
              </div>
              <div className="font-medium">
                <span className="text-slate-500">Lớp:</span>{' '}
                <span className="font-bold text-indigo-700">Lớp {deleteWarningInfo.className}</span>
              </div>
              <div className="font-medium">
                <span className="text-slate-500">Môn:</span>{' '}
                <span className="font-bold text-slate-900">{deleteWarningInfo.subjectName}</span>
              </div>
              <div className="pt-1 text-red-800 font-semibold border-t border-red-200/60">
                Đang có <span className="font-extrabold text-red-700">{deleteWarningInfo.cellCount} tiết</span> đã xếp trên thời khóa biểu.
              </div>
              <p className="text-slate-500 text-[11px] pt-1">
                Vui lòng xóa các tiết khỏi thời khóa biểu trước khi xóa phân công này.
              </p>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setDeleteWarningInfo(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs shadow-2xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal when Assignment is not in Timetable */}
      {deleteConfirmTarget && (() => {
        const tch = teachers.find((t) => t.id === deleteConfirmTarget.teacherId);
        const cls = classes.find((c) => c.id === deleteConfirmTarget.classId);
        const sub = subjects.find((s) => s.id === deleteConfirmTarget.subjectId);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 text-slate-900">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">XÁC NHẬN XÓA PHÂN CÔNG</h3>
                  <p className="text-slate-500 text-xs">Bạn có chắc chắn muốn xóa phân công này không?</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Giáo viên:</span>
                  <span className="font-bold text-slate-900">{tch ? tch.name : 'Chưa rõ'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lớp:</span>
                  <span className="font-bold text-indigo-700">{cls ? `Lớp ${cls.name}` : 'Chưa rõ'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Môn:</span>
                  <span className="font-bold text-slate-900">{sub ? sub.name : 'Chưa rõ'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <span className="text-slate-600">Số tiết/tuần:</span>
                  <span className="text-indigo-700">{deleteConfirmTarget.periodsPerWeek} tiết/tuần</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 shadow-2xs transition-all cursor-pointer"
                >
                  Xóa phân công
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Import Assignments Modal */}
      <ImportAssignmentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingAssignments={assignments}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        onImportAssignments={(newAssignments, allAssignments, importedCount, skippedCount) => {
          if (onBatchSetAssignments) {
            onBatchSetAssignments(allAssignments);
          } else {
            newAssignments.forEach((a) => onAddAssignment(a));
          }

          let msg = `✅ Đã nhập thành công ${importedCount} phân công chuyên môn từ Excel!`;
          if (skippedCount > 0) {
            msg += ` (Bỏ qua ${skippedCount} phân công trùng)`;
          }
          setSuccessToast(msg);
          setTimeout(() => setSuccessToast(null), 4000);
        }}
      />

      {/* Success Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold z-50 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
};
