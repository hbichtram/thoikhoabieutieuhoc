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
  AlertTriangle,
  AlertCircle,
  Activity,
  Check,
  ChevronRight,
  ShieldAlert,
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
  onNavigateTab: (
    tab:
      | 'overview'
      | 'teachers'
      | 'classes'
      | 'subjects'
      | 'assignments'
      | 'timetable'
      | 'audit'
      | 'reports'
      | 'settings'
  ) => void;
  onSelectIssue?: (issue: ConflictIssue) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  cells = [],
  teachers = [],
  classes = [],
  subjects = [],
  assignments = [],
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
  
  // Morning cells (periodNumber 1..4)
  const morningCells = todayCells
    .filter((c) => c.shift === 'morning')
    .sort((a, b) => a.periodNumber - b.periodNumber);

  // Afternoon cells (normalize periodNumber to 1..3 if > 4)
  const afternoonCells = todayCells
    .filter((c) => c.shift === 'afternoon')
    .sort((a, b) => {
      const pA = a.periodNumber > 4 ? a.periodNumber - 4 : a.periodNumber;
      const pB = b.periodNumber > 4 ? b.periodNumber - 4 : b.periodNumber;
      return pA - pB;
    });

  // Grade range description for Lớp học card (Tiểu học: Khối 1 đến Khối 5)
  const validGrades = classes
    .map((c) => {
      let g = c.grade;
      if (!g || g > 5 || g < 1) {
        const match = c.name?.match(/^([1-5])/);
        g = match ? parseInt(match[1], 10) : (g ? Math.min(5, Math.max(1, g)) : 1);
      }
      return g;
    })
    .filter((g) => g >= 1 && g <= 5);

  const uniqueGrades = Array.from(new Set(validGrades)).sort((a, b) => a - b);
  const minGrade = uniqueGrades.length > 0 ? Math.min(...uniqueGrades) : 1;
  const maxGrade = uniqueGrades.length > 0 ? Math.min(5, Math.max(...uniqueGrades)) : 5;

  const gradeLabel =
    uniqueGrades.length > 1
      ? `Khối ${minGrade}–${maxGrade}`
      : uniqueGrades.length === 1
      ? `Khối ${uniqueGrades[0]}`
      : 'Khối 1–5';

  // Metrics calculation for clear separation
  const unassignedPeriods = Math.max(0, stats.totalRequiredPeriods - stats.totalPlacedPeriods);
  const actualConflicts = stats.issues.filter(
    (i) => i.type !== 'missing_periods' && i.severity === 'critical'
  ).length;
  const warningCount = stats.warningCount;
  const totalItemsToProcess = stats.issues.length;

  // Sorted issues: actual critical conflicts first, then missing periods, then warnings
  const sortedIssues = [...stats.issues].sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    if (a.type !== 'missing_periods' && b.type === 'missing_periods') return -1;
    if (a.type === 'missing_periods' && b.type !== 'missing_periods') return 1;
    return 0;
  });

  return (
    <div className="p-3 sm:p-4 max-w-[1400px] mx-auto space-y-3 font-sans text-slate-800 antialiased">
      {/* ==========================================
          1. COMPACT HEADER (~64-72px)
         ========================================== */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-3 shadow-2xs flex items-center justify-between gap-4 shrink-0">
        {/* Left branding & title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Tổng quan THỜI KHÓA BIỂU TIỂU HỌC
              </h1>
              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                Năm học 2026–2027 · Học kỳ I
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Trợ lý thiết kế và xếp thời khóa biểu
            </p>
          </div>
        </div>

        {/* Right status & action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Hệ thống sẵn sàng</span>
          </div>

          <button
            onClick={() => onNavigateTab('timetable')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mở TKB</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          2. KHU VỰC CHỈ SỐ TỔNG QUAN (5 STAT CARDS)
         ========================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        {/* Card 1: GIÁO VIÊN */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[82px] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              GIÁO VIÊN
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">
              {stats.totalTeachers}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Cán bộ & giáo viên</span>
          </div>
        </div>

        {/* Card 2: LỚP HỌC */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[82px] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              LỚP HỌC
            </span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">
              {stats.totalClasses}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">{gradeLabel}</span>
          </div>
        </div>

        {/* Card 3: MÔN HỌC */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[82px] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MÔN HỌC
            </span>
            <div className="w-6 h-6 rounded-md bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">
              {stats.totalSubjects}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Chương trình</span>
          </div>
        </div>

        {/* Card 4: TIẾT TUẦN */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[82px] hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TIẾT TUẦN
            </span>
            <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 leading-none">
              {stats.totalRequiredPeriods}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Tổng số tiết</span>
          </div>
        </div>

        {/* Card 5: TIẾN ĐỘ TKB */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[82px] col-span-2 sm:col-span-1 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TIẾN ĐỘ TKB
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 leading-none">
              {stats.completionPercentage}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {stats.totalPlacedPeriods} / {stats.totalRequiredPeriods} tiết
            </span>
          </div>
        </div>
      </div>

      {/* ==========================================
          3. ROW 2: TIẾN ĐỘ & TÌNH TRẠNG TKB (2 COLS)
         ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        {/* PANEL 1: TIẾN ĐỘ XẾP THỜI KHÓA BIỂU */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[135px]">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              TIẾN ĐỘ XẾP THỜI KHÓA BIỂU
            </h2>

            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                stats.completionPercentage === 100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              ● {stats.completionPercentage === 100 ? 'Hoàn thành' : 'Đang xếp'}
            </span>
          </div>

          <div className="space-y-2.5 my-1.5">
            {/* Top metrics row */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-50/90 p-2 rounded-lg border border-slate-100 flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Đã xếp</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {stats.totalPlacedPeriods} <span className="text-xs font-normal text-slate-500">tiết</span>
                </span>
              </div>

              <div className="bg-slate-50/90 p-2 rounded-lg border border-slate-100 flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Chưa xếp</span>
                <span className="font-extrabold text-amber-700 text-sm mt-0.5">
                  {unassignedPeriods} <span className="text-xs font-normal text-slate-500">tiết</span>
                </span>
              </div>

              <div className="bg-slate-50/90 p-2 rounded-lg border border-slate-100 flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Tổng cộng</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {stats.totalRequiredPeriods} <span className="text-xs font-normal text-slate-500">tiết</span>
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-medium text-slate-500">
                <span>Tỷ lệ hoàn thành</span>
                <span className="font-bold text-slate-900">{stats.completionPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/80">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, stats.completionPercentage)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: TÌNH TRẠNG TKB (LỖI / XUNG ĐỘT VS CHƯA HOÀN THÀNH) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[135px]">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              TÌNH TRẠNG TKB
            </h2>

            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Kiểm tra TKB</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 my-1">
            {/* Status Item 1: XUNG ĐỘT */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                actualConflicts > 0
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-slate-50/90 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-sm">🔴</span>
                <span>Xung đột</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className={`text-xl font-black ${actualConflicts > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {actualConflicts}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">lỗi nghiêm trọng</span>
              </div>
            </div>

            {/* Status Item 2: CHƯA HOÀN THÀNH */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                unassignedPeriods > 0
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-slate-50/90 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-sm">🟠</span>
                <span>Chưa hoàn thành</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className={`text-xl font-black ${unassignedPeriods > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
                  {unassignedPeriods}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">tiết chưa xếp</span>
              </div>
            </div>

            {/* Status Item 3: HOÀN THÀNH */}
            <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/90 text-slate-800 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-sm">🟢</span>
                <span>Hoàn thành</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-emerald-600">
                  {stats.totalPlacedPeriods}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">tiết đã xếp</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
            <span>
              {totalItemsToProcess > 0
                ? `${totalItemsToProcess} mục cần xử lý (${actualConflicts} xung đột, ${unassignedPeriods} chưa xếp)`
                : 'Thời khóa biểu hợp lệ, không có xung đột'}
            </span>
            <span className="text-slate-400 font-semibold">TKB TIỂU HỌC Auto-Audit</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          4. ROW 3: CẦN XỬ LÝ (TRÁI) & THỜI KHÓA BIỂU HÔM NAY (PHẢI)
         ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        {/* PANEL 1: CẦN XỬ LÝ (MAX 3 ITEMS COMPACT) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[175px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                CẦN XỬ LÝ
              </h2>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {totalItemsToProcess} mục
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Xem tất cả →</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center my-2 space-y-1.5">
            {sortedIssues.length === 0 ? (
              <div className="py-3 px-4 bg-emerald-50/80 border border-emerald-200 rounded-lg text-center">
                <p className="text-xs font-bold text-emerald-900">✓ Không có vấn đề cần xử lý</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Thời khóa biểu hợp lệ và không tìm thấy xung đột.
                </p>
              </div>
            ) : (
              <>
                {sortedIssues.slice(0, 3).map((issue) => {
                  const isCritical = issue.severity === 'critical' && issue.type !== 'missing_periods';
                  const isMissing = issue.type === 'missing_periods';

                  return (
                    <div
                      key={issue.id}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                        isCritical
                          ? 'bg-rose-50/60 border-rose-200/80 text-rose-950'
                          : isMissing
                          ? 'bg-amber-50/60 border-amber-200/80 text-amber-950'
                          : 'bg-slate-50/80 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="shrink-0 text-xs">
                          {isCritical ? '🔴' : isMissing ? '🟠' : '🟡'}
                        </span>
                        <span className="font-medium text-xs truncate leading-snug">
                          {issue.message}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (onSelectIssue) onSelectIssue(issue);
                          onNavigateTab('timetable');
                        }}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors shrink-0 cursor-pointer shadow-2xs"
                      >
                        Xử lý
                      </button>
                    </div>
                  );
                })}

                {sortedIssues.length > 3 && (
                  <div className="flex items-center justify-between pt-1 px-1">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      + {sortedIssues.length - 3} mục khác cần xử lý
                    </span>
                    <button
                      onClick={() => onNavigateTab('audit')}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      [ Xem tất cả → ]
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* PANEL 2: THỜI KHÓA BIỂU HÔM NAY */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[175px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                THỜI KHÓA BIỂU HÔM NAY
              </h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {todayLabel}
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('timetable')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Xem TKB →</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center my-1.5">
            {todayCells.length === 0 ? (
              <div className="py-4 text-center bg-slate-50 border border-slate-200/80 rounded-lg">
                <p className="text-xs text-slate-500 font-medium">Chưa có tiết học được xếp hôm nay.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* BUỔI SÁNG (Tiết 1..4) */}
                <div className="bg-slate-50/90 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-200/60 pb-1">
                    ☀️ BUỔI SÁNG (TIẾT 1–4)
                  </div>
                  <div className="space-y-1 max-h-[105px] overflow-y-auto pr-0.5">
                    {morningCells.slice(0, 4).map((c, idx) => {
                      const cls = classes.find((clsItem) => clsItem.id === c.classId);
                      const sub = subjects.find((s) => s.id === c.subjectId);
                      return (
                        <div
                          key={c.id || idx}
                          className="flex items-center justify-between text-[11px] font-medium text-slate-800 bg-white p-1 rounded border border-slate-200/60"
                        >
                          <span className="text-slate-500 font-mono font-bold w-6">
                            T{c.periodNumber}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[100px]">
                            {sub?.name || 'Môn học'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200/60 shrink-0">
                            {cls?.name || 'Lớp'}
                          </span>
                        </div>
                      );
                    })}
                    {morningCells.length === 0 && (
                      <div className="text-[11px] text-slate-400 italic py-1 text-center">Không có tiết sáng</div>
                    )}
                  </div>
                </div>

                {/* BUỔI CHIỀU (Tiết 1..3 - STRICTLY NO T5, T6, T7) */}
                <div className="bg-slate-50/90 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider border-b border-slate-200/60 pb-1">
                    🌤 BUỔI CHIỀU (TIẾT 1–3)
                  </div>
                  <div className="space-y-1 max-h-[105px] overflow-y-auto pr-0.5">
                    {afternoonCells.slice(0, 3).map((c, idx) => {
                      const cls = classes.find((clsItem) => clsItem.id === c.classId);
                      const sub = subjects.find((s) => s.id === c.subjectId);
                      // Strict normalization: 5 -> 1, 6 -> 2, 7 -> 3
                      const pNum = c.periodNumber > 4 ? c.periodNumber - 4 : c.periodNumber;
                      return (
                        <div
                          key={c.id || idx}
                          className="flex items-center justify-between text-[11px] font-medium text-slate-800 bg-white p-1 rounded border border-slate-200/60"
                        >
                          <span className="text-slate-500 font-mono font-bold w-6">
                            T{pNum}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[100px]">
                            {sub?.name || 'Môn học'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold text-[10px] border border-amber-200/60 shrink-0">
                            {cls?.name || 'Lớp'}
                          </span>
                        </div>
                      );
                    })}
                    {afternoonCells.length === 0 && (
                      <div className="text-[11px] text-slate-400 italic py-1 text-center">Không có tiết chiều</div>
                    )}
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
