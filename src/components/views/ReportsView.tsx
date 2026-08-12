import React, { useState } from 'react';
import {
  Download,
  Printer,
  BarChart3,
  Calendar,
  Users,
  GraduationCap,
} from 'lucide-react';
import {
  ScheduleCell,
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  DayOfWeek,
  PeriodShift,
} from '../../types';
import { getTeacherSessions, getTeacherGapPeriods } from '../../utils/teacherUtils';
import { normalizeScheduleCells, isCellForAssignment, countPlacedPeriodsForAssignment } from '../../utils/timetableUtils';

interface ReportsViewProps {
  cells: ScheduleCell[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
  timeConfig: TimeConfig;
}

// Single Schedule Printable Card Component
const PrintableScheduleCard: React.FC<{
  type: 'teacher' | 'class';
  timeConfig: TimeConfig;
  days: DayOfWeek[];
  teacher?: Teacher;
  classItem?: ClassItem;
  cells: ScheduleCell[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
}> = ({
  type,
  timeConfig,
  days,
  teacher,
  classItem,
  cells,
  teachers,
  classes,
  subjects,
  assignments,
}) => {
  const formattedPrintTime = new Date().toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const mainSubjectName = teacher?.mainSubjectId
    ? subjects.find((s) => s.id === teacher.mainSubjectId)?.name || 'N/A'
    : 'N/A';

  const homeroomTeacherName = classItem?.homeroomTeacherId
    ? teachers.find((t) => t.id === classItem.homeroomTeacherId)?.name || 'Chưa phân công'
    : 'Chưa phân công';

  const maxWeeklyPeriods = teacher?.maxWeeklyPeriods || (teacher?.type === 'homeroom' ? 20 : 23);
  const maxPeriodsPerDay = teacher?.maxPeriodsPerDay || 4;
  const maxSessionsPerWeek = teacher?.maxSessionsPerWeek || 6;

  const totalClassPeriods = classItem
    ? assignments.filter((a) => a.classId === classItem.id).reduce((sum, a) => sum + a.periodsPerWeek, 0)
    : 0;

  const getCell = (day: DayOfWeek, shift: PeriodShift, pNum: number) => {
    if (type === 'teacher' && teacher) {
      return cells.find(
        (c) => c.teacherId === teacher.id && c.day === day && c.shift === shift && c.periodNumber === pNum
      );
    }
    if (type === 'class' && classItem) {
      return cells.find(
        (c) => c.classId === classItem.id && c.day === day && c.shift === shift && c.periodNumber === pNum
      );
    }
    return undefined;
  };

  const renderCellContent = (cell?: ScheduleCell) => {
    if (!cell) {
      return <span className="text-slate-400 font-normal text-xs">–</span>;
    }

    if (type === 'teacher') {
      const sub = subjects.find((s) => s.id === cell.subjectId);
      const cls = classes.find((c) => c.id === cell.classId);
      if (!sub && !cls) return <span className="text-slate-400 font-normal text-xs">–</span>;
      return (
        <div className="py-0.5 leading-snug">
          <div className="font-extrabold text-slate-900 text-xs">{cls ? `Lớp ${cls.name}` : ''}</div>
          <div className="text-[11px] font-semibold text-blue-900">{sub?.name || ''}</div>
        </div>
      );
    }

    // class type
    const sub = subjects.find((s) => s.id === cell.subjectId);
    const tch = teachers.find((t) => t.id === cell.teacherId);
    if (!sub && !tch) return <span className="text-slate-400 font-normal text-xs">–</span>;
    return (
      <div className="py-0.5 leading-snug">
        <div className="font-extrabold text-slate-900 text-xs">{sub?.name || ''}</div>
        <div className="text-[10px] text-slate-600 font-medium">{tch ? `GV: ${tch.name}` : ''}</div>
      </div>
    );
  };

  return (
    <div className="print-page bg-white p-4 border border-slate-300 rounded-xl shadow-xs print:shadow-none print:border-none print:p-0 my-2 space-y-3 font-sans text-slate-900">
      {/* HEADER SECTION */}
      <div className="grid grid-cols-3 items-center border-b-2 border-slate-900 pb-3 mb-2 text-slate-900">
        {/* Left */}
        <div className="text-left">
          <div className="font-black text-sm uppercase tracking-wider text-slate-900">TKB SMART</div>
          <div className="text-[11px] text-slate-600 font-medium">Trợ lý thiết kế thời khóa biểu trường tiểu học</div>
        </div>

        {/* Center */}
        <div className="text-center">
          <h1 className="font-black text-xl text-slate-900 uppercase tracking-widest leading-tight">
            THỜI KHÓA BIỂU
          </h1>
          <p className="text-xs font-bold text-slate-700 mt-0.5">
            Năm học: <span className="font-extrabold text-slate-900">{timeConfig.schoolYear}</span> | Học kỳ: <span className="font-extrabold text-slate-900">{timeConfig.semester}</span>
          </p>
        </div>

        {/* Right */}
        <div className="text-right text-xs space-y-0.5 font-medium text-slate-800">
          {type === 'teacher' && teacher && (
            <>
              <div>Giáo viên: <span className="font-extrabold text-slate-900">{teacher.name} ({teacher.code})</span></div>
              <div>Môn chính: <span className="font-bold text-blue-900">{mainSubjectName}</span></div>
            </>
          )}
          {type === 'class' && classItem && (
            <>
              <div>Lớp: <span className="font-extrabold text-slate-900">Lớp {classItem.name}</span></div>
              <div>GVCN: <span className="font-bold text-slate-900">{homeroomTeacherName}</span></div>
            </>
          )}
        </div>
      </div>

      {/* TABLE SECTION */}
      <table className="w-full text-center border-collapse border-2 border-slate-900 text-xs my-2">
        <thead>
          <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
            <th className="p-2 border border-slate-700 w-28 bg-slate-900 text-white">BUỔI / TIẾT</th>
            {days.map((day) => (
              <th key={day} className="p-2 border border-slate-700 bg-slate-900 text-white font-extrabold">
                THỨ {day.replace('T', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* BUỔI SÁNG — BẮT BUỘC 4 TIẾT */}
          <tr className="bg-blue-100/90 text-blue-950 font-extrabold text-[11px] border-y-2 border-slate-900">
            <td colSpan={6} className="px-3 py-1.5 text-left uppercase tracking-wider bg-blue-100">
              ☀ BUỔI SÁNG
            </td>
          </tr>
          {[1, 2, 3, 4].map((pNum) => (
            <tr key={`m_${pNum}`} className="border-b border-slate-300">
              <td className="p-2 font-extrabold bg-blue-50/60 text-slate-900 border-r border-slate-400 w-28 text-xs">
                TIẾT {pNum}
              </td>
              {days.map((day) => (
                <td key={day} className="p-1.5 border-r border-slate-300 vertical-top h-10">
                  {renderCellContent(getCell(day, 'morning', pNum))}
                </td>
              ))}
            </tr>
          ))}

          {/* BUỔI CHIỀU — BẮT BUỘC 3 TIẾT */}
          <tr className="bg-amber-100/90 text-amber-950 font-extrabold text-[11px] border-y-2 border-slate-900">
            <td colSpan={6} className="px-3 py-1.5 text-left uppercase tracking-wider bg-amber-100">
              🌙 BUỔI CHIỀU
            </td>
          </tr>
          {[1, 2, 3].map((pNum) => (
            <tr key={`a_${pNum}`} className="border-b border-slate-300">
              <td className="p-2 font-extrabold bg-amber-50/60 text-slate-900 border-r border-slate-400 w-28 text-xs">
                TIẾT {pNum}
              </td>
              {days.map((day) => (
                <td key={day} className="p-1.5 border-r border-slate-300 vertical-top h-10">
                  {renderCellContent(getCell(day, 'afternoon', pNum))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* BOTTOM INFO SECTION */}
      <div className="grid grid-cols-3 gap-3 pt-2 text-xs text-slate-900">
        {/* Left: GHI CHÚ */}
        <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg space-y-1">
          <div className="font-extrabold text-[11px] text-slate-900 uppercase">GHI CHÚ:</div>
          <ul className="text-[11px] text-slate-700 space-y-0.5 list-disc list-inside">
            <li>Buổi sáng: 4 tiết (Tiết 1 → Tiết 4)</li>
            <li>Buổi chiều: 3 tiết (Tiết 1 → Tiết 3)</li>
            <li>Mỗi ngày tối đa: 7 tiết</li>
          </ul>
        </div>

        {/* Center: THÔNG TIN GIÁO VIÊN / LỚP HỌC */}
        <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg space-y-0.5 text-[11px]">
          {type === 'teacher' && teacher && (
            <>
              <div className="font-extrabold text-slate-900 uppercase mb-1 border-b border-slate-200 pb-0.5">
                THÔNG TIN GIÁO VIÊN
              </div>
              <div>Mã giáo viên: <span className="font-bold">{teacher.code}</span></div>
              <div>Họ và tên: <span className="font-bold">{teacher.name}</span></div>
              <div>Môn chính: <span className="font-bold">{mainSubjectName}</span></div>
              <div>Định mức: <span className="font-bold">{maxWeeklyPeriods} tiết/tuần</span></div>
              <div>Tối đa/ngày: <span className="font-bold">{maxPeriodsPerDay} tiết</span></div>
              <div>Số buổi tối đa/tuần: <span className="font-bold">{maxSessionsPerWeek} buổi</span></div>
            </>
          )}
          {type === 'class' && classItem && (
            <>
              <div className="font-extrabold text-slate-900 uppercase mb-1 border-b border-slate-200 pb-0.5">
                THÔNG TIN LỚP HỌC
              </div>
              <div>Lớp: <span className="font-bold">Lớp {classItem.name}</span></div>
              <div>Khối: <span className="font-bold">Khối {classItem.grade}</span></div>
              <div>GVCN: <span className="font-bold">{homeroomTeacherName}</span></div>
              <div>Ca học: <span className="font-bold">{classItem.shift === 'morning' ? 'Buổi sáng' : classItem.shift === 'afternoon' ? 'Buổi chiều' : 'Cả hai buổi'}</span></div>
              <div>Tổng tiết phân công: <span className="font-bold">{totalClassPeriods} tiết/tuần</span></div>
            </>
          )}
        </div>

        {/* Right: CHỮ KÝ */}
        <div className="text-center text-xs flex flex-col justify-between pt-0.5">
          <div>
            <p className="italic text-slate-700 text-[11px]">Ngày ...... tháng ...... năm 20....</p>
            <p className="font-extrabold text-slate-900 uppercase mt-1">
              {type === 'teacher' ? 'GIÁO VIÊN' : 'GIÁO VIÊN CHỦ NHIỆM'}
            </p>
            <p className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="h-6"></div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-300 pt-1.5 text-[10px] text-slate-500 font-medium">
        <span>In lúc: {formattedPrintTime}</span>
        <span>TKB SMART v1.0 | Trang 1/1</span>
      </div>
    </div>
  );
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  cells,
  teachers,
  classes,
  subjects,
  assignments,
  timeConfig,
}) => {
  const normalizedCells = normalizeScheduleCells(cells || [], assignments);

  React.useEffect(() => {
    console.log(`[REPORT LOAD] scheduleEntries.length: ${normalizedCells.length}`);
    let totalPlaced = 0;
    assignments.forEach((a) => {
      totalPlaced += countPlacedPeriodsForAssignment(normalizedCells, a);
    });
    console.log(`[REPORT CALC] placedCount: ${totalPlaced}`);
  }, [normalizedCells, assignments]);

  const [reportType, setReportType] = useState<'school' | 'classes' | 'teachers' | 'workload'>(
    'school'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');

  const days: DayOfWeek[] = timeConfig.enabledDays;

  // Handle Export Excel / CSV with UTF-8 BOM
  const exportToExcel = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Vietnamese text
    csvContent += `THỜI KHÓA BIỂU NĂM HỌC ${timeConfig.schoolYear} - HỌC KỲ ${timeConfig.semester}\n\n`;

    if (reportType === 'school' || reportType === 'classes') {
      const clsList = reportType === 'classes' ? classes.filter((c) => c.id === selectedClassId) : classes;

      clsList.forEach((cls) => {
        csvContent += `LỚP ${cls.name}\n`;
        csvContent += `Buổi,Tiết,Thứ 2,Thứ 3,Thứ 4,Thứ 5,Thứ 6\n`;

        // Morning (4 periods)
        [1, 2, 3, 4].forEach((pNum) => {
          let line = `Sáng,Tiết ${pNum}`;
          days.forEach((day) => {
            const cell = cells.find(
              (c) => c.classId === cls.id && c.day === day && c.shift === 'morning' && c.periodNumber === pNum
            );
            const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
            const tch = cell ? teachers.find((t) => t.id === cell.teacherId) : null;
            const text = sub ? `"${sub.name} (${tch?.name || ''})"` : '""';
            line += `,${text}`;
          });
          csvContent += `${line}\n`;
        });

        // Afternoon (3 periods)
        [1, 2, 3].forEach((pNum) => {
          let line = `Chiều,Tiết ${pNum}`;
          days.forEach((day) => {
            const cell = cells.find(
              (c) => c.classId === cls.id && c.day === day && c.shift === 'afternoon' && c.periodNumber === pNum
            );
            const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
            const tch = cell ? teachers.find((t) => t.id === cell.teacherId) : null;
            const text = sub ? `"${sub.name} (${tch?.name || ''})"` : '""';
            line += `,${text}`;
          });
          csvContent += `${line}\n`;
        });

        csvContent += `\n`;
      });
    } else if (reportType === 'teachers') {
      const tchList = teachers.filter((t) => t.id === selectedTeacherId);
      tchList.forEach((tch) => {
        csvContent += `GIÁO VIÊN: ${tch.name} (${tch.code})\n`;
        csvContent += `Buổi,Tiết,Thứ 2,Thứ 3,Thứ 4,Thứ 5,Thứ 6\n`;

        // Morning (4 periods)
        [1, 2, 3, 4].forEach((pNum) => {
          let line = `Sáng,Tiết ${pNum}`;
          days.forEach((day) => {
            const cell = cells.find(
              (c) => c.teacherId === tch.id && c.day === day && c.shift === 'morning' && c.periodNumber === pNum
            );
            const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
            const cls = cell ? classes.find((c) => c.id === cell.classId) : null;
            const text = sub ? `"${sub.name} - Lớp ${cls?.name || ''}"` : '""';
            line += `,${text}`;
          });
          csvContent += `${line}\n`;
        });

        // Afternoon (3 periods)
        [1, 2, 3].forEach((pNum) => {
          let line = `Chiều,Tiết ${pNum}`;
          days.forEach((day) => {
            const cell = cells.find(
              (c) => c.teacherId === tch.id && c.day === day && c.shift === 'afternoon' && c.periodNumber === pNum
            );
            const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
            const cls = cell ? classes.find((c) => c.id === cell.classId) : null;
            const text = sub ? `"${sub.name} - Lớp ${cls?.name || ''}"` : '""';
            line += `,${text}`;
          });
          csvContent += `${line}\n`;
        });

        csvContent += `\n`;
      });
    } else {
      csvContent += `BÁO CÁO TỔNG SỐ TIẾT NĂM HỌC ${timeConfig.schoolYear}\n\n`;
      csvContent += `Giáo viên,Mã GV,Môn chính,Tổng tiết phân công/tuần\n`;
      teachers.forEach((t) => {
        const total = assignments.filter((a) => a.teacherId === t.id).reduce((sum, a) => sum + a.periodsPerWeek, 0);
        const sub = subjects.find((s) => s.id === t.mainSubjectId);
        csvContent += `"${t.name}",${t.code},"${sub?.name || ''}",${total}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TKB_SMART_BAOCAO_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Control Header Bar (Hidden on print) */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>Báo cáo & Xuất Bảng Thời khóa biểu</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Xem TKB toàn trường, TKB lớp, TKB giáo viên và xuất tệp Excel / in ấn khổ giấy A4 ngang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel (.csv)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In trang này (A4 Ngang)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Hidden on print) */}
      <div className="print:hidden flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-semibold w-fit">
        <button
          onClick={() => setReportType('school')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            reportType === 'school' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TKB Toàn trường
        </button>
        <button
          onClick={() => setReportType('classes')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            reportType === 'classes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TKB Từng lớp
        </button>
        <button
          onClick={() => setReportType('teachers')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            reportType === 'teachers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TKB Từng giáo viên
        </button>
        <button
          onClick={() => setReportType('workload')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            reportType === 'workload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Thống kê Số tiết
        </button>
      </div>

      {/* View Content Area */}
      <div className="space-y-6">
        {/* 1. TKB TOÀN TRƯỜNG */}
        {reportType === 'school' && (
          <div className="space-y-8">
            {classes.map((cls) => (
              <div key={cls.id} className="print-page-break">
                <PrintableScheduleCard
                  type="class"
                  timeConfig={timeConfig}
                  days={days}
                  classItem={cls}
                  cells={normalizedCells}
                  teachers={teachers}
                  classes={classes}
                  subjects={subjects}
                  assignments={assignments}
                />
              </div>
            ))}
          </div>
        )}

        {/* 2. TKB TỪNG LỚP */}
        {reportType === 'classes' && (
          <div className="space-y-4">
            <div className="print:hidden flex items-center gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-700">Chọn lớp học:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} (Khối {c.grade})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const cls = classes.find((c) => c.id === selectedClassId);
              if (!cls) return null;
              return (
                <PrintableScheduleCard
                  type="class"
                  timeConfig={timeConfig}
                  days={days}
                  classItem={cls}
                  cells={normalizedCells}
                  teachers={teachers}
                  classes={classes}
                  subjects={subjects}
                  assignments={assignments}
                />
              );
            })()}
          </div>
        )}

        {/* 3. TKB TỪNG GIÁO VIÊN */}
        {reportType === 'teachers' && (
          <div className="space-y-4">
            <div className="print:hidden flex items-center gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-700">Chọn giáo viên:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) - {subjects.find((s) => s.id === t.mainSubjectId)?.name || 'Bộ môn'}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const tch = teachers.find((t) => t.id === selectedTeacherId);
              if (!tch) return null;
              return (
                <PrintableScheduleCard
                  type="teacher"
                  timeConfig={timeConfig}
                  days={days}
                  teacher={tch}
                  cells={normalizedCells}
                  teachers={teachers}
                  classes={classes}
                  subjects={subjects}
                  assignments={assignments}
                />
              );
            })()}
          </div>
        )}

        {/* 4. THỐNG KÊ SỐ TIẾT */}
        {reportType === 'workload' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h3 className="font-bold text-slate-900 text-base">Thống kê Tổng số tiết Phân công Giảng dạy</h3>

            <div className="space-y-6">
              {/* Teacher Workload Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-3 font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Thống kê Chi tiết Giáo viên: Tiết dạy, Buổi dạy & Tiết trống TKB</span>
                  <span className="text-[11px] font-normal text-slate-500">Giới hạn cứng: Tối đa 6 buổi/tuần</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="p-2.5">Giáo viên</th>
                      <th className="p-2.5">Mã GV</th>
                      <th className="p-2.5 text-center">Số tiết</th>
                      <th className="p-2.5 text-center">Số buổi TKB</th>
                      <th className="p-2.5 text-center">Số tiết trống</th>
                      <th className="p-2.5 text-center">Mức độ tối ưu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t) => {
                      const totalPeriods = assignments
                        .filter((a) => a.teacherId === t.id)
                        .reduce((sum, a) => sum + a.periodsPerWeek, 0);
                      const sessionCount = getTeacherSessions(t.id, normalizedCells).size;
                      const gapCount = getTeacherGapPeriods(t.id, normalizedCells);

                      let optLabel = '🟢 Tối ưu xuất sắc';
                      let optClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';

                      if (sessionCount > 6) {
                        optLabel = '🔴 Vi phạm 6 buổi';
                        optClass = 'bg-red-50 text-red-800 border-red-300 font-bold';
                      } else if (gapCount >= 3) {
                        optLabel = '🟠 Nhiều tiết trống';
                        optClass = 'bg-amber-50 text-amber-800 border-amber-300';
                      } else if (gapCount > 0) {
                        optLabel = '🟡 Có 1-2 tiết trống';
                        optClass = 'bg-yellow-50 text-yellow-800 border-yellow-300';
                      } else if (sessionCount === 6) {
                        optLabel = '🟢 Đủ 6 buổi / Tối ưu';
                        optClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      }

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900">{t.name}</td>
                          <td className="p-2.5 text-slate-500 font-mono">{t.code}</td>
                          <td className="p-2.5 text-center font-bold text-purple-700">{totalPeriods} tiết</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${sessionCount > 6 ? 'bg-red-50 text-red-700 border-red-300' : sessionCount === 6 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                              {sessionCount}/6 buổi
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {gapCount > 0 ? (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {gapCount} tiết
                              </span>
                            ) : (
                              <span className="text-emerald-700">0 tiết</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${optClass}`}>
                              {optLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Class Workload Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-3 font-bold text-xs uppercase tracking-wider text-slate-700">
                  Tổng tiết định mức theo Lớp
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="p-2.5">Lớp học</th>
                      <th className="p-2.5">Khối</th>
                      <th className="p-2.5 text-right">Tổng tiết học/tuần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classes.map((c) => {
                      const total = assignments
                        .filter((a) => a.classId === c.id)
                        .reduce((sum, a) => sum + a.periodsPerWeek, 0);
                      return (
                        <tr key={c.id}>
                          <td className="p-2.5 font-bold text-slate-900">Lớp {c.name}</td>
                          <td className="p-2.5 text-slate-500">Khối {c.grade}</td>
                          <td className="p-2.5 text-right font-bold text-indigo-700">{total} tiết</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
