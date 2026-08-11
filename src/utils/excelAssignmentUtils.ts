import * as XLSX from 'xlsx';
import { Assignment, Teacher, ClassItem, Subject } from '../types';
import { getTeacherMaxWeeklyPeriods, calculateTeacherWeeklyPeriods } from './teacherUtils';

export interface ExcelAssignmentRow {
  stt?: number;
  rawTeacherCode: string;
  rawTeacherName: string;
  rawClassName: string;
  rawSubjectName: string;
  rawPeriods: string;
  
  teacherId?: string;
  teacherName?: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  periodsPerWeek: number;

  isValid: boolean;
  isDuplicateInFile: boolean;
  isExistingInSystem: boolean;
  existingType?: 'exact' | 'different_periods';
  existingAssignmentId?: string;

  errors: string[];
  warnings: string[];
}

export interface ExcelAssignmentParseResult {
  rows: ExcelAssignmentRow[];
  totalRows: number;
  validRowsCount: number;
  warningRowsCount: number;
  errorRowsCount: number;
  existingRowsCount: number;
}

/**
 * Downloads standard Excel template for Assignment Import.
 */
export function downloadAssignmentSampleExcel() {
  const sampleData = [
    {
      'STT': 1,
      'Mã GV': 'GV01',
      'Họ và tên GV': 'Nguyễn Thị Lan',
      'Lớp': '3A',
      'Môn': 'Tin học',
      'Số tiết/tuần': 2,
    },
    {
      'STT': 2,
      'Mã GV': 'GV02',
      'Họ và tên GV': 'Trần Văn Nam',
      'Lớp': '4A',
      'Môn': 'Tin học',
      'Số tiết/tuần': 2,
    },
    {
      'STT': 3,
      'Mã GV': 'GV03',
      'Họ và tên GV': 'Lê Thị Hoa',
      'Lớp': '5A',
      'Môn': 'Tin học',
      'Số tiết/tuần': 2,
    },
    {
      'STT': 4,
      'Mã GV': 'GV04',
      'Họ và tên GV': 'Phạm Văn Minh',
      'Lớp': '3A',
      'Môn': 'Âm nhạc',
      'Số tiết/tuần': 1,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for nice readability
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã GV
    { wch: 25 }, // Họ và tên GV
    { wch: 12 }, // Lớp
    { wch: 20 }, // Môn
    { wch: 16 }, // Số tiết/tuần
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PhanCongChuyenMon');
  XLSX.writeFile(workbook, 'Phan_cong_chuyen_mon_Mau.xlsx');
}

/**
 * Normalizes text string to lowercase, trimmed, and diacritic-free for flexible header matching.
 */
function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Generates an Excel error log file for failed import rows.
 */
export function downloadAssignmentErrorExcel(rows: ExcelAssignmentRow[]) {
  const errorRows = rows.filter((r) => !r.isValid || r.errors.length > 0);
  
  const exportData = errorRows.map((r, idx) => ({
    'STT': r.stt || idx + 1,
    'Mã GV': r.rawTeacherCode,
    'Họ và tên GV': r.rawTeacherName,
    'Lớp': r.rawClassName,
    'Môn': r.rawSubjectName,
    'Số tiết/tuần': r.rawPeriods,
    'Lý do lỗi': r.errors.join('; '),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 22 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 },
    { wch: 45 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'LoiImportPhanCong');
  XLSX.writeFile(workbook, 'Danh_sach_loi_Phan_cong.xlsx');
}

/**
 * Parses and validates an uploaded Excel file for Assignment Import.
 */
export function parseAssignmentExcelFile(
  fileData: ArrayBuffer,
  existingAssignments: Assignment[],
  teachers: Teacher[],
  classes: ClassItem[],
  subjects: Subject[]
): ExcelAssignmentParseResult {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawJsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  // Map for fast teacher lookup by teacher code (case-insensitive)
  const teacherCodeMap = new Map<string, Teacher>();
  teachers.forEach((t) => {
    if (t.code) {
      teacherCodeMap.set(normalizeText(t.code), t);
    }
  });

  // Map for class lookup by normalized class name
  const classNameMap = new Map<string, ClassItem>();
  classes.forEach((c) => {
    if (c.name) {
      classNameMap.set(normalizeText(c.name), c);
      // Also match if user writes "lop 3a" -> "3a"
      const trimmedClass = normalizeText(c.name).replace(/^lop\s*/, '');
      classNameMap.set(trimmedClass, c);
    }
  });

  // Map for subject lookup by normalized subject name or short name
  const subjectNameMap = new Map<string, Subject>();
  subjects.forEach((s) => {
    if (s.name) subjectNameMap.set(normalizeText(s.name), s);
    if (s.shortName) subjectNameMap.set(normalizeText(s.shortName), s);
  });

  // Track file-level assignment keys to detect duplicates within Excel file
  const seenFileKeys = new Map<string, number>(); // key -> count

  // First pass: extract raw fields and count duplicate assignment keys in file
  const intermediateRows = rawJsonRows.map((row, index) => {
    let rawStt = index + 1;
    let rawTeacherCode = '';
    let rawTeacherName = '';
    let rawClassName = '';
    let rawSubjectName = '';
    let rawPeriods = '';

    Object.keys(row).forEach((key) => {
      const normKey = normalizeText(key);
      const val = String(row[key] || '').trim();

      if (normKey === 'stt') {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) rawStt = parsed;
      } else if (
        normKey.includes('ma gv') ||
        normKey === 'magv' ||
        normKey === 'code' ||
        normKey === 'ma'
      ) {
        rawTeacherCode = val;
      } else if (
        normKey.includes('ho va ten') ||
        normKey.includes('ho ten') ||
        normKey.includes('ten gv') ||
        normKey === 'name'
      ) {
        rawTeacherName = val;
      } else if (normKey.includes('lop') || normKey === 'class') {
        rawClassName = val;
      } else if (normKey.includes('mon') || normKey === 'subject') {
        rawSubjectName = val;
      } else if (
        normKey.includes('so tiet') ||
        normKey.includes('tiet') ||
        normKey === 'periods'
      ) {
        rawPeriods = val;
      }
    });

    const normTeacherCode = normalizeText(rawTeacherCode);
    const matchedTeacher = teacherCodeMap.get(normTeacherCode);

    const normClassName = normalizeText(rawClassName).replace(/^lop\s*/, '');
    const matchedClass = classNameMap.get(normClassName) || classNameMap.get(normalizeText(rawClassName));

    const normSubjectName = normalizeText(rawSubjectName);
    const matchedSubject = subjectNameMap.get(normSubjectName);

    // Form composite key if all three exist
    let fileKey = '';
    if (matchedTeacher && matchedClass && matchedSubject) {
      fileKey = `${matchedTeacher.id}_${matchedClass.id}_${matchedSubject.id}`;
      seenFileKeys.set(fileKey, (seenFileKeys.get(fileKey) || 0) + 1);
    }

    return {
      rawStt,
      rawTeacherCode,
      rawTeacherName,
      rawClassName,
      rawSubjectName,
      rawPeriods,
      matchedTeacher,
      matchedClass,
      matchedSubject,
      fileKey,
    };
  });

  // Track accumulated file periods per teacher to enforce maxWeeklyPeriods (20 for homeroom, 23 for subject)
  const teacherAccumulatedPeriods = new Map<string, number>();

  // Pass 2: Complete validation
  const parsedRows: ExcelAssignmentRow[] = intermediateRows.map((item) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Teacher Check
    if (!item.rawTeacherCode) {
      errors.push('Thiếu mã giáo viên.');
    } else if (!item.matchedTeacher) {
      errors.push(`Giáo viên có mã "${item.rawTeacherCode}" chưa tồn tại trong hệ thống.`);
    }

    // 2. Class Check
    if (!item.rawClassName) {
      errors.push('Thiếu lớp học.');
    } else if (!item.matchedClass) {
      errors.push(`Lớp "${item.rawClassName}" chưa tồn tại trong hệ thống.`);
    }

    // 3. Subject Check
    if (!item.rawSubjectName) {
      errors.push('Thiếu môn học.');
    } else if (!item.matchedSubject) {
      errors.push(`Môn "${item.rawSubjectName}" chưa được tạo trong hệ thống.`);
    }

    // 4. Periods Check
    let periodsPerWeek = 0;
    if (!item.rawPeriods) {
      errors.push('Thiếu số tiết/tuần.');
    } else {
      const parsed = parseInt(item.rawPeriods, 10);
      if (isNaN(parsed) || parsed <= 0) {
        errors.push(`Số tiết/tuần phải là số nguyên dương lớn hơn 0 (Nhận: "${item.rawPeriods}").`);
      } else {
        periodsPerWeek = parsed;
      }
    }

    // 5. Duplicate in File check
    let isDuplicateInFile = false;
    if (item.fileKey && (seenFileKeys.get(item.fileKey) || 0) > 1) {
      isDuplicateInFile = true;
      errors.push(
        `File Excel có phân công trùng (GV: ${item.matchedTeacher?.name}, Lớp: ${item.matchedClass?.name}, Môn: ${item.matchedSubject?.name}).`
      );
    }

    // 6. Existing in System Check
    let isExistingInSystem = false;
    let existingType: 'exact' | 'different_periods' | undefined;
    let existingAssignmentId: string | undefined;

    if (item.matchedTeacher && item.matchedClass && item.matchedSubject) {
      const existing = existingAssignments.find(
        (a) =>
          a.teacherId === item.matchedTeacher!.id &&
          a.classId === item.matchedClass!.id &&
          a.subjectId === item.matchedSubject!.id
      );

      if (existing) {
        isExistingInSystem = true;
        existingAssignmentId = existing.id;

        if (existing.periodsPerWeek === periodsPerWeek) {
          existingType = 'exact';
          warnings.push('Phân công đã tồn tại trong hệ thống.');
        } else {
          existingType = 'different_periods';
          warnings.push(
            `Phân công đã tồn tại nhưng số tiết khác (${existing.periodsPerWeek} tiết vs ${periodsPerWeek} tiết).`
          );
        }
      }
    }

    // 7. Max Weekly Periods Limit Check (20/23)
    if (item.matchedTeacher && periodsPerWeek > 0 && errors.length === 0) {
      const t = item.matchedTeacher;
      const maxPeriods = getTeacherMaxWeeklyPeriods(t);
      const currentAssigned = calculateTeacherWeeklyPeriods(t.id, existingAssignments);
      const prevAccumulated = teacherAccumulatedPeriods.get(t.id) || 0;

      // If updating an existing assignment in system, adjust the calculation base
      const existingForTeacher = existingAssignments.find(
        (a) =>
          a.teacherId === t.id &&
          a.classId === item.matchedClass?.id &&
          a.subjectId === item.matchedSubject?.id
      );

      const effectiveBase = existingForTeacher
        ? Math.max(0, currentAssigned - (existingForTeacher.periodsPerWeek || 0))
        : currentAssigned;

      const projectedTotal = effectiveBase + prevAccumulated + periodsPerWeek;

      if (projectedTotal > maxPeriods) {
        errors.push(
          `Vượt quá giới hạn tối đa ${maxPeriods} tiết/tuần của giáo viên (Tổng dự kiến: ${projectedTotal}/${maxPeriods} tiết).`
        );
      } else {
        // Record accumulated period only if row has no errors so far
        teacherAccumulatedPeriods.set(t.id, prevAccumulated + periodsPerWeek);
      }
    }

    const isValid = errors.length === 0;

    return {
      stt: item.rawStt,
      rawTeacherCode: item.rawTeacherCode,
      rawTeacherName: item.rawTeacherName || item.matchedTeacher?.name || '',
      rawClassName: item.rawClassName,
      rawSubjectName: item.rawSubjectName,
      rawPeriods: item.rawPeriods,

      teacherId: item.matchedTeacher?.id,
      teacherName: item.matchedTeacher?.name,
      classId: item.matchedClass?.id,
      className: item.matchedClass?.name,
      subjectId: item.matchedSubject?.id,
      subjectName: item.matchedSubject?.name,
      periodsPerWeek,

      isValid,
      isDuplicateInFile,
      isExistingInSystem,
      existingType,
      existingAssignmentId,

      errors,
      warnings,
    };
  });

  const totalRows = parsedRows.length;
  const validRowsCount = parsedRows.filter((r) => r.isValid && !r.isExistingInSystem).length;
  const warningRowsCount = parsedRows.filter((r) => r.isValid && r.isExistingInSystem).length;
  const errorRowsCount = parsedRows.filter((r) => !r.isValid).length;
  const existingRowsCount = parsedRows.filter((r) => r.isExistingInSystem).length;

  return {
    rows: parsedRows,
    totalRows,
    validRowsCount,
    warningRowsCount,
    errorRowsCount,
    existingRowsCount,
  };
}
