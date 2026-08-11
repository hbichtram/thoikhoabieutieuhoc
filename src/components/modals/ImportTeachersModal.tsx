import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { Teacher, Subject, ClassItem } from '../../types';
import { normalizeTeacher } from '../../utils/teacherUtils';
import {
  downloadTeacherSampleExcel,
  parseTeacherExcelFile,
  ExcelParseResult,
  ExcelTeacherRow,
} from '../../utils/excelTeacherUtils';

interface ImportTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTeachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  onImportTeachers: (
    teachersToImport: Teacher[],
    updatedTeachers: Teacher[],
    importedCount: number,
    skippedCount: number
  ) => void;
}

export const ImportTeachersModal: React.FC<ImportTeachersModalProps> = ({
  isOpen,
  onClose,
  existingTeachers,
  classes,
  subjects,
  onImportTeachers,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [importOnlyValid, setImportOnlyValid] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = parseTeacherExcelFile(
        arrayBuffer,
        existingTeachers,
        classes,
        subjects
      );
      setParseResult(result);
      setStep(3);
    } catch (err) {
      alert('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file .xlsx hoặc .xls!');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleConfirmImport = () => {
    if (!parseResult) return;

    let rowsToProcess = parseResult.rows;
    if (importOnlyValid) {
      rowsToProcess = rowsToProcess.filter((r) => r.isValid);
    } else {
      // Cannot import invalid rows if any severe error exists
      const hasErrors = rowsToProcess.some((r) => !r.isValid);
      if (hasErrors) {
        alert('Vui lòng sửa các dòng bị lỗi hoặc tích chọn "Chỉ nhập các dòng hợp lệ"!');
        return;
      }
    }

    if (rowsToProcess.length === 0) {
      alert('Không có dòng hợp lệ nào để nhập vào hệ thống.');
      return;
    }

    const newTeacherList: Teacher[] = [];
    const updatedTeacherList: Teacher[] = [...existingTeachers];

    let importedCount = 0;
    let skippedCount = 0;

    rowsToProcess.forEach((r) => {
      const existingIndex = updatedTeacherList.findIndex(
        (t) => t.code.trim().toUpperCase() === r.code.trim().toUpperCase()
      );

      if (existingIndex >= 0) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
        } else if (duplicateStrategy === 'update') {
          const existing = updatedTeacherList[existingIndex];
          updatedTeacherList[existingIndex] = normalizeTeacher({
            ...existing,
            name: r.name,
            type: r.type === 'homeroom' ? 'homeroom' : 'subject',
            homeroomClassId: r.type === 'homeroom' ? (r.homeroomClassId || '') : '',
            mainSubjectId: r.type === 'subject' ? (r.mainSubjectId || '') : '',
            maxWeeklyPeriods: r.maxWeeklyPeriods,
            maxSessionsPerWeek: 6,
            maxPeriodsPerDay: r.maxPeriodsPerDay,
          });
          importedCount++;
        }
      } else {
        const newTeacher: Teacher = normalizeTeacher({
          id: `t_excel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          code: r.code,
          name: r.name,
          type: r.type === 'homeroom' ? 'homeroom' : 'subject',
          homeroomClassId: r.type === 'homeroom' ? (r.homeroomClassId || '') : '',
          mainSubjectId: r.type === 'subject' ? (r.mainSubjectId || '') : '',
          maxWeeklyPeriods: r.maxWeeklyPeriods,
          maxSessionsPerWeek: 6,
          maxPeriodsPerDay: r.maxPeriodsPerDay,
          unavailableSlots: [],
        });
        newTeacherList.push(newTeacher);
        updatedTeacherList.push(newTeacher);
        importedCount++;
      }
    });

    onImportTeachers(newTeacherList, updatedTeacherList, importedCount, skippedCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>NHẬP GIÁO VIÊN TỪ FILE EXCEL</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Nhập danh sách giáo viên hàng loạt vào hệ thống TKB SMART nhanh chóng và chính xác.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Progress Steps */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 ${
              step === 1
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
              1
            </span>
            <span>1. Tải file mẫu</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 ${
              step === 2
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
              2
            </span>
            <span>2. Chọn file Excel</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 ${
              step === 3
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
              3
            </span>
            <span>3. Kiểm tra & Nhập</span>
          </div>
        </div>

        {/* Step 1 & 2 Combined View */}
        {step < 3 && (
          <div className="space-y-5">
            {/* Step 1: Download Sample */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Bước 1: Tải file Excel mẫu chuẩn
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Sử dụng file mẫu có sẵn các cột chuẩn để đảm bảo hệ thống nhận diện đúng thông tin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTeacherSampleExcel}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>⬇ Tải file Excel mẫu</span>
                </button>
              </div>

              {/* Column Structure Note */}
              <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Cấu trúc các cột file mẫu:</span>
                <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">STT</span>
                  <span className="bg-blue-50 border border-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded">Mã GV *</span>
                  <span className="bg-blue-50 border border-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded">Họ và tên *</span>
                  <span className="bg-blue-50 border border-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded">Loại GV *</span>
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Lớp chủ nhiệm</span>
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Môn phụ trách</span>
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Tối đa/ngày</span>
                </div>
                <p className="text-slate-400 text-[10px] mt-1.5 italic">
                  * Hệ thống tự xác định định mức tuần: GVCN = 20 tiết/tuần tối đa, GV Bộ môn = 23 tiết/tuần tối đa.
                </p>
              </div>
            </div>

            {/* Step 2: Select / Drag Drop File */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Bước 2: Tải lên file Excel danh sách giáo viên
              </h4>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 rounded-2xl p-8 text-center space-y-3 cursor-pointer transition-all"
              >
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Kéo thả file Excel vào đây</p>
                  <p className="text-slate-500 text-xs mt-1">hoặc bấm nút chọn file từ máy tính của bạn</p>
                </div>

                <label className="inline-block">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <span className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md inline-block transition-all">
                    [Chọn file từ máy tính]
                  </span>
                </label>

                <p className="text-[11px] text-slate-400">Định dạng hỗ trợ: .xlsx, .xls, .csv</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Data Inspection & Preview */}
        {step === 3 && parseResult && (
          <div className="space-y-4">
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">Tổng số dòng:</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{parseResult.totalRows}</div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-medium">🟢 Hợp lệ:</span>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">{parseResult.validRowsCount}</div>
              </div>

              <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                <span className="text-red-700 font-medium">🔴 Lỗi:</span>
                <div className="text-lg font-bold text-red-700 mt-0.5">{parseResult.errorRowsCount}</div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-amber-800 font-medium">⚠️ Đã tồn tại:</span>
                <div className="text-lg font-bold text-amber-800 mt-0.5">{parseResult.existingRowsCount}</div>
              </div>
            </div>

            {/* Error or Duplicate Strategy Settings */}
            {parseResult.errorRowsCount > 0 ? (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2 text-red-900">
                <div className="font-bold flex items-center gap-1.5 text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>File còn {parseResult.errorRowsCount} dòng bị lỗi dữ liệu!</span>
                </div>
                <p>
                  Bạn có thể chọn <b>"Chỉ nhập các dòng hợp lệ ({parseResult.validRowsCount} dòng)"</b> hoặc sửa file Excel và chọn lại.
                </p>
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={importOnlyValid}
                    onChange={(e) => setImportOnlyValid(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Chỉ nhập {parseResult.validRowsCount} dòng hợp lệ (Bỏ qua các dòng bị lỗi)</span>
                </label>
              </div>
            ) : null}

            {/* Duplicate Teacher Strategy Choice */}
            {parseResult.existingRowsCount > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Có {parseResult.existingRowsCount} giáo viên có mã đã tồn tại trong hệ thống:</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-1 font-medium text-slate-800">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      value="skip"
                      checked={duplicateStrategy === 'skip'}
                      onChange={() => setDuplicateStrategy('skip')}
                    />
                    <span>Bỏ qua giáo viên đã tồn tại (Khuyên dùng)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      value="update"
                      checked={duplicateStrategy === 'update'}
                      onChange={() => setDuplicateStrategy('update')}
                    />
                    <span>Cập nhật thông tin giáo viên đã tồn tại</span>
                  </label>
                </div>
              </div>
            )}

            {/* Data Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 bg-white shadow-xs">
                    <th className="p-2.5 pl-3">Mã GV</th>
                    <th className="p-2.5">Họ và tên</th>
                    <th className="p-2.5">Loại GV</th>
                    <th className="p-2.5">Chủ nhiệm</th>
                    <th className="p-2.5">Môn phụ trách</th>
                    <th className="p-2.5">Max/ngày</th>
                    <th className="p-2.5 text-right pr-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {parseResult.rows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={
                        !r.isValid
                          ? 'bg-red-50/60'
                          : r.isExistingInSystem
                          ? 'bg-amber-50/40'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="p-2.5 pl-3 font-mono font-bold text-blue-700">{r.code || '---'}</td>
                      <td className="p-2.5 font-bold text-slate-900">{r.name || '---'}</td>
                      <td className="p-2.5">
                        {r.type === 'homeroom' ? (
                          <span className="text-purple-700 font-semibold">GVCN (20t)</span>
                        ) : r.type === 'subject' ? (
                          <span className="text-slate-700 font-semibold">GV Bộ môn (23t)</span>
                        ) : (
                          <span className="text-red-600 font-bold">Không rõ</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {r.homeroomClassName ? `Lớp ${r.homeroomClassName}` : '---'}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {r.type === 'homeroom' ? 'Theo PC' : r.subjectName || '---'}
                      </td>
                      <td className="p-2.5 text-slate-600">{r.maxPeriodsPerDay} tiết</td>
                      <td className="p-2.5 text-right pr-3">
                        {r.isValid ? (
                          r.isExistingInSystem ? (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                              ⚠️ Đã tồn tại
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                              🟢 Hợp lệ
                            </span>
                          )
                        ) : (
                          <span
                            className="text-[11px] font-bold text-red-800 bg-red-100 border border-red-300 px-2 py-0.5 rounded"
                            title={r.errors.join(', ')}
                          >
                            🔴 {r.errors[0] || 'Lỗi'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setFile(null);
                  setParseResult(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Chọn file khác</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-medium hover:bg-slate-50"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    Xác nhận nhập{' '}
                    {importOnlyValid ? parseResult.validRowsCount : parseResult.totalRows} giáo viên
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
