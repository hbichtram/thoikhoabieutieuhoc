import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, GraduationCap, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ClassItem, Teacher, Assignment, ScheduleCell } from '../../types';

interface ClassesViewProps {
  classes: ClassItem[];
  teachers: Teacher[];
  assignments: Assignment[];
  cells: ScheduleCell[];
  onAddClass: (cls: ClassItem) => void;
  onUpdateClass: (cls: ClassItem) => void;
  onDeleteClass: (id: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  teachers,
  assignments = [],
  cells = [],
  onAddClass,
  onUpdateClass,
  onDeleteClass,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  // Deletion Modal States
  const [deleteWarningInfo, setDeleteWarningInfo] = useState<{
    type: 'assignments' | 'timetable';
    assignmentCount: number;
    periodCount: number;
    cellCount: number;
    className: string;
  } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ClassItem | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(4);
  const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'both'>('morning');

  const openAddModal = () => {
    setEditingClass(null);
    setName('');
    setGrade(4);
    setHomeroomTeacherId('');
    setShift('morning');
    setIsModalOpen(true);
  };

  const openEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setName(c.name);
    setGrade(c.grade);
    setHomeroomTeacherId(c.homeroomTeacherId || '');
    setShift(c.shift);
    setIsModalOpen(true);
  };

  const handleInitiateDelete = (c: ClassItem) => {
    // 1. Check if class has assignments (Phân công chuyên môn)
    const classAssignments = assignments.filter((a) => a.classId === c.id);
    const totalPeriods = classAssignments.reduce(
      (sum, a) => sum + (a.periodsPerWeek || 0),
      0
    );

    if (classAssignments.length > 0) {
      setDeleteWarningInfo({
        type: 'assignments',
        assignmentCount: classAssignments.length,
        periodCount: totalPeriods,
        cellCount: 0,
        className: c.name,
      });
      return;
    }

    // 2. Check if class has schedule cells (Thời khóa biểu)
    const classCells = cells.filter((cell) => cell.classId === c.id);
    if (classCells.length > 0) {
      setDeleteWarningInfo({
        type: 'timetable',
        assignmentCount: 0,
        periodCount: 0,
        cellCount: classCells.length,
        className: c.name,
      });
      return;
    }

    // 3. No related data -> Open confirmation modal
    setDeleteConfirmTarget(c);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;
    const targetName = deleteConfirmTarget.name;
    const targetId = deleteConfirmTarget.id;

    // Delete class strictly by classId
    onDeleteClass(targetId);

    setDeleteConfirmTarget(null);
    setSuccessToast(`Đã xóa lớp ${targetName} thành công.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const safeGrade = Math.min(5, Math.max(1, grade || 1));

    if (editingClass) {
      onUpdateClass({
        ...editingClass,
        name: name.trim(),
        grade: safeGrade,
        homeroomTeacherId: homeroomTeacherId || undefined,
        shift,
      });
    } else {
      const newClass: ClassItem = {
        id: `c_${Date.now()}`,
        name: name.trim(),
        grade: safeGrade,
        homeroomTeacherId: homeroomTeacherId || undefined,
        shift,
      };
      onAddClass(newClass);
    }
    setIsModalOpen(false);
  };

  const filteredClasses = classes.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || c.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span>Quản lý Lớp học</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Danh sách các lớp học theo khối, giáo viên chủ nhiệm và ca học (Sáng / Chiều).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Lớp học</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên lớp (vd: 4A)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500">Khối lớp:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                gradeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            {[1, 2, 3, 4, 5].map((g) => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  gradeFilter === g ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Khối {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((c) => {
          const hrTeacher = teachers.find((t) => t.id === c.homeroomTeacherId);

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        Khối {c.grade}
                      </span>
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {c.shift === 'morning'
                          ? 'Buổi Sáng'
                          : c.shift === 'afternoon'
                          ? 'Buổi Chiều'
                          : 'Cả Ngày'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-2xl mt-2">Lớp {c.name}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Sửa thông tin lớp"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleInitiateDelete(c)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa lớp"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Giáo viên chủ nhiệm:</span>
                    <span className="font-semibold text-slate-900">
                      {hrTeacher ? hrTeacher.name : 'Chưa phân công'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Class */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingClass ? 'Sửa thông tin Lớp học' : 'Thêm Lớp học mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tên lớp học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 4A"
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    const m = val.trim().match(/^([1-5])/);
                    if (m) setGrade(parseInt(m[1], 10));
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Buổi học</label>
                  <select
                    value={shift}
                    onChange={(e) =>
                      setShift(e.target.value as 'morning' | 'afternoon' | 'both')
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="morning">Buổi Sáng</option>
                    <option value="afternoon">Buổi Chiều</option>
                    <option value="both">Cả Ngày</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Giáo viên chủ nhiệm</label>
                <select
                  value={homeroomTeacherId}
                  onChange={(e) => setHomeroomTeacherId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn GVCN --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code} - {t.type === 'homeroom' ? 'GVCN' : 'GV Bộ môn'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 shadow-md"
                >
                  {editingClass ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning Modal when class cannot be deleted due to related data */}
      {deleteWarningInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">⚠️ KHÔNG THỂ XÓA LỚP</h3>
                <p className="text-slate-500 text-xs">Lớp {deleteWarningInfo.className}</p>
              </div>
            </div>

            <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-red-900">
                Lớp <span className="font-bold">{deleteWarningInfo.className}</span> hiện đang có:
              </p>
              {deleteWarningInfo.type === 'assignments' ? (
                <ul className="list-disc list-inside space-y-1 font-medium text-slate-800">
                  <li>
                    <span className="font-bold text-red-700">{deleteWarningInfo.assignmentCount}</span> phân công chuyên môn
                  </li>
                  <li>
                    <span className="font-bold text-red-700">{deleteWarningInfo.periodCount}</span> tiết đã phân công
                  </li>
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-1 font-medium text-slate-800">
                  <li>
                    <span className="font-bold text-red-700">{deleteWarningInfo.cellCount}</span> tiết trong thời khóa biểu
                  </li>
                </ul>
              )}
              <p className="text-slate-500 text-[11px] pt-1">
                Vui lòng xử lý các phân công / thời khóa biểu của lớp trước khi xóa.
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

      {/* Confirmation Modal when class has no related data */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác nhận xóa lớp học</h3>
                <p className="text-slate-500 text-xs">Thao tác này sẽ xóa hoàn toàn lớp khỏi hệ thống</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              Bạn có chắc chắn muốn xóa <span className="font-bold text-slate-900">Lớp {deleteConfirmTarget.name}</span> (Khối {deleteConfirmTarget.grade}) không?
            </p>

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
                Xóa lớp
              </button>
            </div>
          </div>
        </div>
      )}

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
