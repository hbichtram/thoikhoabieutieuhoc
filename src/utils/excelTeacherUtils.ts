import * as XLSX from 'xlsx';
import { Teacher, Subject, ClassItem } from '../types';

export interface ExcelTeacherRow {
  stt?: number;
  code: string;
  name: string;
  rawType: string;
  type: 'homeroom' | 'subject' | 'invalid';
  homeroomClassName?: string;
  homeroomClassId?: string;
  subjectName?: string;
  mainSubjectId?: string;
  maxWeeklyPeriods: number;
  maxPeriodsPerDay: number;
  isValid: boolean;
  isDuplicateInFile: boolean;
  isExistingInSystem: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExcelParseResult {
  rows: ExcelTeacherRow[];
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  existingRowsCount: number;
}

/**
 * Downloads a standard Excel sample template file for Teacher Import.
 */
export function downloadTeacherSampleExcel() {
  const sampleData = [
    {
      'STT': 1,
      'Mã GV': 'GV01',
      'Họ và tên': 'Nguyễn Thị Lan',
      'Loại GV': 'GVCN',
      'Lớp chủ nhiệm': '3A',
      'Môn phụ trách': '',
      'Tối đa/ngày': 4,
    },
    {
      'STT': 2,
      'Mã GV': 'GV02',
      'Họ và tên': 'Trần Văn Nam',
      'Loại GV': 'GVCN',
      'Lớp chủ nhiệm': '4B',
      'Môn phụ trách': '',
      'Tối đa/ngày': 4,
    },
    {
      'STT': 3,
      'Mã GV': 'GV03',
      'Họ và tên': 'Lê Thị Trâm',
      'Loại GV': 'GV Bộ môn',
      'Lớp chủ nhiệm': '',
      'Môn phụ trách': 'Tin học',
      'Tối đa/ngày': 4,
    },
    {
      'STT': 4,
      'Mã GV': 'GV04',
      'Họ và tên': 'Phạm Văn Minh',
      'Loại GV': 'GV Bộ môn',
      'Lớp chủ nhiệm': '',
      'Môn phụ trách': 'Âm nhạc',
      'Tối đa/ngày': 4,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for nicely formatted Excel
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã GV
    { wch: 25 }, // Họ và tên
    { wch: 18 }, // Loại GV
    { wch: 16 }, // Lớp chủ nhiệm
    { wch: 20 }, // Môn phụ trách
    { wch: 14 }, // Tối đa/ngày
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'GiaoVien');
  XLSX.writeFile(workbook, 'Danh_sach_Giao_vien_Mau.xlsx');
}

/**
 * Normalizes text string to lower case, trimmed, and diacritic-free for flexible header matching.
 */
function normalizeHeaderKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normalizes teacher type text:
 * GVCN, GV Chủ nhiệm, Giáo viên chủ nhiệm -> 'homeroom'
 * GVBM, GV Bộ môn, Giáo viên bộ môn -> 'subject'
 */
function parseTeacherType(rawType: string): 'homeroom' | 'subject' | 'invalid' {
  const norm = normalizeHeaderKey(rawType);
  if (norm.includes('chu nhiem') || norm === 'gvcn' || norm === 'cn') {
    return 'homeroom';
  }
  if (norm.includes('bo mon') || norm === 'gvbm' || norm === 'bm' || norm === 'mon') {
    return 'subject';
  }
  return 'invalid';
}

/**
 * Parses and validates an uploaded Excel or CSV file buffer/arrayBuffer.
 */
export function parseTeacherExcelFile(
  fileData: ArrayBuffer,
  existingTeachers: Teacher[],
  existingClasses: ClassItem[],
  existingSubjects: Subject[]
): ExcelParseResult {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert worksheet to JSON rows (header row as keys)
  const rawJsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  const existingCodesSet = new Set(existingTeachers.map((t) => t.code.trim().toUpperCase()));
  const seenCodesInFile = new Set<string>();
  const duplicateCodesInFile = new Set<string>();

  // Pass 1: Identify duplicate codes inside file
  rawJsonRows.forEach((row) => {
    let rawCode = '';
    Object.keys(row).forEach((k) => {
      const normKey = normalizeHeaderKey(k);
      if (normKey.includes('ma gv') || normKey === 'magv' || normKey === 'code' || normKey === 'ma') {
        rawCode = String(row[k] || '').trim();
      }
    });

    if (rawCode) {
      const upperCode = rawCode.toUpperCase();
      if (seenCodesInFile.has(upperCode)) {
        duplicateCodesInFile.add(upperCode);
      } else {
        seenCodesInFile.add(upperCode);
      }
    }
  });

  // Pass 2: Map and validate rows
  const parsedRows: ExcelTeacherRow[] = rawJsonRows.map((row, index) => {
    let rawCode = '';
    let rawName = '';
    let rawType = '';
    let rawHomeroomClass = '';
    let rawSubject = '';
    let rawMaxDaily = '';
    let rawStt = index + 1;

    // Flexible column matching
    Object.keys(row).forEach((key) => {
      const normKey = normalizeHeaderKey(key);
      const val = String(row[key] || '').trim();

      if (normKey === 'stt') {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) rawStt = parsed;
      } else if (normKey.includes('ma gv') || normKey === 'magv' || normKey === 'code' || normKey === 'ma') {
        rawCode = val;
      } else if (normKey.includes('ho va ten') || normKey.includes('ho ten') || normKey === 'ten' || normKey === 'name') {
        rawName = val;
      } else if (normKey.includes('loai gv') || normKey.includes('loai') || normKey.includes('type')) {
        rawType = val;
      } else if (normKey.includes('lop chu nhiem') || normKey.includes('lop cn') || normKey === 'chu nhiem') {
        rawHomeroomClass = val;
      } else if (normKey.includes('mon phu trach') || normKey.includes('mon') || normKey.includes('subject')) {
        rawSubject = val;
      } else if (normKey.includes('toi da/ngay') || normKey.includes('toi da ngay') || normKey.includes('max/day')) {
        rawMaxDaily = val;
      }
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Code
    if (!rawCode) {
      errors.push('Thiếu mã giáo viên.');
    }

    // Validate Name
    if (!rawName) {
      errors.push('Thiếu họ và tên giáo viên.');
    }

    // Validate Type
    const teacherType = parseTeacherType(rawType);
    if (!rawType) {
      errors.push('Thiếu loại giáo viên.');
    } else if (teacherType === 'invalid') {
      errors.push(`Không xác định được loại giáo viên ("${rawType}").`);
    }

    // Max Weekly Periods logic
    const maxWeeklyPeriods = teacherType === 'homeroom' ? 20 : 23;

    // Max Daily Periods logic
    let maxPeriodsPerDay = 4;
    if (rawMaxDaily) {
      const parsedDaily = parseInt(rawMaxDaily, 10);
      if (!isNaN(parsedDaily) && parsedDaily > 0) {
        maxPeriodsPerDay = parsedDaily;
      }
    }

    // Homeroom Class matching
    let homeroomClassId: string | undefined;
    if (teacherType === 'homeroom' && rawHomeroomClass) {
      const normClassInput = normalizeHeaderKey(rawHomeroomClass).replace(/^lop\s*/, '');
      const matchedClass = existingClasses.find(
        (c) =>
          normalizeHeaderKey(c.name) === normClassInput ||
          normalizeHeaderKey(c.name) === normalizeHeaderKey(rawHomeroomClass)
      );
      if (matchedClass) {
        homeroomClassId = matchedClass.id;
      }
    }

    // Subject matching
    let mainSubjectId: string | undefined;
    if (teacherType === 'subject') {
      if (!rawSubject) {
        errors.push('Giáo viên bộ môn chưa có môn phụ trách.');
      } else {
        const normSubjectInput = normalizeHeaderKey(rawSubject);
        const matchedSubject = existingSubjects.find(
          (s) =>
            normalizeHeaderKey(s.name) === normSubjectInput ||
            normalizeHeaderKey(s.shortName) === normSubjectInput
        );
        if (matchedSubject) {
          mainSubjectId = matchedSubject.id;
        } else {
          // If not matched exactly in list, still warn or allow creation
          warnings.push(`Môn "${rawSubject}" chưa có trong danh mục môn học hiện tại.`);
        }
      }
    }

    // File level duplicate check
    const upperCode = rawCode.toUpperCase();
    const isDuplicateInFile = rawCode ? duplicateCodesInFile.has(upperCode) : false;
    if (isDuplicateInFile) {
      errors.push(`Mã giáo viên "${rawCode}" bị trùng trong file Excel.`);
    }

    // System level duplicate check
    const isExistingInSystem = rawCode ? existingCodesSet.has(upperCode) : false;
    if (isExistingInSystem) {
      warnings.push(`Mã giáo viên "${rawCode}" đã tồn tại trong hệ thống.`);
    }

    const isValid = errors.length === 0;

    return {
      stt: rawStt,
      code: rawCode,
      name: rawName,
      rawType,
      type: teacherType,
      homeroomClassName: rawHomeroomClass,
      homeroomClassId,
      subjectName: rawSubject,
      mainSubjectId,
      maxWeeklyPeriods,
      maxPeriodsPerDay,
      isValid,
      isDuplicateInFile,
      isExistingInSystem,
      errors,
      warnings,
    };
  });

  const totalRows = parsedRows.length;
  const validRowsCount = parsedRows.filter((r) => r.isValid).length;
  const errorRowsCount = parsedRows.filter((r) => !r.isValid).length;
  const existingRowsCount = parsedRows.filter((r) => r.isExistingInSystem).length;

  return {
    rows: parsedRows,
    totalRows,
    validRowsCount,
    errorRowsCount,
    existingRowsCount,
  };
}
