import React, { useState, useMemo } from 'react';
import { X, Search, Check, CheckSquare, Square, AlertTriangle, CheckCircle2, User, BookOpen, Layers } from 'lucide-react';
import { Assignment, Teacher, ClassItem, Subject } from '../../types';
import { getTeacherMaxWeeklyPeriods, calculateTeacherWeeklyPeriods } from '../../utils/teacherUtils';

interface AddAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
  onAddAssignments: (newAssignments: Assignment[], successSummary: string) => void;
}

export const AddAssignmentModal: React.FC<AddAssignmentModalProps> = ({
  isOpen,
  onClose,
  teachers,
  classes,
  subjects,
  assignments,
  onAddAssignments,
}) => {
  if (!isOpen) return null;

  // Selected Teacher state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState<boolean>(false);

  // Matrix Filter Searches
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  const [classSearch, setClassSearch] = useState<string>('');

  // Selected Matrix Cell Keys: Set of "${subjectId}___${classId}"
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(new Set());

  // Current Teacher object
  const currentTeacher = useMemo(() => {
    return teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
  }, [teachers, selectedTeacherId]);

  // Max weekly periods for selected teacher (20 for homeroom / 23 for subject teacher)
  const maxWeeklyPeriods = useMemo(() => {
    if (!currentTeacher) return 23;
    return getTeacherMaxWeeklyPeriods(currentTeacher);
  }, [currentTeacher]);

  // Currently assigned weekly periods for this teacher in system (excluding new modal selection)
  const currentAssignedPeriods = useMemo(() => {
    if (!currentTeacher) return 0;
    return calculateTeacherWeeklyPeriods(currentTeacher.id, assignments);
  }, [currentTeacher, assignments]);

  // Remaining available periods teacher can still take within max limit
  const remainingCapacity = useMemo(() => {
    return Math.max(0, maxWeeklyPeriods - currentAssignedPeriods);
  }, [maxWeeklyPeriods, currentAssignedPeriods]);

  // Filtered Teachers for search dropdown
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase().trim();
    return teachers.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.code && t.code.toLowerCase().includes(q))
    );
  }, [teachers, teacherSearch]);

  // Filtered Subjects for matrix rows
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const q = subjectSearch.toLowerCase().trim();
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, subjectSearch]);

  // Filtered Classes for matrix columns
  const filteredClasses = useMemo(() => {
    if (!classSearch.trim()) return classes;
    const q = classSearch.toLowerCase().trim();
    return classes.filter(
      (c) => c.name.toLowerCase().includes(q) || `khoi ${c.grade}`.includes(q) || `lớp ${c.name}`.toLowerCase().includes(q)
    );
  }, [classes, classSearch]);

  // Existing assignments lookup map: key = "${subjectId}___${classId}"
  const existingAssignmentsMap = useMemo(() => {
    const map = new Map<string, { isAssigned: boolean; teacherName?: string; isCurrentTeacher?: boolean }>();
    assignments.forEach((a) => {
      const key = `${a.subjectId}___${a.classId}`;
      const assignedTeacher = teachers.find((t) => t.id === a.teacherId);
      map.set(key, {
        isAssigned: true,
        teacherName: assignedTeacher ? assignedTeacher.name : 'Giáo viên khác',
        isCurrentTeacher: a.teacherId === selectedTeacherId,
      });
    });
    return map;
  }, [assignments, teachers, selectedTeacherId]);

  // Calculate sum of periods for currently selected cells in matrix
  const selectedPeriodsSum = useMemo(() => {
    let sum = 0;
    (Array.from(selectedCellKeys) as string[]).forEach((key) => {
      const [subId] = key.split('___');
      const sub = subjects.find((s) => s.id === subId);
      if (sub) {
        sum += sub.defaultPeriodsPerWeek || 2;
      }
    });
    return sum;
  }, [selectedCellKeys, subjects]);

  // Projected total periods for teacher after adding selected cells
  const projectedTotalPeriods = currentAssignedPeriods + selectedPeriodsSum;

  // State for Warning Confirmation Modal when exceeding reference standard
  const [showWarningConfirm, setShowWarningConfirm] = useState<boolean>(false);

  // Toggle selection for a single cell (subjectId, classId)
  const handleToggleCell = (subjectId: string, classId: string) => {
    const key = `${subjectId}___${classId}`;
    const existing = existingAssignmentsMap.get(key);
    if (existing?.isAssigned) return; // Cannot select already assigned cell

    const newSet = new Set(selectedCellKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedCellKeys(newSet);
  };

  // Toggle selection for an entire Subject row across all visible classes
  const handleToggleSubjectRow = (subject: Subject) => {
    // Get all unassigned cells in this subject row for visible classes
    const availableClassIds = filteredClasses
      .filter((c) => !existingAssignmentsMap.get(`${subject.id}___${c.id}`)?.isAssigned)
      .map((c) => c.id);

    if (availableClassIds.length === 0) return;

    // Check if ALL available cells in this row are already selected
    const allSelected = availableClassIds.every((cId) =>
      selectedCellKeys.has(`${subject.id}___${cId}`)
    );

    const newSet = new Set(selectedCellKeys);

    if (allSelected) {
      // Deselect all cells in this subject row
      availableClassIds.forEach((cId) => newSet.delete(`${subject.id}___${cId}`));
    } else {
      // Select all unassigned cells in this subject row
      availableClassIds.forEach((cId) => newSet.add(`${subject.id}___${cId}`));
    }

    setSelectedCellKeys(newSet);
  };

  // Toggle selection for an entire Class column across all visible subjects
  const handleToggleClassColumn = (cls: ClassItem) => {
    // Get all unassigned cells in this class column for visible subjects
    const availableSubjects = filteredSubjects.filter(
      (s) => !existingAssignmentsMap.get(`${s.id}___${cls.id}`)?.isAssigned
    );

    if (availableSubjects.length === 0) return;

    // Check if ALL available cells in this column are already selected
    const allSelected = availableSubjects.every((s) =>
      selectedCellKeys.has(`${s.id}___${cls.id}`)
    );

    const newSet = new Set(selectedCellKeys);

    if (allSelected) {
      // Deselect all cells in this class column
      availableSubjects.forEach((s) => newSet.delete(`${s.id}___${cls.id}`));
    } else {
      // Select all unassigned cells in this class column
      availableSubjects.forEach((s) => newSet.add(`${s.id}___${cls.id}`));
    }

    setSelectedCellKeys(newSet);
  };

  // Handle Teacher change
  const handleSelectTeacher = (t: Teacher) => {
    setSelectedTeacherId(t.id);
    setIsTeacherDropdownOpen(false);
    setTeacherSearch('');
    // Clear selections on teacher switch
    setSelectedCellKeys(new Set());
  };

  const performSave = () => {
    if (!selectedTeacherId || selectedCellKeys.size === 0 || !currentTeacher) return;

    const newAssignments: Assignment[] = [];
    const addedSummaryBySubject = new Map<string, { subjectName: string; count: number; classNames: string[] }>();
    let totalAddedPeriods = 0;

    const cellKeysArray = Array.from(selectedCellKeys) as string[];

    cellKeysArray.forEach((key, idx) => {
      const [subId, classId] = key.split('___');
      const sub = subjects.find((s) => s.id === subId);
      const cls = classes.find((c) => c.id === classId);
      const periods = sub ? sub.defaultPeriodsPerWeek : 2;
      const uniqueId = `a_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;

      newAssignments.push({
        id: uniqueId,
        teacherId: selectedTeacherId,
        classId,
        subjectId: subId,
        periodsPerWeek: periods,
      });

      totalAddedPeriods += periods;

      if (sub && cls) {
        if (!addedSummaryBySubject.has(sub.id)) {
          addedSummaryBySubject.set(sub.id, {
            subjectName: sub.name,
            count: 0,
            classNames: [],
          });
        }
        const item = addedSummaryBySubject.get(sub.id)!;
        item.count += 1;
        item.classNames.push(cls.name);
      }
    });

    const detailsText = Array.from(addedSummaryBySubject.values())
      .map((item) => `• ${item.subjectName}: ${item.classNames.join(', ')}`)
      .join('\n');

    const summaryText = `✅ Đã thêm ${newAssignments.length} phân công cho ${currentTeacher.name}:\n` +
      detailsText +
      `\nTổng thêm: ${totalAddedPeriods} tiết/tuần.`;

    onAddAssignments(newAssignments, summaryText);
    onClose();
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || selectedCellKeys.size === 0 || !currentTeacher) return;

    // If projected total periods exceed standard, show confirmation warning modal
    if (projectedTotalPeriods > maxWeeklyPeriods) {
      setShowWarningConfirm(true);
      return;
    }

    performSave();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-5xl w-full flex flex-col max-h-[95vh] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>THÊM PHÂN CÔNG CHUYÊN MÔN (MA TRẬN MÔN × LỚP)</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Chọn giáo viên, sau đó tích chọn trực tiếp các ô tương ứng với Môn học và Lớp học.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Top Bar: Teacher Dropdown & Capacity Info */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Teacher Dropdown (Col 5) */}
            <div className="md:col-span-5 relative space-y-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>Chọn Giáo viên:</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <span className="truncate">
                    {currentTeacher
                      ? `${currentTeacher.name} (${currentTeacher.code || 'Chưa có mã'})`
                      : 'Chọn giáo viên...'}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">▼</span>
                </button>

                {/* Dropdown Options */}
                {isTeacherDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto p-1.5 space-y-1 animate-in fade-in duration-150">
                    <div className="p-1 sticky top-0 bg-white border-b border-slate-100">
                      <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Tìm theo tên hoặc mã GV..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-xs text-slate-800 placeholder:text-slate-400"
                          autoFocus
                        />
                      </div>
                    </div>

                    {filteredTeachers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-medium">
                        Không tìm thấy giáo viên
                      </div>
                    ) : (
                      filteredTeachers.map((t) => {
                        const cur = calculateTeacherWeeklyPeriods(t.id, assignments);
                        const max = getTeacherMaxWeeklyPeriods(t);
                        const isSelected = t.id === selectedTeacherId;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTeacher(t)}
                            className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-purple-50 text-purple-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div>
                              <div>{t.name} <span className="text-slate-400 font-normal">({t.code})</span></div>
                              <div className="text-[10px] text-slate-400">
                                {t.type === 'homeroom' ? 'GV Chủ nhiệm' : 'GV Bộ môn'}
                              </div>
                            </div>
                            <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                              cur > max ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {cur}/{max} tiết
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Teacher Info Card (Col 7) */}
            {currentTeacher && (
              <div className="md:col-span-7 bg-purple-50/70 border border-purple-200/80 rounded-xl p-2.5 sm:p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    <span className="text-purple-700">Giáo viên:</span> {currentTeacher.name}
                  </div>
                  <div className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-200/80 text-purple-900">
                    Loại: {currentTeacher.type === 'homeroom' ? 'GV Chủ nhiệm' : 'GV Bộ môn'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-slate-700 font-medium text-[11px]">
                  <div>
                    Đã phân công:{' '}
                    <span className="font-extrabold text-purple-900">
                      {currentAssignedPeriods}/{maxWeeklyPeriods} tiết
                    </span>
                  </div>
                  <div>
                    Còn có thể phân công:{' '}
                    <span className="font-extrabold text-emerald-700">
                      {remainingCapacity} tiết
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Matrix Filter Inputs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>BẢNG MA TRẬN MÔN HỌC × LỚP</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Subject Search */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus-within:ring-2 focus-within:ring-purple-500 flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="🔎 Tìm môn học..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-xs text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Class Search */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus-within:ring-2 focus-within:ring-purple-500 flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="🔎 Tìm lớp..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-xs text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Matrix Table Container with Horizontal & Vertical Scroll */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm relative">
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                
                {/* Header Row: Classes Columns */}
                <thead className="bg-slate-100 sticky top-0 z-20 text-slate-800 font-bold border-b border-slate-200 shadow-xs">
                  <tr>
                    {/* Fixed Top-Left Cell for Subjects Header */}
                    <th className="p-2.5 bg-slate-100 sticky left-0 z-30 min-w-[180px] max-w-[220px] border-r border-slate-200 shadow-xs">
                      <div className="text-slate-800 font-extrabold text-xs">Môn học</div>
                      <div className="text-[10px] text-slate-500 font-normal">Tích chọn ở hàng/cột để chọn nhanh</div>
                    </th>

                    {/* Class Columns Headers */}
                    {filteredClasses.map((cls) => {
                      // Check if ALL available subjects in this column are selected
                      const availableSubjects = filteredSubjects.filter(
                        (s) => !existingAssignmentsMap.get(`${s.id}___${cls.id}`)?.isAssigned
                      );
                      const isColumnAllSelected =
                        availableSubjects.length > 0 &&
                        availableSubjects.every((s) => selectedCellKeys.has(`${s.id}___${cls.id}`));

                      return (
                        <th
                          key={cls.id}
                          className="p-2 text-center min-w-[70px] border-r border-slate-200/80 bg-slate-100 hover:bg-slate-200/60 transition-colors cursor-pointer select-none"
                          onClick={() => handleToggleClassColumn(cls)}
                          title={`Tích/Bỏ chọn tất cả môn cho Lớp ${cls.name}`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="font-extrabold text-slate-900 text-xs">Lớp {cls.name}</span>
                            <div className="flex items-center justify-center text-purple-700">
                              {isColumnAllSelected ? (
                                <CheckSquare className="w-3.5 h-3.5" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Table Body: Subject Rows × Class Columns */}
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.length === 0 || filteredClasses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={filteredClasses.length + 1}
                        className="p-8 text-center text-slate-400 font-medium"
                      >
                        Không tìm thấy môn học hoặc lớp học phù hợp với bộ lọc search.
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((sub) => {
                      const periods = sub.defaultPeriodsPerWeek || 2;

                      // Check if ALL available classes in this row are selected
                      const availableClassIds = filteredClasses
                        .filter((c) => !existingAssignmentsMap.get(`${sub.id}___${c.id}`)?.isAssigned)
                        .map((c) => c.id);

                      const isRowAllSelected =
                        availableClassIds.length > 0 &&
                        availableClassIds.every((cId) => selectedCellKeys.has(`${sub.id}___${cId}`));

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          
                          {/* Sticky Row Header Cell: Subject Name & Row Select All Checkbox */}
                          <td
                            className="p-2.5 bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200/80 shadow-xs font-semibold cursor-pointer select-none hover:bg-purple-50/50"
                            onClick={() => handleToggleSubjectRow(sub)}
                            title={`Tích/Bỏ chọn môn ${sub.name} cho tất cả lớp`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate max-w-[150px]">
                                <div className="text-xs text-slate-900 font-bold truncate">{sub.name}</div>
                                <div className="text-[10px] text-purple-700 font-medium">{periods} tiết/tuần</div>
                              </div>
                              <div className="text-purple-700 shrink-0">
                                {isRowAllSelected ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Matrix Cells for each Class Column */}
                          {filteredClasses.map((cls) => {
                            const cellKey = `${sub.id}___${cls.id}`;
                            const existing = existingAssignmentsMap.get(cellKey);
                            const isAssigned = existing?.isAssigned || false;
                            const isChecked = selectedCellKeys.has(cellKey);

                            return (
                              <td
                                key={cls.id}
                                onClick={() => {
                                  if (!isAssigned) {
                                    handleToggleCell(sub.id, cls.id);
                                  }
                                }}
                                className={`p-2 text-center border-r border-slate-100 transition-colors select-none ${
                                  isAssigned
                                    ? 'bg-red-50/40 text-red-400 cursor-not-allowed'
                                    : isChecked
                                    ? 'bg-purple-100/80 hover:bg-purple-200/80 cursor-pointer'
                                    : 'hover:bg-slate-100/70 cursor-pointer'
                                }`}
                                title={
                                  isAssigned
                                    ? `${sub.name} – ${cls.name}: Đã phân công cho ${existing?.teacherName}`
                                    : `${sub.name} – Lớp ${cls.name} (${periods} tiết)`
                                }
                              >
                                <div className="flex items-center justify-center">
                                  {isAssigned ? (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-100/80 px-1.5 py-0.5 rounded">
                                      🔴 Đã dạy
                                    </span>
                                  ) : isChecked ? (
                                    <span className="inline-flex items-center justify-center bg-purple-600 text-white rounded p-0.5 shadow-xs">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </span>
                                  ) : (
                                    <div className="w-4 h-4 border border-slate-300 rounded bg-white hover:border-purple-500 transition-colors" />
                                  )}
                                </div>
                              </td>
                            );
                          })}

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Matrix Statistics Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3 text-slate-700 font-medium">
              <div>
                Đã chọn: <b className="text-purple-700 font-extrabold text-sm">{selectedCellKeys.size}</b> phân công
              </div>
              <div>
                Tổng số tiết chọn thêm: <b className="text-purple-700 font-extrabold text-sm">{selectedPeriodsSum} tiết/tuần</b>
              </div>
              <div>
                Dự kiến sau khi thêm:{' '}
                <b className="text-sm font-extrabold text-slate-900">
                  {projectedTotalPeriods} tiết/tuần
                </b>
              </div>
            </div>

            {/* Reference Standard Real-time Status Badge */}
            <div className="pt-2 border-t border-slate-200/80">
              {projectedTotalPeriods === maxWeeklyPeriods && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <span>🟢 Đã chọn: {projectedTotalPeriods} tiết (Đúng định mức {maxWeeklyPeriods} tiết)</span>
                </div>
              )}

              {projectedTotalPeriods > maxWeeklyPeriods && (
                <div className="p-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>🟠 Đã chọn: {projectedTotalPeriods} tiết (Dư {projectedTotalPeriods - maxWeeklyPeriods} tiết so với định mức {maxWeeklyPeriods} tiết)</span>
                </div>
              )}

              {projectedTotalPeriods < maxWeeklyPeriods && (
                <div className="p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <span>🔵 Đã chọn: {projectedTotalPeriods} tiết (Thiếu {maxWeeklyPeriods - projectedTotalPeriods} tiết so với định mức {maxWeeklyPeriods} tiết)</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedCellKeys.size === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
              selectedCellKeys.size === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {selectedCellKeys.size > 0
                ? `✓ Thêm ${selectedCellKeys.size} phân công`
                : 'Thêm phân công'}
            </span>
          </button>
        </div>

      </div>

      {/* Warning Confirmation Popup Modal when Exceeding Reference Standard */}
      {showWarningConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">CẢNH BÁO VƯỢT ĐỊNH MỨC</h3>
                <p className="text-xs text-amber-700 font-medium">Giáo viên sẽ được phân công vượt định mức tiết dạy</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 space-y-2">
              <p>
                Cảnh báo: Giáo viên <span className="font-bold text-slate-900">{currentTeacher?.name}</span> sẽ được phân công{' '}
                <span className="font-extrabold text-amber-900">{projectedTotalPeriods} tiết/tuần</span>{' '}
                (vượt định mức <span className="font-extrabold text-amber-900">{projectedTotalPeriods - maxWeeklyPeriods} tiết</span> so với định mức {maxWeeklyPeriods} tiết).
              </p>
              <p className="text-slate-600 italic">
                Bạn có muốn tiếp tục lưu phân công này không?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWarningConfirm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 border border-slate-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWarningConfirm(false);
                  performSave();
                }}
                className="px-5 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tiếp tục lưu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
