import React from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  ScheduleStats,
  ConflictIssue,
  ScheduleCell,
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  DayOfWeek,
} from '../../types';

interface DashboardViewProps {
  stats: ScheduleStats;
  cells?: ScheduleCell[];
  teachers?: Teacher[];
  classes?: ClassItem[];
  subjects?: Subject[];
  assignments?: Assignment[];
  onNavigateTab: (tab: 'teachers' | 'classes' | 'subjects' | 'assignments' | 'timetable' | 'audit' | 'reports' | 'settings') => void;
  onSelectIssue?: (issue: ConflictIssue) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  cells = [],
  teachers = [],
  classes = [],
  subjects = [],
  onNavigateTab,
  onSelectIssue,
}) => {
  // Determine current day info for "THỜI KHÓA BIỂU HÔM NAY"
  const getTodayInfo = () => {
    const now = new Date();
    const dayOfWeekNum = now.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    const dayMap: Record<number, DayOfWeek> = {
      1: 'T2',
      2: 'T3',
      3: 'T4',
      4: 'T5',
      5: 'T6',
    };
    const currentDayOfWeek: DayOfWeek = dayMap[dayOfWeekNum] || 'T2';
    const dayNames: Record<DayOfWeek, string> = {
      T2: 'THỨ 2',
      T3: 'THỨ 3',
      T4: 'THỨ 4',
      T5: 'THỨ 5',
      T6: 'THỨ 6',
    };
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const todayLabel = `${dayNames[currentDayOfWeek]} · ${formattedDate}`;

    return { currentDayOfWeek, todayLabel };
  };

  const { currentDayOfWeek, todayLabel } = getTodayInfo();

  // Filter cells for current day
  const todayCells = cells.filter((c) => c.day === currentDayOfWeek);
  const morningCells = todayCells.filter((c) => c.shift === 'morning').sort((a, b) => a.periodNumber - b.periodNumber);
  const afternoonCells = todayCells.filter((c) => c.shift === 'afternoon').sort((a, b) => a.periodNumber - b.periodNumber);

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans">
      {/* 1. COMPACT DASHBOARD HEADER (Height ~60–75px) */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Tổng quan TKB SMART
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                Năm học 2026–2027 · Học kỳ I
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi tình trạng phân công, tiến độ xếp TKB và các vấn đề cần xử lý.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('timetable')}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Mở TKB</span>
        </button>
      </div>

      {/* 2. KHU VỰC THỐNG KÊ - 5 COMPACT CARDS (Height ~75–90px) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        {/* Card 1: GIÁO VIÊN */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[82px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GIÁO VIÊN</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">{stats.totalTeachers}</span>
            <span className="text-[11px] text-slate-500 font-medium">Cán bộ & giáo viên</span>
          </div>
        </div>

        {/* Card 2: LỚP HỌC */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[82px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LỚP HỌC</span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">{stats.totalClasses}</span>
            <span className="text-[11px] text-slate-500 font-medium">Khối 3–5</span>
          </div>
        </div>

        {/* Card 3: MÔN HỌC */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[82px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">MÔN HỌC</span>
            <div className="w-6 h-6 rounded-md bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">{stats.totalSubjects}</span>
            <span className="text-[11px] text-slate-500 font-medium">Chương trình</span>
          </div>
        </div>

        {/* Card 4: TIẾT TUẦN */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[82px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TIẾT TUẦN</span>
            <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">{stats.totalRequiredPeriods}</span>
            <span className="text-[11px] text-slate-500 font-medium">Tổng số tiết</span>
          </div>
        </div>

        {/* Card 5: TIẾN ĐỘ TKB */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[82px] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TIẾN ĐỘ TKB</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 leading-none">{stats.completionPercentage}%</span>
            <span className="text-[11px] text-slate-500 font-medium">
              {stats.totalPlacedPeriods} / {stats.totalRequiredPeriods} tiết
            </span>
          </div>
        </div>
      </div>

      {/* 3. KHU VỰC TRUNG TÂM – 2 CỘT: TIẾN ĐỘ & TÌNH TRẠNG TKB (ROW 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        {/* BÊN TRÁI: TIẾN ĐỘ XẾP TKB */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[135px]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              TIẾN ĐỘ XẾP TKB
            </h3>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {stats.completionPercentage}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Đã xếp: <strong className="text-slate-900 font-bold">{stats.totalPlacedPeriods} tiết</strong></span>
              <span className="text-slate-600">Tổng cộng: <strong className="text-slate-900 font-bold">{stats.totalRequiredPeriods} tiết</strong></span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, stats.completionPercentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Đã xếp: <strong className="text-slate-800">{stats.totalPlacedPeriods}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Chưa xếp: <strong className="text-slate-800">{Math.max(0, stats.totalRequiredPeriods - stats.totalPlacedPeriods)}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Trạng thái: <strong className="text-slate-800">{stats.completionPercentage === 100 ? 'Hoàn thành' : 'Đang xếp'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* BÊN PHẢI: TÌNH TRẠNG TKB */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[135px]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              TÌNH TRẠNG TKB
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              <span>Kiểm tra TKB →</span>
            </button>
          </div>

          <div className="flex items-center justify-around py-2 px-3 bg-slate-50/80 rounded-lg border border-slate-100/80">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔴</span>
              <span className="text-xs font-bold text-slate-800">{stats.criticalErrorCount} vấn đề</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🟡</span>
              <span className="text-xs font-bold text-slate-800">{stats.warningCount} cảnh báo</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🟢</span>
              <span className="text-xs font-bold text-slate-800">0 xung đột nghiêm trọng</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Tự động kiểm tra trùng tiết & định mức</span>
            <span className="font-medium text-slate-700">TKB SMART AI</span>
          </div>
        </div>
      </div>

      {/* 4. ROW 3: CẦN XỬ LÝ (TRÁI) & THỜI KHÓA BIỂU HÔM NAY (PHẢI) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        {/* BÊN TRÁI: CẦN XỬ LÝ (Tối đa 3 lỗi) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="text-xs">🔴</span> CẦN XỬ LÝ
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              <span>Xem tất cả →</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center my-1 space-y-1.5">
            {stats.issues.length === 0 ? (
              <div className="py-3 px-4 bg-emerald-50/80 border border-emerald-100 rounded-lg text-center">
                <p className="text-xs font-bold text-emerald-800">✓ Không có vấn đề cần xử lý</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Thời khóa biểu hợp lệ và không tìm thấy xung đột.</p>
              </div>
            ) : (
              <>
                {stats.issues.slice(0, 3).map((issue) => {
                  const isCritical = issue.severity === 'critical';
                  return (
                    <div
                      key={issue.id}
                      onClick={() => {
                        if (onSelectIssue) onSelectIssue(issue);
                        onNavigateTab('audit');
                      }}
                      className={`h-[42px] px-3 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isCritical
                          ? 'bg-red-50/50 border-red-200/80 text-red-900 hover:bg-red-50'
                          : 'bg-amber-50/50 border-amber-200/80 text-amber-900 hover:bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="shrink-0">{isCritical ? '🔴' : '🟡'}</span>
                        <span className="font-medium text-xs truncate">{issue.message}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/90 border border-slate-200 shrink-0 text-slate-700">
                        Xử lý
                      </span>
                    </div>
                  );
                })}

                {stats.issues.length > 3 && (
                  <div className="text-center text-[11px] text-slate-500 font-semibold pt-0.5">
                    + {stats.issues.length - 3} vấn đề khác
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* BÊN PHẢI: THỜI KHÓA BIỂU HÔM NAY */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                THỜI KHÓA BIỂU HÔM NAY
              </h3>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {todayLabel}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('timetable')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              <span>Xem thời khóa biểu →</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center my-1">
            {todayCells.length === 0 ? (
              <div className="py-4 text-center bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-xs text-slate-500 font-medium">Chưa có tiết học được xếp hôm nay.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Buổi sáng */}
                <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">BUỔI SÁNG (Tiết 1–4)</div>
                  <div className="space-y-1">
                    {morningCells.slice(0, 3).map((c, idx) => {
                      const cls = classes.find((clsItem) => clsItem.id === c.classId);
                      const sub = subjects.find((s) => s.id === c.subjectId);
                      return (
                        <div key={c.id || idx} className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                          <span className="text-slate-400 font-mono">T{c.periodNumber}:</span>
                          <span className="font-semibold text-slate-900 truncate max-w-[90px]">{sub?.name || 'Môn học'}</span>
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">{cls?.name || 'Lớp'}</span>
                        </div>
                      );
                    })}
                    {morningCells.length === 0 && <span className="text-[11px] text-slate-400 italic">Trống</span>}
                  </div>
                </div>

                {/* Buổi chiều */}
                <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">BUỔI CHIỀU (Tiết 5–7)</div>
                  <div className="space-y-1">
                    {afternoonCells.slice(0, 3).map((c, idx) => {
                      const cls = classes.find((clsItem) => clsItem.id === c.classId);
                      const sub = subjects.find((s) => s.id === c.subjectId);
                      return (
                        <div key={c.id || idx} className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                          <span className="text-slate-400 font-mono">T{c.periodNumber > 4 ? c.periodNumber : c.periodNumber + 4}:</span>
                          <span className="font-semibold text-slate-900 truncate max-w-[90px]">{sub?.name || 'Môn học'}</span>
                          <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">{cls?.name || 'Lớp'}</span>
                        </div>
                      );
                    })}
                    {afternoonCells.length === 0 && <span className="text-[11px] text-slate-400 italic">Trống</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
