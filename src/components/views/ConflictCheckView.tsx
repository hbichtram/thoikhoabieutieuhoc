import React, { useState } from 'react';
import {
  Search,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ScheduleStats, ConflictIssue } from '../../types';

interface ConflictCheckViewProps {
  stats: ScheduleStats;
  onRunGlobalCheck: () => void;
  onNavigateToTimetable: (issue?: ConflictIssue) => void;
}

export const ConflictCheckView: React.FC<ConflictCheckViewProps> = ({
  stats,
  onRunGlobalCheck,
  onNavigateToTimetable,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIssues = stats.issues.filter((issue) => {
    const matchSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchSearch = issue.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSeverity && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Global Audit Button */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-red-600" />
            <span>Kiểm tra Xung đột Thời khóa biểu</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl">
            Tự động phát hiện lỗi trùng tiết giáo viên, trùng lớp, thiếu/thừa tiết, dạy tiết bị khóa, vượt quá số tiết tối đa/ngày và tiết dạy liên tiếp.
          </p>
        </div>

        <button
          onClick={onRunGlobalCheck}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 text-sm shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>🔍 KIỂM TRA TOÀN BỘ</span>
        </button>
      </div>

      {/* Audit Stats Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Lỗi nghiêm trọng</div>
          <div className={`text-3xl font-bold mt-1 ${stats.criticalErrorCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {stats.criticalErrorCount} lỗi
          </div>
          <p className="text-[11px] text-slate-400 mt-1">🔴 Không được phép tồn tại</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Cảnh báo</div>
          <div className={`text-3xl font-bold mt-1 ${stats.warningCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {stats.warningCount} cảnh báo
          </div>
          <p className="text-[11px] text-slate-400 mt-1">🟡 Cần xem xét điều chỉnh</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Tiết đã xếp</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">
            {stats.totalPlacedPeriods}/{stats.totalRequiredPeriods}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tổng định mức toàn trường</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Tiến độ hoàn thành</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">
            {stats.completionPercentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tỷ lệ tiết đã vào bảng</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm nội dung thông báo lỗi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-500">Mức độ:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                severityFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Tất cả ({stats.issues.length})
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                severityFilter === 'critical' ? 'bg-white text-red-600 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              🔴 Lỗi ({stats.criticalErrorCount})
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                severityFilter === 'warning' ? 'bg-white text-amber-600 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              🟡 Cảnh báo ({stats.warningCount})
            </button>
          </div>
        </div>
      </div>

      {/* Issue Cards List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="py-12 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <h3 className="font-bold text-emerald-900 text-lg">Không phát hiện vấn đề nào!</h3>
            <p className="text-emerald-700 text-xs mt-1">
              Thời khóa biểu của trường đạt tiêu chuẩn hợp lệ 100%.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isCritical = issue.severity === 'critical';
            return (
              <div
                key={issue.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                  isCritical
                    ? 'bg-red-50/60 border-red-200 text-red-900'
                    : 'bg-amber-50/60 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{isCritical ? '🔴' : '🟡'}</span>
                  <div>
                    <div className="font-bold text-sm leading-snug">{issue.message}</div>
                    <div className="text-xs opacity-75 mt-0.5">
                      Mức độ: <span className="font-semibold">{isCritical ? 'Lỗi nghiêm trọng' : 'Cảnh báo'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToTimetable(issue)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all shrink-0 ${
                    isCritical
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  <span>Mở vị trí TKB</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
