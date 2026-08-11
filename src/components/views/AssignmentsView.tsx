import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ClipboardList, Filter, X, AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Assignment, Teacher, ClassItem, Subject, ScheduleCell } from '../../types';
import {
  calculateTeacherWeeklyPeriods,
  getTeacherMaxWeeklyPeriods,
  checkTeacherWeeklyLimit,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  // Deletion Modal States
  const [deleteWarningInfo, setDeleteWarningInfo] = useState<{
    teacherName: string;
    className: string;
    subjectName: string;
    cellCount: number;
  } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Assignment | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State for Edit Single Assignment
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(2);

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const openEditModal = (a: Assignment) => {
    setEditingAssignment(a);
    setTeacherId(a.teacherId);
    setSubjectId(a.subjectId);
    setClassId(a.classId);
    setPeriodsPerWeek(a.periodsPerWeek);
  };

  const handleBatchAddAssignments = (newAssignments: Assignment[], summaryText: string) => {
    if (onBatchSetAssignments) {
      onBatchSetAssignments([...assignments, ...newAssignments]);
    } else {
      newAssignments.forEach((a) => onAddAssignment(a));
    }
    setSuccessToast(summaryText);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handleInitiateDelete = (a: Assignment) => {
    const tch = teachers.find((t) => t.id === a.teacherId);
    const cls = classes.find((c) => c.id === a.classId);
    const sub = subjects.find((s) => s.id === a.subjectId);

    const teacherName = tch ? tch.name : 'Chưa rõ';
    const className = cls ? cls.name : 'Chưa rõ';
    const subjectName = sub ? sub.name : 'Chưa rõ';

    // Check if assignment is already used in Timetable (cells)
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

  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    const targetId = deleteConfirmTarget.id;

    onDeleteAssignment(targetId);

    setDeleteConfirmTarget(null);
    setSuccessToast('✅ Đã xóa phân công.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Filtered List
  const filteredAssignments = assignments.filter((a) => {
    const tch = teachers.find((t) => t.id === a.teacherId);
    const cls = classes.find((c) => c.id === a.classId);
    const sub = subjects.find((s) => s.id === a.subjectId);

    const matchSearch =
      (tch?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchTeacher = selectedTeacherId === 'all' || a.teacherId === selectedTeacherId;
    const matchClass = selectedClassId === 'all' || a.classId === selectedClassId;
    const matchSubject = selectedSubjectId === 'all' || a.subjectId === selectedSubjectId;

    return matchSearch && matchTeacher && matchClass && matchSubject;
  });

  // Calculate totals per teacher
  const teacherTotals = new Map<string, number>();
  assignments.forEach((a) => {
    teacherTotals.set(a.teacherId, (teacherTotals.get(a.teacherId) || 0) + a.periodsPerWeek);
  });

  // Calculate totals per class
  const classTotals = new Map<string, number>();
  assignments.forEach((a) => {
    classTotals.set(a.classId, (classTotals.get(a.classId) || 0) + a.periodsPerWeek);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-600" />
            <span>Phân công Chuyên môn</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Gán phân công giảng dạy giữa Giáo viên - Môn học - Lớp học và số tiết trong tuần.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>⬆ Nhập từ Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Phân công mới</span>
          </button>
        </div>
      </div>

      {/* Teacher & Class Workload Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Summary per Teacher */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Tổng tiết theo Giáo viên</span>
            <span className="text-purple-600 font-semibold">{teachers.length} giáo viên</span>
          </h3>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
            {teachers.map((t) => {
              const totalP = calculateTeacherWeeklyPeriods(t.id, assignments);
              const maxP = getTeacherMaxWeeklyPeriods(t);
              const isExceeded = totalP > maxP;
              const isUnder = totalP < maxP;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTeacherId(selectedTeacherId === t.id ? 'all' : t.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                    selectedTeacherId === t.id
                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                      : isExceeded
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-bold'
                      : isUnder
                      ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 font-bold'
                  }`}
                >
                  {t.name}:{' '}
                  <span className="font-bold">
                    {totalP}/{maxP} tiết
                  </span>
                  {isExceeded && ' 🟠'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary per Class */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Tổng tiết theo Lớp</span>
            <span className="text-indigo-600 font-semibold">{classes.length} lớp học</span>
          </h3>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
            {classes.map((c) => {
              const totalP = classTotals.get(c.id) || 0;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClassId(selectedClassId === c.id ? 'all' : c.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                    selectedClassId === c.id
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  Lớp {c.name}: <span className="font-bold">{totalP} tiết</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo GV, Lớp, Môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Lọc Giáo viên:</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Tất cả giáo viên</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Tất cả lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Môn:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="all">Tất cả môn</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {(selectedTeacherId !== 'all' || selectedClassId !== 'all' || selectedSubjectId !== 'all') && (
            <button
              onClick={() => {
                setSelectedTeacherId('all');
                setSelectedClassId('all');
                setSelectedSubjectId('all');
              }}
              className="text-purple-600 font-medium hover:underline text-xs"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Table of Assignments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <th className="p-3.5 pl-5">Giáo viên</th>
              <th className="p-3.5">Môn học</th>
              <th className="p-3.5">Lớp</th>
              <th className="p-3.5">Số tiết / tuần</th>
              <th className="p-3.5 text-right pr-5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Không tìm thấy phân công chuyên môn nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredAssignments.map((a) => {
                const tch = teachers.find((t) => t.id === a.teacherId);
                const cls = classes.find((c) => c.id === a.classId);
                const sub = subjects.find((s) => s.id === a.subjectId);

                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 pl-5 font-bold text-slate-900">
                      {tch ? tch.name : 'N/A'}
                    </td>

                    <td className="p-3.5">
                      {sub ? (
                        <span
                          className="px-2.5 py-1 rounded-md text-white font-semibold text-[11px] shadow-sm inline-block"
                          style={{ backgroundColor: sub.color }}
                        >
                          {sub.name} ({sub.shortName})
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>

                    <td className="p-3.5 font-bold text-indigo-700">
                      {cls ? `Lớp ${cls.name}` : 'N/A'}
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {a.periodsPerWeek} tiết/tuần
                      </span>
                    </td>

                    <td className="p-3.5 text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(a)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Sửa phân công"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInitiateDelete(a)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa phân công"
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
        const currentOtherAssigned = assignments
          .filter((a) => a.teacherId === teacherId && a.id !== editingAssignment.id)
          .reduce((sum, a) => sum + a.periodsPerWeek, 0);
        const maxW = selTeacher ? getTeacherMaxWeeklyPeriods(selTeacher) : 23;
        const totalAfterAdding = currentOtherAssigned + (periodsPerWeek || 0);
        const isExceeded = totalAfterAdding > maxW;
        const overflow = totalAfterAdding - maxW;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">
                  Sửa Phân công Chuyên môn
                </h3>
                <button
                  onClick={() => setEditingAssignment(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
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
                  setSuccessToast('✅ Đã cập nhật phân công.');
                  setTimeout(() => setSuccessToast(null), 3000);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giáo viên giảng dạy</label>
                  <select
                    required
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    {teachers.map((t) => {
                      const cur = calculateTeacherWeeklyPeriods(t.id, assignments);
                      const max = getTeacherMaxWeeklyPeriods(t);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code}) – Đã PC: {cur}/{max} tiết
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Môn học</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      const sub = subjects.find((s) => s.id === e.target.value);
                      if (sub) setPeriodsPerWeek(sub.defaultPeriodsPerWeek);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.defaultPeriodsPerWeek} tiết/tuần)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Lớp học</label>
                  <select
                    required
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name} (Khối {c.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Số tiết phân công / tuần</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={periodsPerWeek}
                    onChange={(e) => setPeriodsPerWeek(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                {/* Exceeded Limit Warning Box */}
                {isExceeded && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                    <div className="font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>🟠 CẢNH BÁO VƯỢT ĐỊNH MỨC TIẾT DẠY</span>
                    </div>
                    <div>
                      Giáo viên hiện có: <b>{currentOtherAssigned} tiết/tuần</b>
                    </div>
                    <div>
                      Số tiết sửa: <b>{periodsPerWeek} tiết</b>
                    </div>
                    <div>
                      Sau khi sửa:{' '}
                      <b className="text-amber-900 font-extrabold">
                        {totalAfterAdding}/{maxW} tiết/tuần
                      </b>{' '}
                      (Dư <b className="text-amber-900">{overflow} tiết</b> so với định mức {maxW} tiết)
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 shadow-md"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Warning Modal when Assignment is already used in Timetable */}
      {deleteWarningInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">⚠️ KHÔNG THỂ XÓA PHÂN CÔNG</h3>
                <p className="text-slate-500 text-xs">Phân công đã được sử dụng trong thời khóa biểu</p>
              </div>
            </div>

            <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
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
                Vui lòng xử lý các tiết trong thời khóa biểu trước khi xóa phân công.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDeleteWarningInfo(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md"
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 text-slate-900">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa phân công</h3>
                  <p className="text-slate-500 text-xs">Bạn có chắc chắn muốn xóa phân công này không?</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
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
                  <span className="text-slate-600">Số tiết:</span>
                  <span className="text-purple-700">{deleteConfirmTarget.periodsPerWeek} tiết/tuần</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-500 shadow-md transition-all"
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
