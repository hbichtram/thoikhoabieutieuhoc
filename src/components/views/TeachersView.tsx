import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  UserCheck,
  X,
  AlertCircle,
  AlertTriangle,
  Eye,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  FileText,
  Calendar,
  Upload,
} from 'lucide-react';
import { Teacher, Subject, ClassItem, Assignment, ScheduleCell, DayOfWeek, PeriodShift, UnavailableSlot } from '../../types';
import {
  calculateTeacherWeeklyPeriods,
  getTeacherMaxWeeklyPeriods,
  getTeacherAssignedClasses,
  getTeacherClassCount,
  getTeacherAssignedSubjects,
  checkTeacherWeeklyLimit,
  getTeacherStatsSummary,
  checkTeacherSessionLimit,
  getTeacherGapPeriods,
  getTeacherMaxSessionsPerWeek,
  normalizeTeacher,
} from '../../utils/teacherUtils';
import { ImportTeachersModal } from '../modals/ImportTeachersModal';

interface TeachersViewProps {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassItem[];
  assignments: Assignment[];
  cells: ScheduleCell[];
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onBatchSetTeachers?: (teachers: Teacher[]) => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  subjects,
  classes,
  assignments,
  cells,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onBatchSetTeachers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'homeroom' | 'subject' | 'unassigned' | 'assigned' | 'exceeded'
  >('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Unavailable Slot Matrix Modal state
  const [unavailableModalTeacher, setUnavailableModalTeacher] = useState<Teacher | null>(null);
  const [newReasonInput, setNewReasonInput] = useState<Record<string, string>>({});

  // View Assignments Modal state
  const [viewAssignmentsTeacher, setViewAssignmentsTeacher] = useState<Teacher | null>(null);

  // Delete Blocked Modal state
  const [deleteBlockedInfo, setDeleteBlockedInfo] = useState<{
    type: 'assignments' | 'timetable';
    teacherName: string;
    teacherCode: string;
    assignmentCount: number;
    periodCount: number;
    cellCount: number;
  } | null>(null);

  // Delete Confirm Modal state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Teacher | null>(null);

  // Success Toast state
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'homeroom' | 'subject'>('subject');
  const [mainSubjectId, setMainSubjectId] = useState('');
  const [homeroomClassId, setHomeroomClassId] = useState('');
  const [maxWeeklyPeriods, setMaxWeeklyPeriods] = useState<number>(23);
  const [maxSessionsPerWeek, setMaxSessionsPerWeek] = useState<number>(6);
  const [maxPeriodsPerDay, setMaxPeriodsPerDay] = useState(4);
  const [notes, setNotes] = useState('');

  // Handle Type Change in Form
  const handleTypeChange = (newType: 'homeroom' | 'subject') => {
    setType(newType);
    if (newType === 'homeroom') {
      setMaxWeeklyPeriods(20);
    } else {
      setMaxWeeklyPeriods(23);
    }
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setCode(`GV0${teachers.length + 1}`);
    setName('');
    setType('subject');
    setMainSubjectId(subjects[0]?.id || '');
    setHomeroomClassId('');
    setMaxWeeklyPeriods(23);
    setMaxSessionsPerWeek(6);
    setMaxPeriodsPerDay(4);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setCode(t.code);
    setName(t.name);
    setType(t.type);
    setMainSubjectId(t.mainSubjectId || '');
    setHomeroomClassId(t.homeroomClassId || '');
    setMaxWeeklyPeriods(getTeacherMaxWeeklyPeriods(t));
    setMaxSessionsPerWeek(getTeacherMaxSessionsPerWeek(t));
    setMaxPeriodsPerDay(t.maxPeriodsPerDay);
    setNotes(t.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Ensure valid maxSessionsPerWeek between 1 and 7
    const validMaxSessions = Math.min(7, Math.max(1, maxSessionsPerWeek || 6));

    if (editingTeacher) {
      const updated = normalizeTeacher({
        ...editingTeacher,
        code,
        name,
        type,
        mainSubjectId: type === 'subject' ? (mainSubjectId || '') : '',
        homeroomClassId: type === 'homeroom' ? (homeroomClassId || '') : '',
        maxWeeklyPeriods,
        maxSessionsPerWeek: validMaxSessions,
        maxPeriodsPerDay,
        notes: notes || '',
      });
      onUpdateTeacher(updated);
    } else {
      const newTeacher = normalizeTeacher({
        id: `t_${Date.now()}`,
        code,
        name,
        type,
        mainSubjectId: type === 'subject' ? (mainSubjectId || '') : '',
        homeroomClassId: type === 'homeroom' ? (homeroomClassId || '') : '',
        maxWeeklyPeriods,
        maxSessionsPerWeek: validMaxSessions,
        maxPeriodsPerDay,
        notes: notes || '',
        unavailableSlots: [],
      });
      onAddTeacher(newTeacher);
    }
    setIsModalOpen(false);
  };

  // Safe Delete Handler
  const handleDeleteClick = (t: Teacher) => {
    const isTeacherMatch = (teacher: Teacher, targetIdOrCode?: string) => {
      if (!targetIdOrCode || !teacher) return false;
      const target = targetIdOrCode.trim().toLowerCase();
      const tId = (teacher.id || '').trim().toLowerCase();
      const tCode = (teacher.code || '').trim().toLowerCase();
      const tName = (teacher.name || '').trim().toLowerCase();
      return target === tId || target === tCode || target === tName;
    };

    // 1. Find related assignments
    const relatedAssignments = assignments.filter(
      (a) => isTeacherMatch(t, a.teacherId) || a.teacherId === t.id || a.teacherId === t.code
    );
    const totalAssignedPeriods = relatedAssignments.reduce(
      (sum, a) => sum + (a.periodsPerWeek || 0),
      0
    );

    // 2. Find related schedule cells in TKB
    const relatedAssignmentIds = new Set(relatedAssignments.map((a) => a.id));
    const relatedSchedules = cells.filter(
      (c) =>
        isTeacherMatch(t, c.teacherId) ||
        c.teacherId === t.id ||
        c.teacherId === t.code ||
        (c.assignmentId && relatedAssignmentIds.has(c.assignmentId))
    );

    console.log("Deleting teacher:", t.id, t.name, t.code);
    console.log("Remaining assignments:", relatedAssignments.length, relatedAssignments);
    console.log("Remaining schedules:", relatedSchedules.length, relatedSchedules);

    // CASE 1: Still has assignments -> Block
    if (relatedAssignments.length > 0) {
      setDeleteBlockedInfo({
        type: 'assignments',
        teacherName: t.name,
        teacherCode: t.code,
        assignmentCount: relatedAssignments.length,
        periodCount: totalAssignedPeriods,
        cellCount: relatedSchedules.length,
      });
      return;
    }

    // CASE 2: No assignments, BUT still used in timetable (cells) -> Block
    if (relatedSchedules.length > 0) {
      setDeleteBlockedInfo({
        type: 'timetable',
        teacherName: t.name,
        teacherCode: t.code,
        assignmentCount: 0,
        periodCount: 0,
        cellCount: relatedSchedules.length,
      });
      return;
    }

    // CASE 3: Completely unlinked -> Open confirmation modal
    setDeleteConfirmTarget(t);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    const target = deleteConfirmTarget;

    console.log("Confirming deletion for teacher:", target.id, target.name, target.code);

    onDeleteTeacher(target.id);

    setDeleteConfirmTarget(null);
    setSuccessToast(`✅ Đã xóa giáo viên ${target.name} (${target.code}) thành công.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Toggle slot in Unavailable modal
  const toggleUnavailableSlot = (day: DayOfWeek, shift: PeriodShift, periodNumber: number) => {
    if (!unavailableModalTeacher) return;

    const exists = unavailableModalTeacher.unavailableSlots.some(
      (s) => s.day === day && s.shift === shift && s.periodNumber === periodNumber
    );

    let updatedSlots: UnavailableSlot[];
    const key = `${day}_${shift}_${periodNumber}`;
    const reason = newReasonInput[key] || '';

    if (exists) {
      updatedSlots = unavailableModalTeacher.unavailableSlots.filter(
        (s) => !(s.day === day && s.shift === shift && s.periodNumber === periodNumber)
      );
    } else {
      updatedSlots = [
        ...unavailableModalTeacher.unavailableSlots,
        { day, shift, periodNumber, reason: reason || 'Bận việc riêng' },
      ];
    }

    const updated = { ...unavailableModalTeacher, unavailableSlots: updatedSlots };
    setUnavailableModalTeacher(updated);
    onUpdateTeacher(updated);
  };

  // Statistics Summary
  const statsSummary = getTeacherStatsSummary(teachers, assignments);

  // Filtered List
  const filteredTeachers = teachers.filter((t) => {
    const assignedPeriods = calculateTeacherWeeklyPeriods(t.id, assignments);
    const maxPeriods = getTeacherMaxWeeklyPeriods(t);
    const mainSub = subjects.find((s) => s.id === t.mainSubjectId);
    const homeroomCls = classes.find((c) => c.id === t.homeroomClassId || c.homeroomTeacherId === t.id);
    const assignedClasses = getTeacherAssignedClasses(t.id, assignments, classes);

    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mainSub && mainSub.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (homeroomCls && homeroomCls.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      assignedClasses.some((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesFilter = true;
    if (filterType === 'homeroom') matchesFilter = t.type === 'homeroom';
    if (filterType === 'subject') matchesFilter = t.type === 'subject';
    if (filterType === 'unassigned') matchesFilter = assignedPeriods === 0;
    if (filterType === 'assigned') matchesFilter = assignedPeriods > 0;
    if (filterType === 'exceeded') matchesFilter = assignedPeriods > maxPeriods;

    return matchesSearch && matchesFilter;
  });

  const days: DayOfWeek[] = ['T2', 'T3', 'T4', 'T5', 'T6'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            <span>Quản lý Giáo viên</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Quản lý danh sách giáo viên, phân loại GVCN/GV bộ môn, kiểm tra định mức tiết dạy và tiết bận.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsImportExcelOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>⬆ Nhập từ Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Giáo viên</span>
          </button>
        </div>
      </div>

      {/* Real-time Statistics Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Tổng giáo viên</span>
            <span className="text-blue-600 font-bold">👨‍🏫</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{statsSummary.totalTeachers}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Toàn trường</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Có phân công</span>
            <span className="text-emerald-600 font-bold">📋</span>
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{statsSummary.teachersWithAssignments}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Đã gán tiết dạy</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Chưa phân công</span>
            <span className="text-slate-400 font-bold">⚪</span>
          </div>
          <div className="text-xl font-bold text-slate-600 mt-1">{statsSummary.teachersWithoutAssignments}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">0 tiết/tuần</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Tổng tiết đã PC</span>
            <span className="text-purple-600 font-bold">📚</span>
          </div>
          <div className="text-xl font-bold text-purple-600 mt-1">{statsSummary.totalAssignedPeriods}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tiết/tuần toàn trường</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Vượt giới hạn</span>
            <span className="text-red-600 font-bold">🔴</span>
          </div>
          <div className={`text-xl font-bold ${statsSummary.exceededTeachers > 0 ? 'text-red-600' : 'text-emerald-600'} mt-1`}>
            {statsSummary.exceededTeachers}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {statsSummary.exceededTeachers > 0 ? 'Cần điều chỉnh' : 'Tất cả hợp lệ'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên, mã, môn, lớp phụ trách (VD: 4A, Trâm)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium mr-1 hidden sm:inline">Bộ lọc:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({teachers.length})
          </button>

          <button
            onClick={() => setFilterType('homeroom')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'homeroom'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            GV Chủ nhiệm
          </button>

          <button
            onClick={() => setFilterType('subject')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'subject'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            GV Bộ môn
          </button>

          <button
            onClick={() => setFilterType('assigned')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'assigned'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đã có phân công
          </button>

          <button
            onClick={() => setFilterType('unassigned')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'unassigned'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Chưa có phân công
          </button>

          <button
            onClick={() => setFilterType('exceeded')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'exceeded'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Vượt giới hạn ({statsSummary.exceededTeachers})
          </button>
        </div>
      </div>

      {/* Teacher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 text-slate-400">
            Không tìm thấy giáo viên nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredTeachers.map((t) => {
            const assignedPeriods = calculateTeacherWeeklyPeriods(t.id, assignments);
            const maxPeriods = getTeacherMaxWeeklyPeriods(t);
            const classCount = getTeacherClassCount(t.id, assignments);
            const limitCheck = checkTeacherWeeklyLimit(t, assignments);
            const unavailableCount = t.unavailableSlots.length;

            // Find homeroom class if any
            const homeroomCls =
              classes.find((c) => c.id === t.homeroomClassId) ||
              classes.find((c) => c.homeroomTeacherId === t.id);

            // Find main subject
            const mainSub = subjects.find((s) => s.id === t.mainSubjectId);

            // Get assigned subjects
            const assignedSubs = getTeacherAssignedSubjects(t.id, assignments, subjects);

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Card Header: Code, Type Badge, Action Buttons */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                        {t.code}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          t.type === 'homeroom'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {t.type === 'homeroom' ? 'GV Chủ nhiệm' : 'GV Bộ môn'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa thông tin giáo viên"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(t)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa giáo viên"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Teacher Name & Subject/Homeroom Info */}
                  <div className="pt-2">
                    <h3 className="font-bold text-slate-900 text-base">{t.name}</h3>

                    {t.type === 'homeroom' ? (
                      <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                        <div className="font-semibold text-purple-800">
                          GVCN: {homeroomCls ? `Lớp ${homeroomCls.name}` : 'Chưa gán lớp'}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          📚 Môn/nhóm môn:{' '}
                          {assignedSubs.length > 0
                            ? assignedSubs.map((s) => s.name).join(', ')
                            : 'Theo phân công'}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800">
                          Môn phụ trách: {mainSub ? mainSub.name : 'Chưa chọn'}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          👥 Số lớp phụ trách: {classCount} lớp
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Statistics & Constraints List */}
                  {(() => {
                    const sessionCheck = checkTeacherSessionLimit(t, cells);
                    const gapCount = getTeacherGapPeriods(t.id, cells);
                    const maxSessions = getTeacherMaxSessionsPerWeek(t);
                    return (
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <span>📚</span> Phân công (Tham chiếu):
                          </span>
                          <span className="font-bold text-slate-900">
                            {assignedPeriods}/{maxPeriods} tiết
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <span>📅</span> Số buổi TKB (Cứng):
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${sessionCheck.badgeClass}`}>
                            {sessionCheck.count}/{maxSessions} buổi
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <span>☕</span> Tiết trống TKB:
                          </span>
                          <span className={`font-bold ${gapCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {gapCount > 0 ? `${gapCount} tiết` : '0 tiết (Tối ưu)'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <span>👥</span> Số lớp phụ trách:
                          </span>
                          <span className="font-semibold text-slate-800">{classCount} lớp</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <span>🔒</span> Không thể dạy:
                          </span>
                          <span className="font-semibold text-slate-800">{unavailableCount} tiết</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Status Badge & Action Button */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${limitCheck.badgeClass}`}
                    >
                      {limitCheck.label}
                    </span>

                    <button
                      onClick={() => setUnavailableModalTeacher(t)}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Sửa tiết bận ({unavailableCount})</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setViewAssignmentsTeacher(t)}
                    className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem phân công</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit Teacher */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in duration-200 overflow-hidden">
            {/* Header (Cố định ở trên) */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0 bg-white z-10">
              <h3 className="font-bold text-slate-900 text-base">
                {editingTeacher ? 'Sửa thông tin Giáo viên' : 'Thêm Giáo viên mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form & Scrollable Content & Fixed Footer */}
            <form onSubmit={handleSaveForm} className="flex flex-col min-h-0 flex-1">
              {/* Form Content (Cho phép cuộn dọc) */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Mã giáo viên</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Loại giáo viên</label>
                    <select
                      value={type}
                      onChange={(e) => handleTypeChange(e.target.value as 'homeroom' | 'subject')}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="subject">Giáo viên bộ môn (Max 23 tiết/tuần)</option>
                      <option value="homeroom">Giáo viên chủ nhiệm (Max 20 tiết/tuần)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Cô Trâm, Cô Lan..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                {type === 'homeroom' ? (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Lớp chủ nhiệm</label>
                    <select
                      value={homeroomClassId}
                      onChange={(e) => setHomeroomClassId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">-- Chọn lớp chủ nhiệm --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.name} (Khối {c.grade})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Môn phụ trách chính</label>
                    <select
                      value={mainSubjectId}
                      onChange={(e) => setMainSubjectId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">-- Chọn môn phụ trách --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.shortName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Định mức tiết/tuần
                    </label>
                    <div className="w-full p-2 bg-slate-100/90 border border-slate-200 rounded-lg font-bold text-blue-700 flex items-center justify-between">
                      <span>{maxWeeklyPeriods} tiết/tuần</span>
                      <span className="text-[10px] font-normal text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {type === 'homeroom' ? 'GVCN' : 'Bộ môn'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Định mức tham chiếu theo loại giáo viên
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Tối đa tiết / ngày</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxPeriodsPerDay}
                      onChange={(e) => setMaxPeriodsPerDay(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Mặc định: 4 tiết/ngày</span>
                  </div>
                </div>

                {/* Number of Max Sessions / Week */}
                <div>
                  <label className="block font-semibold text-indigo-900 mb-1">
                    Số buổi tối đa / tuần (RÀNG BUỘC CỨNG khi xếp TKB)
                  </label>
                  <select
                    value={maxSessionsPerWeek}
                    onChange={(e) => setMaxSessionsPerWeek(Number(e.target.value))}
                    className="w-full p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>
                        {num} buổi / tuần {num === 7 ? '(Cho phép xuất hiện tối đa 7 buổi)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-600 mt-1.5 block font-medium">
                    💡 Ràng buộc cứng: Giáo viên không được xếp quá {maxSessionsPerWeek} buổi/tuần.
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Ghi chú</label>
                  <textarea
                    rows={2}
                    placeholder="Nhập ghi chú thêm nếu có..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Footer (Cố định ở dưới) */}
              <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2 flex-shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-white transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-sm transition-colors"
                >
                  {editingTeacher ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Assignments [Xem Phân Công] */}
      {viewAssignmentsTeacher && (() => {
        const t = viewAssignmentsTeacher;
        const teacherAssignments = assignments.filter((a) => a.teacherId === t.id);
        const assignedPeriods = calculateTeacherWeeklyPeriods(t.id, assignments);
        const maxPeriods = getTeacherMaxWeeklyPeriods(t);
        const classCount = getTeacherClassCount(t.id, assignments);
        const limitCheck = checkTeacherWeeklyLimit(t, assignments);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    PHÂN CÔNG CHUYÊN MÔN – {t.name.toUpperCase()}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Mã: <span className="font-semibold text-slate-800">{t.code}</span> | Loại:{' '}
                    <span className="font-semibold text-slate-800">
                      {t.type === 'homeroom' ? 'GV Chủ nhiệm' : 'GV Bộ môn'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setViewAssignmentsTeacher(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Assignments Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-2.5 pl-4">Lớp</th>
                      <th className="p-2.5">Môn học</th>
                      <th className="p-2.5 text-right pr-4">Số tiết / tuần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teacherAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-400">
                          Giáo viên này chưa có bất kỳ phân công chuyên môn nào.
                        </td>
                      </tr>
                    ) : (
                      teacherAssignments.map((a) => {
                        const cls = classes.find((c) => c.id === a.classId);
                        const sub = subjects.find((s) => s.id === a.subjectId);
                        return (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="p-2.5 pl-4 font-bold text-indigo-700">
                              {cls ? `Lớp ${cls.name}` : 'N/A'}
                            </td>
                            <td className="p-2.5">
                              {sub ? (
                                <span
                                  className="px-2 py-0.5 rounded text-white font-semibold text-[11px] inline-block"
                                  style={{ backgroundColor: sub.color }}
                                >
                                  {sub.name}
                                </span>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="p-2.5 text-right pr-4 font-bold text-slate-900">
                              {a.periodsPerWeek} tiết
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tổng số lớp phụ trách:</span>
                  <span className="font-bold text-slate-900">{classCount} lớp</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tổng số tiết đã phân công:</span>
                  <span className="font-extrabold text-blue-700">
                    {assignedPeriods}/{maxPeriods} tiết/tuần
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Trạng thái định mức:</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${limitCheck.badgeClass}`}>
                    {limitCheck.label}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  onClick={() => setViewAssignmentsTeacher(null)}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 text-xs shadow-md"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Configure Unavailable Slots Matrix */}
      {unavailableModalTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Các Tiết Giáo Viên Không Thể Dạy</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Giáo viên: <span className="font-bold text-slate-800">{unavailableModalTeacher.name}</span> ({unavailableModalTeacher.code})
                </p>
              </div>
              <button
                onClick={() => setUnavailableModalTeacher(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Bấm vào các ô tiết bên dưới để bật/tắt trạng thái 🔒 <b>BẬN/KHÔNG THỂ DẠY</b>. Hệ thống TKB sẽ không bao giờ xếp giáo viên vào các tiết đã khóa này.
              </span>
            </div>

            {/* Matrix T2-T6 x Periods Morning/Afternoon */}
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200">Buổi / Tiết</th>
                    {days.map((day) => (
                      <th key={day} className="p-2 border-r border-slate-200">
                        THỨ {day.replace('T', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Morning Periods 1..5 */}
                  <tr className="bg-blue-50/50 font-bold text-slate-700 text-left">
                    <td colSpan={6} className="px-3 py-1 bg-blue-100/60 text-blue-900 text-[11px] uppercase">
                      Buổi Sáng
                    </td>
                  </tr>
                  {[1, 2, 3, 4, 5].map((pNum) => (
                    <tr key={`m_${pNum}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-2 font-medium text-slate-600 border-r border-slate-200 bg-slate-50">
                        Tiết {pNum}
                      </td>
                      {days.map((day) => {
                        const isLocked = unavailableModalTeacher.unavailableSlots.some(
                          (s) => s.day === day && s.shift === 'morning' && s.periodNumber === pNum
                        );
                        return (
                          <td key={day} className="p-1.5 border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() => toggleUnavailableSlot(day, 'morning', pNum)}
                              className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                                isLocked
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>BẬN</span>
                                </>
                              ) : (
                                <span>Có thể dạy</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Afternoon Periods 1..5 */}
                  <tr className="bg-amber-50/50 font-bold text-slate-700 text-left">
                    <td colSpan={6} className="px-3 py-1 bg-amber-100/60 text-amber-900 text-[11px] uppercase">
                      Buổi Chiều
                    </td>
                  </tr>
                  {[1, 2, 3, 4, 5].map((pNum) => (
                    <tr key={`a_${pNum}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-2 font-medium text-slate-600 border-r border-slate-200 bg-slate-50">
                        Tiết {pNum}
                      </td>
                      {days.map((day) => {
                        const isLocked = unavailableModalTeacher.unavailableSlots.some(
                          (s) => s.day === day && s.shift === 'afternoon' && s.periodNumber === pNum
                        );
                        return (
                          <td key={day} className="p-1.5 border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() => toggleUnavailableSlot(day, 'afternoon', pNum)}
                              className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                                isLocked
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>BẬN</span>
                                </>
                              ) : (
                                <span>Có thể dạy</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* List Table of Unavailable Slots */}
            {unavailableModalTeacher.unavailableSlots.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Danh sách tiết bận ({unavailableModalTeacher.unavailableSlots.length} tiết)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="p-2 pl-3">Thứ</th>
                        <th className="p-2">Buổi / Tiết</th>
                        <th className="p-2">Lý do</th>
                        <th className="p-2 text-right pr-3">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unavailableModalTeacher.unavailableSlots.map((slot, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 pl-3 font-bold text-blue-700">
                            Thứ {slot.day.replace('T', '')}
                          </td>
                          <td className="p-2 font-medium">
                            Buổi {slot.shift === 'morning' ? 'Sáng' : 'Chiều'} - Tiết {slot.periodNumber}
                          </td>
                          <td className="p-2 text-slate-600 italic">
                            {slot.reason || 'Bận việc riêng'}
                          </td>
                          <td className="p-2 text-right pr-3">
                            <button
                              type="button"
                              onClick={() => toggleUnavailableSlot(slot.day, slot.shift, slot.periodNumber)}
                              className="text-red-600 hover:text-red-800 font-semibold text-[11px] underline"
                            >
                              Bỏ khóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setUnavailableModalTeacher(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 text-xs shadow-md"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-xs">{successToast}</span>
        </div>
      )}

      {/* Delete Blocked Modal */}
      {deleteBlockedInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div
                className={`p-2.5 rounded-xl ${
                  deleteBlockedInfo.type === 'assignments' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}
              >
                {deleteBlockedInfo.type === 'assignments' ? (
                  <AlertOctagon className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Không thể xóa giáo viên</h3>
                <p className="text-xs text-red-600 font-medium">
                  {deleteBlockedInfo.type === 'assignments'
                    ? 'Giáo viên đang có phân công chuyên môn'
                    : 'Giáo viên vẫn đang xuất hiện trong thời khóa biểu'}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-red-50/80 p-3.5 rounded-xl border border-red-200 space-y-2">
              {deleteBlockedInfo.type === 'assignments' ? (
                <>
                  <p>
                    Giáo viên <span className="font-bold text-slate-900">{deleteBlockedInfo.teacherName}</span> ({deleteBlockedInfo.teacherCode}) đang có{' '}
                    <span className="font-bold text-red-700">{deleteBlockedInfo.assignmentCount} phân công chuyên môn</span> với tổng cộng{' '}
                    <span className="font-bold text-red-700">{deleteBlockedInfo.periodCount} tiết/tuần</span>.
                  </p>
                  <p className="font-medium text-slate-600">
                    Vui lòng hủy tất cả phân công của giáo viên này trong trang "Phân công chuyên môn" trước khi xóa giáo viên.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    ⚠️ Giáo viên <span className="font-bold text-slate-900">{deleteBlockedInfo.teacherName}</span> ({deleteBlockedInfo.teacherCode}) không còn phân công chuyên môn, nhưng vẫn đang xuất hiện trong thời khóa biểu (<span className="font-bold text-red-700">{deleteBlockedInfo.cellCount} tiết</span>).
                  </p>
                  <p className="font-medium text-slate-600">
                    Vui lòng xử lý TKB (xóa hoặc thay thế tiết học của giáo viên trong TKB) trước khi xóa giáo viên.
                  </p>
                </>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDeleteBlockedInfo(null)}
                className="px-5 py-2 bg-slate-800 text-white font-semibold rounded-xl text-xs hover:bg-slate-700 shadow-md"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">XÓA GIÁO VIÊN</h3>
                <p className="text-xs text-slate-500 font-medium">Xác nhận xóa tài khoản giáo viên khỏi hệ thống</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Giáo viên:</span>
                <span className="font-bold text-slate-900">{deleteConfirmTarget.name} ({deleteConfirmTarget.code})</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Phân công chuyên môn:</span>
                <span className="font-bold text-emerald-700">0 phân công</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Thời khóa biểu (TKB):</span>
                <span className="font-bold text-emerald-700">0 tiết</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Bạn có chắc chắn muốn xóa giáo viên <span className="font-bold text-slate-900">{deleteConfirmTarget.name}</span>? Thao tác này không thể hoàn tác.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 border border-slate-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa giáo viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <ImportTeachersModal
        isOpen={isImportExcelOpen}
        onClose={() => setIsImportExcelOpen(false)}
        existingTeachers={teachers}
        classes={classes}
        subjects={subjects}
        onImportTeachers={(newTeachers, updatedTeachers, importedCount, skippedCount) => {
          if (onBatchSetTeachers) {
            onBatchSetTeachers(updatedTeachers);
          } else {
            newTeachers.forEach((t) => onAddTeacher(t));
          }
          alert(`✅ Nhập dữ liệu thành công!\n- Đã thêm/cập nhật: ${importedCount} giáo viên.\n- Bỏ qua: ${skippedCount} giáo viên.`);
        }}
      />
    </div>
  );
};
