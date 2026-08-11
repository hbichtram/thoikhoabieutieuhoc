import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Assignment, Teacher, ClassItem, Subject } from '../../types';
import {
  downloadAssignmentSampleExcel,
  downloadAssignmentErrorExcel,
  parseAssignmentExcelFile,
  ExcelAssignmentParseResult,
  ExcelAssignmentRow,
} from '../../utils/excelAssignmentUtils';

interface ImportAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAssignments: Assignment[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  onImportAssignments: (
    newAssignments: Assignment[],
    allAssignments: Assignment[],
    importedCount: number,
    skippedCount: number
  ) => void;
}

type FilterType = 'all' | 'valid' | 'warning' | 'error';

export const ImportAssignmentsModal: React.FC<ImportAssignmentsModalProps> = ({
  isOpen,
  onClose,
  existingAssignments,
  teachers,
  classes,
  subjects,
  onImportAssignments,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ExcelAssignmentParseResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [importOnlyValid, setImportOnlyValid] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = parseAssignmentExcelFile(
        arrayBuffer,
        existingAssignments,
        teachers,
        classes,
        subjects
      );
      setParseResult(result);
      setStep(3);
      setActiveFilter('all');
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
      const hasErrors = rowsToProcess.some((r) => !r.isValid);
      if (hasErrors) {
        alert('Vui lòng sửa các dòng bị lỗi hoặc tích chọn "Chỉ nhập các dòng hợp lệ"!');
        return;
      }
    }

    if (rowsToProcess.length === 0) {
      alert('Không có dòng phân công hợp lệ nào để nhập vào hệ thống.');
      return;
    }

    const newAssignmentsToAdd: Assignment[] = [];
    const updatedAssignmentsList: Assignment[] = [...existingAssignments];

    let importedCount = 0;
    let skippedCount = 0;

    rowsToProcess.forEach((r) => {
      if (!r.teacherId || !r.classId || !r.subjectId || r.periodsPerWeek <= 0) {
        return;
      }

      const existingIndex = updatedAssignmentsList.findIndex(
        (a) =>
          a.teacherId === r.teacherId &&
          a.classId === r.classId &&
          a.subjectId === r.subjectId
      );

      if (existingIndex >= 0) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
        } else if (duplicateStrategy === 'update') {
          const existing = updatedAssignmentsList[existingIndex];
          updatedAssignmentsList[existingIndex] = {
            ...existing,
            periodsPerWeek: r.periodsPerWeek,
          };
          importedCount++;
        }
      } else {
        const uniqueAssignmentId = `a_excel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newAssignment: Assignment = {
          id: uniqueAssignmentId,
          teacherId: r.teacherId,
          classId: r.classId,
          subjectId: r.subjectId,
          periodsPerWeek: r.periodsPerWeek,
        };

        newAssignmentsToAdd.push(newAssignment);
        updatedAssignmentsList.push(newAssignment);
        importedCount++;
      }
    });

    onImportAssignments(
      newAssignmentsToAdd,
      updatedAssignmentsList,
      importedCount,
      skippedCount
    );

    onClose();
  };

  const getFilteredRows = (): ExcelAssignmentRow[] => {
    if (!parseResult) return [];
    if (activeFilter === 'valid') {
      return parseResult.rows.filter((r) => r.isValid && !r.isExistingInSystem);
    }
    if (activeFilter === 'warning') {
      return parseResult.rows.filter((r) => r.isValid && r.isExistingInSystem);
    }
    if (activeFilter === 'error') {
      return parseResult.rows.filter((r) => !r.isValid);
    }
    return parseResult.rows;
  };

  const filteredRows = getFilteredRows();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in duration-200 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>NHẬP PHÂN CÔNG CHUYÊN MÔN TỪ FILE EXCEL</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Nhập hàng loạt phân công chuyên môn từ file Excel cho trường Tiểu học.
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
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
              1
            </span>
            <span>1. Tải file mẫu</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 ${
              step === 2
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
              2
            </span>
            <span>2. Chọn file Excel</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 ${
              step === 3
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Bước 1: Tải file Excel mẫu chuẩn
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Tải file mẫu có cấu trúc các cột chuẩn để điền phân công chuyên môn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadAssignmentSampleExcel}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>⬇ Tải file Excel mẫu</span>
                </button>
              </div>

              {/* Column Structure Note */}
              <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700">Các cột bắt buộc trong file Excel:</span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">STT</span>
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded">Mã GV *</span>
                  <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Họ và tên GV</span>
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded">Lớp *</span>
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded">Môn *</span>
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded">Số tiết/tuần *</span>
                </div>
                <p className="text-slate-500 text-[10px] italic pt-0.5">
                  * Giáo viên, Lớp và Môn trong file Excel phải khớp với danh mục dữ liệu đã có trong hệ thống.
                </p>
              </div>
            </div>

            {/* Step 2: Upload File */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Bước 2: Chọn file Excel phân công cần nhập
              </h4>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 rounded-2xl p-8 text-center space-y-3 cursor-pointer transition-all"
              >
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Kéo thả file Excel vào đây</p>
                  <p className="text-slate-500 text-xs mt-1">hoặc bấm nút bên dưới để chọn file từ máy tính</p>
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
                  <span className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md inline-block transition-all">
                    [Chọn file từ máy tính]
                  </span>
                </label>

                <p className="text-[11px] text-slate-400">Hỗ trợ các định dạng file: .xlsx, .xls, .csv</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Filter Table */}
        {step === 3 && parseResult && (
          <div className="space-y-4">
            {/* Stats Overview Summary */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">Tổng số dòng:</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{parseResult.totalRows}</div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-medium">🟢 Hợp lệ:</span>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">{parseResult.validRowsCount}</div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-amber-800 font-medium">⚠️ Đã tồn tại:</span>
                <div className="text-lg font-bold text-amber-800 mt-0.5">{parseResult.existingRowsCount}</div>
              </div>

              <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                <span className="text-red-700 font-medium">🔴 Lỗi:</span>
                <div className="text-lg font-bold text-red-700 mt-0.5">{parseResult.errorRowsCount}</div>
              </div>
            </div>

            {/* Error Log Download Alert */}
            {parseResult.errorRowsCount > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2 text-red-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold flex items-center gap-1.5 text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Có {parseResult.errorRowsCount} dòng bị lỗi không thể nhập trực tiếp.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadAssignmentErrorExcel(parseResult.rows)}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>⬇ Tải danh sách lỗi</span>
                  </button>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Nguyên nhân phổ biến: Mã giáo viên / Lớp / Môn chưa tồn tại trong hệ thống hoặc tổng số tiết vượt quá giới hạn quy định (20/23 tiết).
                </p>
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={importOnlyValid}
                    onChange={(e) => setImportOnlyValid(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Chỉ nhập các dòng hợp lệ ({parseResult.validRowsCount} dòng)</span>
                </label>
              </div>
            )}

            {/* Duplicate Strategy Option */}
            {parseResult.existingRowsCount > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Có {parseResult.existingRowsCount} phân công đã tồn tại trong hệ thống:</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-0.5 font-medium text-slate-800">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategyAssign"
                      value="skip"
                      checked={duplicateStrategy === 'skip'}
                      onChange={() => setDuplicateStrategy('skip')}
                    />
                    <span>Bỏ qua các phân công đã tồn tại (Mặc định)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategyAssign"
                      value="update"
                      checked={duplicateStrategy === 'update'}
                      onChange={() => setDuplicateStrategy('update')}
                    />
                    <span>Cập nhật số tiết nếu đã tồn tại</span>
                  </label>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({parseResult.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('valid')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'valid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  🟢 Hợp lệ ({parseResult.validRowsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('warning')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'warning'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  ⚠️ Đã có ({parseResult.existingRowsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('error')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'error'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-red-700 hover:bg-red-50'
                  }`}
                >
                  🔴 Lỗi ({parseResult.errorRowsCount})
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Đang hiển thị {filteredRows.length} dòng
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 bg-white shadow-xs">
                    <th className="p-2.5 pl-3">Mã GV</th>
                    <th className="p-2.5">Giáo viên</th>
                    <th className="p-2.5">Lớp</th>
                    <th className="p-2.5">Môn học</th>
                    <th className="p-2.5">Số tiết</th>
                    <th className="p-2.5">Trạng thái</th>
                    <th className="p-2.5 text-right pr-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Không có dữ liệu trong mục này.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => (
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
                        <td className="p-2.5 pl-3 font-mono font-bold text-indigo-700">
                          {r.rawTeacherCode || '---'}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {r.teacherName || r.rawTeacherName || '---'}
                        </td>
                        <td className="p-2.5">
                          {r.className ? (
                            <span className="font-bold text-indigo-700">Lớp {r.className}</span>
                          ) : (
                            <span className="text-slate-400">{r.rawClassName || '---'}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-800">
                          {r.subjectName || r.rawSubjectName || '---'}
                        </td>
                        <td className="p-2.5 font-bold text-purple-700">
                          {r.periodsPerWeek ? `${r.periodsPerWeek} tiết` : r.rawPeriods || '---'}
                        </td>
                        <td className="p-2.5">
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
                            <span className="text-[11px] font-bold text-red-800 bg-red-100 border border-red-300 px-2 py-0.5 rounded">
                              🔴 Lỗi
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right pr-3 text-[11px] text-slate-500 max-w-xs truncate">
                          {!r.isValid ? (
                            <span className="text-red-600 font-medium">{r.errors[0]}</span>
                          ) : r.warnings.length > 0 ? (
                            <span className="text-amber-700">{r.warnings[0]}</span>
                          ) : (
                            <span className="text-emerald-600">Sẵn sàng nhập</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
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
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    Xác nhận nhập{' '}
                    {importOnlyValid ? parseResult.validRowsCount : parseResult.totalRows} phân công
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
