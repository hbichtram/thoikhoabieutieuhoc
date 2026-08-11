import React from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { ScheduleStats, ConflictIssue } from '../../types';

interface DashboardViewProps {
  stats: ScheduleStats;
  onNavigateTab: (tab: 'teachers' | 'classes' | 'subjects' | 'assignments' | 'timetable' | 'audit') => void;
  onSelectIssue?: (issue: ConflictIssue) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigateTab,
  onSelectIssue,
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 border border-blue-800/40 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Ban Giám Hiệu – Trường Tiểu Học</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Trợ lý Thiết kế Thời khóa biểu TKB SMART</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Phiên bản tập trung tối ưu phân công chuyên môn, kéo thả linh hoạt và tự động kiểm tra xung đột giáo viên, lớp, số tiết.
          </p>
        </div>
        <button
          onClick={() => onNavigateTab('timetable')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95 text-sm shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>Mở Bảng Thời Khóa Biểu</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Giáo viên</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalTeachers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cán bộ & GV</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lớp học</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalClasses}</div>
          <div className="text-[11px] text-slate-500 mt-1">Khối 3–5</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Môn học</span>
            <BookOpen className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalSubjects}</div>
          <div className="text-[11px] text-slate-500 mt-1">Chương trình</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tiết / Tuần</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalRequiredPeriods}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Đã xếp {stats.totalPlacedPeriods} tiết
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lỗi TKB</span>
            <AlertOctagon className={`w-4 h-4 ${stats.criticalErrorCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold ${stats.criticalErrorCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {stats.criticalErrorCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">🔴 Cần sửa ngay</div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cảnh báo</span>
            <AlertTriangle className={`w-4 h-4 ${stats.warningCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold ${stats.warningCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {stats.warningCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">🟡 Xem xét lại</div>
        </div>

        {/* Metric 7 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tiến độ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.completionPercentage}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Teacher Exceeded Limits Alert Banner */}
      {(() => {
        const teacherMaxIssues = stats.issues.filter((i) => i.type === 'teacher_max_periods');
        if (teacherMaxIssues.length === 0) return null;

        return (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl text-red-600 shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-sm">
                  🔴 CẢNH BÁO: CÓ {teacherMaxIssues.length} GIÁO VIÊN VƯỢT GIỚI HẠN SỐ TIẾT DẠY/TUẦN
                </h3>
                <ul className="mt-1 space-y-0.5 text-xs text-red-800 list-disc list-inside">
                  {teacherMaxIssues.slice(0, 3).map((issue) => (
                    <li key={issue.id}>{issue.message}</li>
                  ))}
                  {teacherMaxIssues.length > 3 && (
                    <li>Và {teacherMaxIssues.length - 3} giáo viên khác...</li>
                  )}
                </ul>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('teachers')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm shrink-0"
            >
              <span>Xem chi tiết & Sửa ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Issues Section "CẦN XỬ LÝ" */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <span className="text-red-500">🔴</span> CẦN XỬ LÝ ({stats.issues.length} vấn đề)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Danh sách xung đột và cảnh báo phát hiện tự động trong thời khóa biểu hiện tại.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
          >
            <span>Mở trang kiểm tra chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats.issues.length === 0 ? (
          <div className="py-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-emerald-900 text-base">Thời khóa biểu hợp lệ!</h4>
            <p className="text-emerald-700 text-xs mt-1">
              Không tìm thấy lỗi trùng tiết, thừa thiếu tiết hay vi phạm điều kiện ràng buộc nào.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {stats.issues.slice(0, 8).map((issue) => {
              const isCritical = issue.severity === 'critical';
              return (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                    isCritical
                      ? 'bg-red-50/60 border-red-200 text-red-900 hover:bg-red-50'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5">{isCritical ? '🔴' : '🟡'}</span>
                    <div>
                      <div className="font-medium text-sm leading-snug">{issue.message}</div>
                      <div className="text-xs opacity-75 mt-0.5 font-sans">
                        Loại vấn đề: {issue.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectIssue) onSelectIssue(issue);
                      onNavigateTab('timetable');
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-sm transition-all shrink-0 ${
                      isCritical
                        ? 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                        : 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                    }`}
                  >
                    Xử lý ngay
                  </button>
                </div>
              );
            })}

            {stats.issues.length > 8 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => onNavigateTab('audit')}
                  className="text-xs text-slate-500 font-medium hover:text-slate-800"
                >
                  Và {stats.issues.length - 8} vấn đề khác... Xem tất cả
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('teachers')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Quản lý Giáo viên</h4>
          <p className="text-slate-500 text-xs mt-1">Cập nhật danh sách, môn phụ trách, tiết tối đa và khóa giờ dạy bận.</p>
        </div>

        <div
          onClick={() => onNavigateTab('assignments')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Phân công Chuyên môn</h4>
          <p className="text-slate-500 text-xs mt-1">Gán giáo viên dạy môn học cho từng lớp và tính tổng tiết/tuần.</p>
        </div>

        <div
          onClick={() => onNavigateTab('timetable')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Xếp Thời khóa biểu Kéo-Thả</h4>
          <p className="text-slate-500 text-xs mt-1">Giao diện xếp TKB kéo thả trực quan theo Lớp hoặc Giáo viên.</p>
        </div>
      </div>
    </div>
  );
};
