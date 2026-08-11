import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, BookOpen, X } from 'lucide-react';
import { Subject } from '../../types';

interface SubjectsViewProps {
  subjects: Subject[];
  onAddSubject: (s: Subject) => void;
  onUpdateSubject: (s: Subject) => void;
  onDeleteSubject: (id: string) => void;
}

const defaultColors = [
  '#2563EB', // Blue
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#059669', // Emerald
  '#D97706', // Amber
  '#0891B2', // Cyan
  '#0D9488', // Teal
  '#B45309', // Orange
  '#DB2777', // Pink
  '#4F46E5', // Indigo
];

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [defaultPeriodsPerWeek, setDefaultPeriodsPerWeek] = useState(2);
  const [color, setColor] = useState('#2563EB');

  const openAddModal = () => {
    setEditingSubject(null);
    setName('');
    setShortName('');
    setDefaultPeriodsPerWeek(2);
    setColor(defaultColors[subjects.length % defaultColors.length]);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSubject(s);
    setName(s.name);
    setShortName(s.shortName);
    setDefaultPeriodsPerWeek(s.defaultPeriodsPerWeek);
    setColor(s.color);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) return;

    if (editingSubject) {
      onUpdateSubject({
        ...editingSubject,
        name,
        shortName,
        defaultPeriodsPerWeek,
        color,
      });
    } else {
      const newSubject: Subject = {
        id: `s_${Date.now()}`,
        name,
        shortName,
        defaultPeriodsPerWeek,
        color,
      };
      onAddSubject(newSubject);
    }
    setIsModalOpen(false);
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-600" />
            <span>Quản lý Môn học</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Cấu hình danh sách môn học, mã viết tắt, số tiết định mức hàng tuần và màu hiển thị trên bảng TKB.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Môn học</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên môn hoặc mã viết tắt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredSubjects.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm text-sm"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.shortName}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{s.name}</h3>
                    <span className="text-xs text-slate-500">{s.defaultPeriodsPerWeek} tiết/tuần</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                    title="Sửa môn học"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteSubject(s.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa môn học"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Màu nhận diện</span>
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: s.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingSubject ? 'Sửa Môn học' : 'Thêm Môn học mới'}
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
                <label className="block font-medium text-slate-700 mb-1">Tên môn học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tin học"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-cyan-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mã viết tắt</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: TH"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-cyan-500 font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mặc định số tiết/tuần</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={defaultPeriodsPerWeek}
                    onChange={(e) => setDefaultPeriodsPerWeek(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-cyan-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-2">Màu hiển thị trên TKB</label>
                <div className="flex flex-wrap gap-2">
                  {defaultColors.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-cyan-500 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
                  className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-500 shadow-md"
                >
                  {editingSubject ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
