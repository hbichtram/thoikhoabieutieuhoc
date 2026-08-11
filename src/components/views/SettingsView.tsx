import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  Archive,
  Trash2,
  Lock,
} from 'lucide-react';
import {
  TimeConfig,
  ScheduleVersion,
  ScheduleCell,
  DayOfWeek,
  PeriodShift,
  UnavailableSlot,
} from '../../types';

interface SettingsViewProps {
  timeConfig: TimeConfig;
  versions: ScheduleVersion[];
  currentCells: ScheduleCell[];
  onUpdateTimeConfig: (config: TimeConfig) => void;
  onSaveVersion: (name: string, type: 'draft' | 'editing' | 'official', notes?: string) => void;
  onRestoreVersion: (version: ScheduleVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  onResetSampleData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  timeConfig,
  versions,
  currentCells,
  onUpdateTimeConfig,
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
  onResetSampleData,
}) => {
  // Config state
  const [schoolYear, setSchoolYear] = useState(timeConfig.schoolYear);
  const [semester, setSemester] = useState(timeConfig.semester);
  const [morningCount, setMorningCount] = useState(timeConfig.morningPeriodsCount);
  const [afternoonCount, setAfternoonCount] = useState(timeConfig.afternoonPeriodsCount);

  // Version form state
  const [versionName, setVersionName] = useState(`TKB – ${new Date().toLocaleDateString('vi-VN')} – Bản ${versions.length + 1}`);
  const [versionType, setVersionType] = useState<'draft' | 'editing' | 'official'>('editing');
  const [versionNotes, setVersionNotes] = useState('');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTimeConfig({
      ...timeConfig,
      schoolYear,
      semester,
      morningPeriodsCount: morningCount,
      afternoonPeriodsCount: afternoonCount,
    });
    alert('Đã lưu cấu hình thời gian!');
  };

  const handleCreateVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;
    onSaveVersion(versionName, versionType, versionNotes);
    setVersionName(`TKB – ${new Date().toLocaleDateString('vi-VN')} – Bản ${versions.length + 2}`);
    setVersionNotes('');
    alert('Đã lưu phiên bản thời khóa biểu!');
  };

  // Toggle school disabled slot
  const toggleSchoolDisabledSlot = (day: DayOfWeek, shift: PeriodShift, periodNumber: number) => {
    const exists = timeConfig.disabledSlots.some(
      (d) => d.day === day && d.shift === shift && d.periodNumber === periodNumber
    );

    let updatedDisabled: UnavailableSlot[];
    if (exists) {
      updatedDisabled = timeConfig.disabledSlots.filter(
        (d) => !(d.day === day && d.shift === shift && d.periodNumber === periodNumber)
      );
    } else {
      updatedDisabled = [...timeConfig.disabledSlots, { day, shift, periodNumber }];
    }

    onUpdateTimeConfig({ ...timeConfig, disabledSlots: updatedDisabled });
  };

  const days: DayOfWeek[] = ['T2', 'T3', 'T4', 'T5', 'T6'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            <span>Cài đặt & Quản lý Phiên bản TKB</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Cấu hình thời gian học tập trong ngày, bật/tắt các tiết trường không học, lưu snapshot bản TKB nháp/chính thức và khôi phục.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Bạn có chắc chắn muốn khôi phục toàn bộ dữ liệu mẫu ban đầu?')) {
              onResetSampleData();
            }
          }}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs border border-slate-300 transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Khôi phục dữ liệu mẫu</span>
        </button>
      </div>

      {/* 1. Cấu hình Năm học & Khung thời gian */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span>1. Cấu hình Năm học & Số tiết mỗi buổi</span>
        </h3>

        <form onSubmit={handleSaveConfig} className="space-y-4 text-xs max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Năm học</label>
              <input
                type="text"
                required
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-bold text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Học kỳ</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-bold"
              >
                <option value="I">Học kỳ I</option>
                <option value="II">Học kỳ II</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Số tiết buổi Sáng (Tối đa 5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={morningCount}
                onChange={(e) => setMorningCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Số tiết buổi Chiều (Tối đa 5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={afternoonCount}
                onChange={(e) => setAfternoonCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold px-5 py-2 rounded-xl hover:bg-blue-500 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Lưu cấu hình</span>
          </button>
        </form>

        {/* Bật/tắt tiết của trường */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Khóa / Tắt Khung Tiết Học Của Trường</span>
          </h4>
          <p className="text-xs text-slate-500">
            Bấm vào các tiết dưới đây nếu nhà trường không tổ chức học (ví dụ: Chiều Thứ 6 chỉ học 3 tiết, khóa tiết 4 và 5 toàn trường).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs max-w-3xl">
              <thead>
                <tr className="bg-slate-100 font-semibold border-b border-slate-200 text-slate-700">
                  <th className="p-2 border-r border-slate-200">Buổi / Tiết</th>
                  {days.map((d) => (
                    <th key={d} className="p-2 border-r border-slate-200">
                      THỨ {d.replace('T', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((pNum) => (
                  <tr key={`sm_${pNum}`} className="border-b border-slate-100">
                    <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">Sáng T{pNum}</td>
                    {days.map((day) => {
                      const isDisabled = timeConfig.disabledSlots.some(
                        (d) => d.day === day && d.shift === 'morning' && d.periodNumber === pNum
                      );
                      return (
                        <td key={day} className="p-1 border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => toggleSchoolDisabledSlot(day, 'morning', pNum)}
                            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isDisabled
                                ? 'bg-slate-800 text-white shadow'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {isDisabled ? 'TẮT 🔒' : 'Học'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {[1, 2, 3, 4, 5].map((pNum) => (
                  <tr key={`sa_${pNum}`} className="border-b border-slate-100">
                    <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">Chiều T{pNum}</td>
                    {days.map((day) => {
                      const isDisabled = timeConfig.disabledSlots.some(
                        (d) => d.day === day && d.shift === 'afternoon' && d.periodNumber === pNum
                      );
                      return (
                        <td key={day} className="p-1 border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => toggleSchoolDisabledSlot(day, 'afternoon', pNum)}
                            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isDisabled
                                ? 'bg-slate-800 text-white shadow'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {isDisabled ? 'TẮT 🔒' : 'Học'}
                          </button>
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

      {/* 2. Lưu & Quản lý Phiên bản TKB */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
          <Archive className="w-5 h-5 text-indigo-600" />
          <span>2. Lưu Snapshot & Khôi phục Phiên bản TKB</span>
        </h3>

        <form onSubmit={handleCreateVersion} className="space-y-4 text-xs max-w-2xl bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tên bản lưu snapshot</label>
              <input
                type="text"
                required
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Loại phiên bản</label>
              <select
                value={versionType}
                onChange={(e) =>
                  setVersionType(e.target.value as 'draft' | 'editing' | 'official')
                }
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold"
              >
                <option value="draft">Nháp (Draft)</option>
                <option value="editing">Đang chỉnh sửa (Editing)</option>
                <option value="official">Chính thức (Official)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Ghi chú phiên bản</label>
            <input
              type="text"
              placeholder="Ghi chú thêm về phiên bản này..."
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 bg-indigo-600 text-white font-semibold px-5 py-2 rounded-xl hover:bg-indigo-500 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>💾 Lưu phiên bản hiện tại ({currentCells.length} tiết)</span>
          </button>
        </form>

        {/* List of Saved Versions */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Danh sách các phiên bản đã lưu ({versions.length})
          </h4>

          <div className="space-y-2.5">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ver.type === 'official'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : ver.type === 'editing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ver.type === 'official'
                        ? 'Chính thức'
                        : ver.type === 'editing'
                        ? 'Đang chỉnh sửa'
                        : 'Bản nháp'}
                    </span>
                    <span className="text-xs text-slate-400">{ver.timestamp}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{ver.name}</h4>
                  {ver.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{ver.notes}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn khôi phục bản TKB: "${ver.name}"?`)) {
                        onRestoreVersion(ver);
                      }
                    }}
                    className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 text-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục bản này</span>
                  </button>

                  <button
                    onClick={() => onDeleteVersion(ver.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa phiên bản này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
