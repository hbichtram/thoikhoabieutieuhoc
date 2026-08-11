import React from 'react';
import { Calendar, AlertTriangle, CheckCircle, Save, Sparkles } from 'lucide-react';
import { TimeConfig, ScheduleStats } from '../types';

interface HeaderProps {
  timeConfig: TimeConfig;
  stats: ScheduleStats;
  onNavigateToAudit: () => void;
  onSaveQuickVersion: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeConfig,
  stats,
  onNavigateToAudit,
  onSaveQuickVersion,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
      {/* Brand title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight text-white">TKB SMART</h1>
            <span className="text-xs bg-blue-500/20 text-blue-300 font-medium px-2 py-0.5 rounded border border-blue-400/30">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">Trợ lý thiết kế thời khóa biểu trường tiểu học</p>
        </div>
      </div>

      {/* School Year & Semester Badge */}
      <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700/80 text-sm">
        <div className="text-slate-300 font-medium">
          Năm học: <span className="text-blue-400 font-semibold">{timeConfig.schoolYear}</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="text-slate-300 font-medium">
          Học kỳ: <span className="text-blue-400 font-semibold">{timeConfig.semester}</span>
        </div>
      </div>

      {/* Audit Stats & Actions */}
      <div className="flex items-center gap-3">
        {/* Error / Warning Badges */}
        <button
          onClick={onNavigateToAudit}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors text-xs"
          title="Bấm để xem danh sách lỗi"
        >
          {stats.criticalErrorCount > 0 ? (
            <span className="flex items-center gap-1 font-semibold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/50">
              <AlertTriangle className="w-3.5 h-3.5" />
              {stats.criticalErrorCount} Lỗi
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
              <CheckCircle className="w-3.5 h-3.5" />
              0 Lỗi
            </span>
          )}

          {stats.warningCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              {stats.warningCount} Cảnh báo
            </span>
          )}
        </button>

        {/* Quick Save button */}
        <button
          onClick={onSaveQuickVersion}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition-all active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Lưu phiên bản</span>
        </button>
      </div>
    </header>
  );
};
