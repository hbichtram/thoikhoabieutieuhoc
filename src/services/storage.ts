import {
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  ScheduleCell,
  ScheduleVersion,
} from '../types';
import {
  initialTeachers,
  initialClasses,
  initialSubjects,
  initialAssignments,
  initialTimeConfig,
  initialCells,
  initialVersions,
} from '../data/initialData';

const STORAGE_KEYS = {
  TEACHERS: 'tkbsmart_teachers',
  CLASSES: 'tkbsmart_classes',
  SUBJECTS: 'tkbsmart_subjects',
  ASSIGNMENTS: 'tkbsmart_assignments',
  TIMECONFIG: 'tkbsmart_timeconfig',
  SCHEDULE_CELLS: 'tkbsmart_cells',
  VERSIONS: 'tkbsmart_versions',
};

export const getStoredTeachers = (): Teacher[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    return data ? JSON.parse(data) : initialTeachers;
  } catch {
    return initialTeachers;
  }
};

export const setStoredTeachers = (teachers: Teacher[]) => {
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
};

export const getStoredClasses = (): ClassItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    return data ? JSON.parse(data) : initialClasses;
  } catch {
    return initialClasses;
  }
};

export const setStoredClasses = (classes: ClassItem[]) => {
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
};

export const getStoredSubjects = (): Subject[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return data ? JSON.parse(data) : initialSubjects;
  } catch {
    return initialSubjects;
  }
};

export const setStoredSubjects = (subjects: Subject[]) => {
  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
};

export const getStoredAssignments = (): Assignment[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    const parsed: Assignment[] = data ? JSON.parse(data) : initialAssignments;
    return parsed.map((a, idx) => {
      if (!a.id) {
        return {
          ...a,
          id: `a_${a.teacherId || 't'}_${a.classId || 'c'}_${a.subjectId || 's'}_${idx}_${Date.now()}`,
        };
      }
      return a;
    });
  } catch {
    return initialAssignments;
  }
};

export const setStoredAssignments = (assignments: Assignment[]) => {
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
};

export const getStoredTimeConfig = (): TimeConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TIMECONFIG);
    return data ? JSON.parse(data) : initialTimeConfig;
  } catch {
    return initialTimeConfig;
  }
};

export const setStoredTimeConfig = (config: TimeConfig) => {
  localStorage.setItem(STORAGE_KEYS.TIMECONFIG, JSON.stringify(config));
};

export const getStoredScheduleCells = (): ScheduleCell[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE_CELLS);
    return data ? JSON.parse(data) : initialCells;
  } catch {
    return initialCells;
  }
};

export const getStoredLastSavedAt = (): string | null => {
  return localStorage.getItem('tkbsmart_last_saved_at');
};

export const setStoredLastSavedAt = (timeStr: string) => {
  localStorage.setItem('tkbsmart_last_saved_at', timeStr);
};

export const setStoredScheduleCells = (cells: ScheduleCell[]) => {
  localStorage.setItem(STORAGE_KEYS.SCHEDULE_CELLS, JSON.stringify(cells));
};

export const getStoredVersions = (): ScheduleVersion[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VERSIONS);
    return data ? JSON.parse(data) : initialVersions;
  } catch {
    return initialVersions;
  }
};

export const setStoredVersions = (versions: ScheduleVersion[]) => {
  localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(versions));
};

export const resetToSampleData = () => {
  setStoredTeachers(initialTeachers);
  setStoredClasses(initialClasses);
  setStoredSubjects(initialSubjects);
  setStoredAssignments(initialAssignments);
  setStoredTimeConfig(initialTimeConfig);
  setStoredScheduleCells(initialCells);
  setStoredVersions(initialVersions);
};
