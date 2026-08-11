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

interface ReportsViewProps {
  cells: ScheduleCell[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
  timeConfig: TimeConfig;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  cells,
  teachers,
  classes,
  subjects,
  assignments,
  timeConfig,
}) => {
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

        // Morning
        [1, 2, 3, 4, 5].map((pNum) => {
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

        // Afternoon
        [1, 2, 3, 4, 5].map((pNum) => {
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

        [1, 2, 3, 4, 5].map((pNum) => {
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
      {/* Print Hide header */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>Báo cáo & Xuất Bảng Thời khóa biểu</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Xem TKB toàn trường, TKB lớp, TKB giáo viên và xuất tệp Excel / in ấn khổ giấy A4/A3.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel (.csv)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>In trang này</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="print:hidden flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-semibold w-fit">
        <button
          onClick={() => setReportType('school')}
          className={`px-4 py-2 rounded-xl transition-all ${
            reportType === 'school' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TKB Toàn trường
        </button>
        <button
          onClick={() => setReportType('classes')}
          className={`px-4 py-2 rounded-xl transition-all ${
            reportType === 'classes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TKB Từng lớp
        </button>
        <button
          onClick={() => setReportType('teachers')}
          className={`px-4 py-2 rounded-xl transition-all ${
            reportType === 'teachers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TKB Từng giáo viên
        </button>
        <button
          onClick={() => setReportType('workload')}
          className={`px-4 py-2 rounded-xl transition-all ${
            reportType === 'workload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Thống kê Số tiết
        </button>
      </div>

      {/* View Content Area */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 space-y-6">
        {/* Printable Header */}
        <div className="text-center border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
            TRƯỜNG TIỂU HỌC - BẢNG THỜI KHÓA BIỂU
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Năm học: <b>{timeConfig.schoolYear}</b> — Học kỳ: <b>{timeConfig.semester}</b>
          </p>
        </div>

        {/* 1. TKB TOÀN TRƯỜNG */}
        {reportType === 'school' && (
          <div className="space-y-8">
            {classes.map((cls) => (
              <div key={cls.id} className="space-y-2 page-break-inside-avoid">
                <h3 className="font-bold text-slate-900 text-sm bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  LỚP {cls.name} (GVCN: {teachers.find((t) => t.id === cls.homeroomTeacherId)?.name || 'Chưa phân'})
                </h3>

                <table className="w-full text-center border-collapse text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-200 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 w-20">Buổi / Tiết</th>
                      {days.map((day) => (
                        <th key={day} className="p-2 border-r border-slate-300">
                          THỨ {day.replace('T', '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((pNum) => (
                      <tr key={`m_${pNum}`} className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-300">Sáng T{pNum}</td>
                        {days.map((day) => {
                          const cell = cells.find(
                            (c) => c.classId === cls.id && c.day === day && c.shift === 'morning' && c.periodNumber === pNum
                          );
                          const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
                          const tch = cell ? teachers.find((t) => t.id === cell.teacherId) : null;

                          return (
                            <td key={day} className="p-2 border-r border-slate-300">
                              {sub ? (
                                <div>
                                  <div className="font-bold text-slate-900">{sub.name}</div>
                                  <div className="text-[10px] text-slate-500">{tch?.name}</div>
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* 2. TKB TỪNG LỚP */}
        {reportType === 'classes' && (
          <div className="space-y-4">
            <div className="print:hidden flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-slate-600">Chọn lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const cls = classes.find((c) => c.id === selectedClassId);
              if (!cls) return null;
              return (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-base">
                    LỚP {cls.name} (GVCN: {teachers.find((t) => t.id === cls.homeroomTeacherId)?.name || 'Chưa phân'})
                  </h3>

                  <table className="w-full text-center border-collapse text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold border-b border-slate-800">
                        <th className="p-3 border-r border-slate-700">Buổi / Tiết</th>
                        {days.map((day) => (
                          <th key={day} className="p-3 border-r border-slate-700">
                            THỨ {day.replace('T', '')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-blue-100 font-bold text-blue-900 text-left">
                        <td colSpan={6} className="px-3 py-1 text-[11px]">
                          BUỔI SÁNG
                        </td>
                      </tr>
                      {[1, 2, 3, 4, 5].map((pNum) => (
                        <tr key={`m_${pNum}`} className="border-b border-slate-200">
                          <td className="p-3 font-bold bg-slate-50 border-r border-slate-300">TIẾT {pNum}</td>
                          {days.map((day) => {
                            const cell = cells.find(
                              (c) => c.classId === cls.id && c.day === day && c.shift === 'morning' && c.periodNumber === pNum
                            );
                            const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
                            const tch = cell ? teachers.find((t) => t.id === cell.teacherId) : null;

                            return (
                              <td key={day} className="p-3 border-r border-slate-300">
                                {sub ? (
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                                    <div className="text-xs text-slate-500 font-medium">{tch?.name}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      <tr className="bg-amber-100 font-bold text-amber-900 text-left">
                        <td colSpan={6} className="px-3 py-1 text-[11px]">
                          BUỔI CHIỀU
                        </td>
                      </tr>
                      {[1, 2, 3, 4, 5].map((pNum) => (
                        <tr key={`a_${pNum}`} className="border-b border-slate-200">
                          <td className="p-3 font-bold bg-slate-50 border-r border-slate-300">TIẾT {pNum}</td>
                          {days.map((day) => {
                            const cell = cells.find(
                              (c) => c.classId === cls.id && c.day === day && c.shift === 'afternoon' && c.periodNumber === pNum
                            );
                            const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
                            const tch = cell ? teachers.find((t) => t.id === cell.teacherId) : null;

                            return (
                              <td key={day} className="p-3 border-r border-slate-300">
                                {sub ? (
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                                    <div className="text-xs text-slate-500 font-medium">{tch?.name}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. TKB TỪNG GIÁO VIÊN */}
        {reportType === 'teachers' && (
          <div className="space-y-4">
            <div className="print:hidden flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-slate-600">Chọn giáo viên:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const tch = teachers.find((t) => t.id === selectedTeacherId);
              if (!tch) return null;
              return (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-base">
                    GIÁO VIÊN: {tch.name} ({tch.code}) - Môn chính: {subjects.find((s) => s.id === tch.mainSubjectId)?.name || 'N/A'}
                  </h3>

                  <table className="w-full text-center border-collapse text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold border-b border-slate-800">
                        <th className="p-3 border-r border-slate-700">Buổi / Tiết</th>
                        {days.map((day) => (
                          <th key={day} className="p-3 border-r border-slate-700">
                            THỨ {day.replace('T', '')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-blue-100 font-bold text-blue-900 text-left">
                        <td colSpan={6} className="px-3 py-1 text-[11px]">
                          BUỔI SÁNG
                        </td>
                      </tr>
                      {[1, 2, 3, 4, 5].map((pNum) => (
                        <tr key={`m_${pNum}`} className="border-b border-slate-200">
                          <td className="p-3 font-bold bg-slate-50 border-r border-slate-300">TIẾT {pNum}</td>
                          {days.map((day) => {
                            const cell = cells.find(
                              (c) => c.teacherId === tch.id && c.day === day && c.shift === 'morning' && c.periodNumber === pNum
                            );
                            const sub = cell ? subjects.find((s) => s.id === cell.subjectId) : null;
                            const cls = cell ? classes.find((c) => c.id === cell.classId) : null;

                            return (
                              <td key={day} className="p-3 border-r border-slate-300">
                                {sub ? (
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                                    <div className="text-xs text-indigo-700 font-bold">Lớp {cls?.name}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* 4. THỐNG KÊ SỐ TIẾT */}
        {reportType === 'workload' && (
          <div className="space-y-6">
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
                      const sessionCount = getTeacherSessions(t.id, cells).size;
                      const gapCount = getTeacherGapPeriods(t.id, cells);

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
