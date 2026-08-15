export type DayOfWeek = 'T2' | 'T3' | 'T4' | 'T5' | 'T6';

export type PeriodShift = 'morning' | 'afternoon';

export interface UnavailableSlot {
  day: DayOfWeek;
  shift: PeriodShift;
  periodNumber: number; // 1 to 5
  reason?: string; // e.g. "Họp", "Công việc"
}

export interface Teacher {
  id: string;
  code: string; // e.g. GV01
  name: string;
  type: 'homeroom' | 'subject'; // Giáo viên chủ nhiệm | Giáo viên bộ môn
  mainSubjectId?: string; // Môn phụ trách chính
  homeroomClassId?: string; // Lớp chủ nhiệm (nếu là GVCN)
  maxWeeklyPeriods?: number; // Định mức tiết/tuần: 20 (GVCN), 23 (GV bộ môn) - Chỉ là định mức tham chiếu
  maxSessionsPerWeek?: number; // Số buổi tối đa được phép xuất hiện/tuần: 1 đến 7 buổi (RÀNG BUỘC CỨNG)
  maxPeriodsPerDay: number; // e.g. 4
  notes?: string;
  unavailableSlots: UnavailableSlot[]; // Các tiết giáo viên KHÔNG thể dạy
}

export interface ClassItem {
  id: string;
  name: string; // e.g. "4A"
  grade: number; // 3 | 4 | 5
  homeroomTeacherId?: string; // GVCN
  shift: 'morning' | 'afternoon' | 'both'; // Buổi học
}

export interface Subject {
  id: string;
  name: string; // e.g. "Tin học"
  shortName: string; // e.g. "TH"
  defaultPeriodsPerWeek: number; // e.g. 2
  color: string; // Tailwind color or hex code e.g. "#8B5CF6"
}

export interface Assignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  periodsPerWeek: number;
}

export interface ScheduleCell {
  id: string;
  classId: string;
  day: DayOfWeek;
  shift: PeriodShift;
  periodNumber: number; // 1..5
  assignmentId: string;
  subjectId: string;
  teacherId: string;
  isLocked: boolean;
}

export interface TimeConfig {
  schoolYear: string; // e.g. "2026–2027"
  semester: string; // e.g. "I"
  enabledDays: DayOfWeek[];
  morningPeriodsCount: number; // 1..5
  afternoonPeriodsCount: number; // 1..5
  disabledSlots: UnavailableSlot[]; // Tiết trường nghỉ/tắt
}

export interface ScheduleVersion {
  id: string;
  name: string; // e.g. "TKB - 09/08/2026 - Bản 1"
  type: 'draft' | 'editing' | 'official'; // Nháp | Đang chỉnh sửa | Chính thức
  timestamp: string;
  cells: ScheduleCell[];
  notes?: string;
}

export type ConflictSeverity = 'critical' | 'warning';

export type ConflictType =
  | 'teacher_overlap'
  | 'class_overlap'
  | 'missing_periods'
  | 'extra_periods'
  | 'teacher_unavailable'
  | 'teacher_max_periods'
  | 'consecutive_periods'
  | 'subject_clustering'
  | 'subject_shift_limit'
  | 'teacher_min_periods_per_shift'
  | 'teacher_gap_in_shift'
  | 'auto_blocked_slot_used';

export interface ConflictIssue {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  teacherId?: string;
  classId?: string;
  subjectId?: string;
  day?: DayOfWeek;
  shift?: PeriodShift;
  periodNumber?: number;
}

export interface SuggestionSlot {
  day: DayOfWeek;
  shift: PeriodShift;
  periodNumber: number;
  isValid: boolean;
  reason?: string;
}

export interface MissingPeriodItem {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  required: number;
  placed: number;
  missing: number;
  message: string;
}

export interface ScheduleStats {
  totalTeachers?: number;
  totalClasses?: number;
  totalSubjects?: number;
  totalRequiredPeriods?: number;
  totalPlacedPeriods?: number;
  assignedPeriods?: number;
  requiredPeriods?: number;
  completionPercentage: number;
  criticalErrorCount: number;
  warningCount: number;
  missingCount?: number;
  totalMissingPeriodsCount?: number;
  issues?: ConflictIssue[];
  conflicts?: ConflictIssue[];
  missingPeriods?: MissingPeriodItem[];
  warnings?: ConflictIssue[];
}

// User Roles & Permissions
export type UserRole = 'admin' | 'manager';
export type UserStatus = 'invited' | 'active' | 'disabled' | 'pending';

export interface UserInvite {
  email: string;
  displayName: string;
  name?: string | null;
  role: UserRole;
  status: UserStatus;
  schoolId: string | null;
  schoolName?: string | null;
  uid?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface AuthorizedUser {
  email: string;
  displayName: string;
  name?: string | null;
  role: UserRole;
  status: UserStatus;
  schoolId: string | null;
  schoolName?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface UserSummary {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  name?: string | null;
  email: string | null;
  photoURL?: string | null;
  role: UserRole;
  status: UserStatus;
  schoolId: string | null;
  schoolName?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

// School Entity
export interface School {
  id: string; // e.g. "th_lequydon", "th_nguyendu"
  name: string; // e.g. "Trường Tiểu học Nguyễn Du"
  code: string; // e.g. "THND"
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolTimetableDoc {
  schoolId: string;
  payload: string;
  updatedAt: string;
  lastUpdatedBy?: UserSummary | null;
}

