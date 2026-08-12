import { Teacher, ClassItem, Subject, Assignment, TimeConfig, ScheduleCell, ScheduleVersion } from '../types';

export const initialTeachers: Teacher[] = [
  {
    id: 't1',
    code: 'GV01',
    name: 'Cô Trâm',
    type: 'subject',
    mainSubjectId: 's3', // Tin học
    homeroomClassId: '',
    maxWeeklyPeriods: 23,
    maxSessionsPerWeek: 6,
    maxPeriodsPerDay: 4,
    notes: 'Phụ trách môn Tin học toàn trường',
    unavailableSlots: [
      { day: 'T6', shift: 'afternoon', periodNumber: 1, reason: 'Khóa thứ 6 tiết 1 chiều' },
    ],
  },
  {
    id: 't2',
    code: 'GV02',
    name: 'Cô Lan',
    type: 'homeroom',
    mainSubjectId: 's2', // Tiếng Việt
    homeroomClassId: 'c1',
    maxWeeklyPeriods: 20,
    maxSessionsPerWeek: 6,
    maxPeriodsPerDay: 4,
    notes: 'GVCN Lớp 3A',
    unavailableSlots: [],
  },
  {
    id: 't3',
    code: 'GV03',
    name: 'Thầy Minh',
    type: 'subject',
    mainSubjectId: 's1', // Toán
    homeroomClassId: '',
    maxWeeklyPeriods: 23,
    maxSessionsPerWeek: 6,
    maxPeriodsPerDay: 4,
    notes: 'Tổ trưởng chuyên môn khối 4-5',
    unavailableSlots: [],
  },
  {
    id: 't4',
    code: 'GV04',
    name: 'Cô Hoa',
    type: 'subject',
    mainSubjectId: 's4', // Tiếng Anh
    homeroomClassId: '',
    maxWeeklyPeriods: 23,
    maxSessionsPerWeek: 6,
    maxPeriodsPerDay: 4,
    notes: 'Giáo viên Tiếng Anh',
    unavailableSlots: [
      { day: 'T2', shift: 'morning', periodNumber: 1, reason: 'Tiết chào cờ T2' },
    ],
  },
  {
    id: 't5',
    code: 'GV05',
    name: 'Thầy Nam',
    type: 'homeroom',
    mainSubjectId: 's6', // TNXH / Khoa học
    homeroomClassId: 'c2',
    maxWeeklyPeriods: 20,
    maxSessionsPerWeek: 6,
    maxPeriodsPerDay: 4,
    notes: 'GVCN Lớp 4B',
    unavailableSlots: [],
  },
  {
    id: 't6',
    code: 'GV06',
    name: 'Cô Thu',
    type: 'homeroom',
    mainSubjectId: 's8', // Lịch sử & Địa lý
    homeroomClassId: 'c3',
    maxWeeklyPeriods: 20,
    maxSessionsPerWeek: 6,
    maxPeriodsPerDay: 4,
    notes: 'GVCN Lớp 5A',
    unavailableSlots: [],
  },
];

export const initialClasses: ClassItem[] = [
  { id: 'c1', name: '3A', grade: 3, homeroomTeacherId: 't2', shift: 'morning' },
  { id: 'c2', name: '3B', grade: 3, homeroomTeacherId: 't5', shift: 'morning' },
  { id: 'c3', name: '4A', grade: 4, homeroomTeacherId: 't6', shift: 'morning' },
  { id: 'c4', name: '4B', grade: 4, homeroomTeacherId: 't3', shift: 'morning' },
  { id: 'c5', name: '5A', grade: 5, homeroomTeacherId: 't1', shift: 'morning' },
  { id: 'c6', name: '5B', grade: 6, homeroomTeacherId: 't4', shift: 'morning' },
];

export const initialSubjects: Subject[] = [
  { id: 's1', name: 'Toán', shortName: 'T', defaultPeriodsPerWeek: 5, color: '#2563EB' }, // Blue
  { id: 's2', name: 'Tiếng Việt', shortName: 'TV', defaultPeriodsPerWeek: 8, color: '#DC2626' }, // Red
  { id: 's3', name: 'Tin học', shortName: 'TH', defaultPeriodsPerWeek: 2, color: '#7C3AED' }, // Purple
  { id: 's4', name: 'Tiếng Anh', shortName: 'TA', defaultPeriodsPerWeek: 4, color: '#059669' }, // Emerald
  { id: 's5', name: 'Đạo đức', shortName: 'ĐĐ', defaultPeriodsPerWeek: 1, color: '#D97706' }, // Amber
  { id: 's6', name: 'Tự nhiên và Xã hội', shortName: 'TNXH', defaultPeriodsPerWeek: 2, color: '#0891B2' }, // Cyan
  { id: 's7', name: 'Khoa học', shortName: 'KH', defaultPeriodsPerWeek: 2, color: '#0D9488' }, // Teal
  { id: 's8', name: 'Lịch sử và Địa lý', shortName: 'LSĐL', defaultPeriodsPerWeek: 2, color: '#B45309' }, // Orange
];

export const initialAssignments: Assignment[] = [
  // Tin học (Cô Trâm)
  { id: 'a1', teacherId: 't1', subjectId: 's3', classId: 'c1', periodsPerWeek: 2 }, // 3A
  { id: 'a2', teacherId: 't1', subjectId: 's3', classId: 'c2', periodsPerWeek: 2 }, // 3B
  { id: 'a3', teacherId: 't1', subjectId: 's3', classId: 'c3', periodsPerWeek: 2 }, // 4A
  { id: 'a4', teacherId: 't1', subjectId: 's3', classId: 'c4', periodsPerWeek: 2 }, // 4B
  { id: 'a5', teacherId: 't1', subjectId: 's3', classId: 'c5', periodsPerWeek: 2 }, // 5A
  { id: 'a6', teacherId: 't1', subjectId: 's3', classId: 'c6', periodsPerWeek: 2 }, // 5B

  // Toán (Thầy Minh)
  { id: 'a7', teacherId: 't3', subjectId: 's1', classId: 'c3', periodsPerWeek: 5 }, // 4A
  { id: 'a8', teacherId: 't3', subjectId: 's1', classId: 'c4', periodsPerWeek: 5 }, // 4B
  { id: 'a9', teacherId: 't3', subjectId: 's1', classId: 'c5', periodsPerWeek: 5 }, // 5A

  // Tiếng Việt (Cô Lan)
  { id: 'a10', teacherId: 't2', subjectId: 's2', classId: 'c1', periodsPerWeek: 8 }, // 3A
  { id: 'a11', teacherId: 't2', subjectId: 's2', classId: 'c2', periodsPerWeek: 8 }, // 3B
  { id: 'a12', teacherId: 't2', subjectId: 's2', classId: 'c3', periodsPerWeek: 8 }, // 4A

  // Tiếng Anh (Cô Hoa)
  { id: 'a13', teacherId: 't4', subjectId: 's4', classId: 'c3', periodsPerWeek: 4 }, // 4A
  { id: 'a14', teacherId: 't4', subjectId: 's4', classId: 'c4', periodsPerWeek: 4 }, // 4B
  { id: 'a15', teacherId: 't4', subjectId: 's4', classId: 'c5', periodsPerWeek: 4 }, // 5A

  // TNXH / Khoa học (Thầy Nam)
  { id: 'a16', teacherId: 't5', subjectId: 's6', classId: 'c1', periodsPerWeek: 2 }, // 3A TNXH
  { id: 'a17', teacherId: 't5', subjectId: 's7', classId: 'c3', periodsPerWeek: 2 }, // 4A Khoa học
  { id: 'a18', teacherId: 't5', subjectId: 's7', classId: 'c4', periodsPerWeek: 2 }, // 4B Khoa học

  // Lịch sử & Địa lý / Đạo đức (Cô Thu)
  { id: 'a19', teacherId: 't6', subjectId: 's8', classId: 'c3', periodsPerWeek: 2 }, // 4A LSĐL
  { id: 'a20', teacherId: 't6', subjectId: 's5', classId: 'c3', periodsPerWeek: 1 }, // 4A ĐĐ
  { id: 'a21', teacherId: 't6', subjectId: 's8', classId: 'c5', periodsPerWeek: 2 }, // 5A LSĐL
];

export const initialTimeConfig: TimeConfig = {
  schoolYear: '2026–2027',
  semester: 'I',
  enabledDays: ['T2', 'T3', 'T4', 'T5', 'T6'],
  morningPeriodsCount: 4,
  afternoonPeriodsCount: 3,
  disabledSlots: [
    { day: 'T6', shift: 'afternoon', periodNumber: 3 }, // T6 chiều nghỉ tiết 3
  ],
};

// Initial sample schedule cells for 4A and 4B to demonstrate working UI
export const initialCells: ScheduleCell[] = [
  // Class 4A (c3)
  { id: 'sc1', classId: 'c3', day: 'T2', shift: 'morning', periodNumber: 1, assignmentId: 'a7', subjectId: 's1', teacherId: 't3', isLocked: true }, // T2 T1: Toán (Thầy Minh) 🔒
  { id: 'sc2', classId: 'c3', day: 'T2', shift: 'morning', periodNumber: 2, assignmentId: 'a12', subjectId: 's2', teacherId: 't2', isLocked: false }, // T2 T2: Tiếng Việt (Cô Lan)
  { id: 'sc3', classId: 'c3', day: 'T2', shift: 'morning', periodNumber: 3, assignmentId: 'a13', subjectId: 's4', teacherId: 't4', isLocked: false }, // T2 T3: Tiếng Anh (Cô Hoa)

  { id: 'sc4', classId: 'c3', day: 'T3', shift: 'morning', periodNumber: 1, assignmentId: 'a12', subjectId: 's2', teacherId: 't2', isLocked: false }, // T3 T1: Tiếng Việt
  { id: 'sc5', classId: 'c3', day: 'T3', shift: 'morning', periodNumber: 2, assignmentId: 'a7', subjectId: 's1', teacherId: 't3', isLocked: false }, // T3 T2: Toán
  { id: 'sc6', classId: 'c3', day: 'T3', shift: 'morning', periodNumber: 3, assignmentId: 'a3', subjectId: 's3', teacherId: 't1', isLocked: false }, // T3 T3: Tin học (Cô Trâm)

  { id: 'sc7', classId: 'c3', day: 'T4', shift: 'morning', periodNumber: 1, assignmentId: 'a3', subjectId: 's3', teacherId: 't1', isLocked: false }, // T4 T1: Tin học (Cô Trâm)
  { id: 'sc8', classId: 'c3', day: 'T4', shift: 'morning', periodNumber: 2, assignmentId: 'a7', subjectId: 's1', teacherId: 't3', isLocked: false }, // T4 T2: Toán
  { id: 'sc9', classId: 'c3', day: 'T4', shift: 'morning', periodNumber: 3, assignmentId: 'a17', subjectId: 's7', teacherId: 't5', isLocked: false }, // T4 T3: Khoa học

  { id: 'sc10', classId: 'c3', day: 'T5', shift: 'morning', periodNumber: 1, assignmentId: 'a7', subjectId: 's1', teacherId: 't3', isLocked: false }, // T5 T1: Toán
  { id: 'sc11', classId: 'c3', day: 'T5', shift: 'morning', periodNumber: 2, assignmentId: 'a13', subjectId: 's4', teacherId: 't4', isLocked: false }, // T5 T2: Tiếng Anh
  { id: 'sc12', classId: 'c3', day: 'T5', shift: 'morning', periodNumber: 3, assignmentId: 'a12', subjectId: 's2', teacherId: 't2', isLocked: false }, // T5 T3: Tiếng Việt

  { id: 'sc13', classId: 'c3', day: 'T6', shift: 'morning', periodNumber: 1, assignmentId: 'a13', subjectId: 's4', teacherId: 't4', isLocked: false }, // T6 T1: Tiếng Anh
  { id: 'sc14', classId: 'c3', day: 'T6', shift: 'morning', periodNumber: 2, assignmentId: 'a7', subjectId: 's1', teacherId: 't3', isLocked: false }, // T6 T2: Toán
  { id: 'sc15', classId: 'c3', day: 'T6', shift: 'morning', periodNumber: 3, assignmentId: 'a19', subjectId: 's8', teacherId: 't6', isLocked: false }, // T6 T3: LSĐL

  // Class 4B (c4)
  { id: 'sc16', classId: 'c4', day: 'T2', shift: 'morning', periodNumber: 2, assignmentId: 'a8', subjectId: 's1', teacherId: 't3', isLocked: false }, // T2 T2: Toán (Thầy Minh)
  { id: 'sc17', classId: 'c4', day: 'T3', shift: 'morning', periodNumber: 1, assignmentId: 'a4', subjectId: 's3', teacherId: 't1', isLocked: false }, // T3 T1: Tin học (Cô Trâm)
];

export const initialVersions: ScheduleVersion[] = [
  {
    id: 'v1',
    name: 'TKB – 09/08/2026 – Bản 1 (Chính thức)',
    type: 'official',
    timestamp: '2026-08-09 08:30',
    cells: initialCells,
    notes: 'Bản thời khóa biểu đầu năm học 2026-2027',
  },
];
