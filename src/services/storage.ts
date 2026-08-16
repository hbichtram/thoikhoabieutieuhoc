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
  initialSubjects,
  initialTimeConfig,
} from '../data/initialData';

import { normalizeTeacher } from '../utils/teacherUtils';

const getSchoolKey = (schoolId: string, baseKey: string) => {
  const cleanId = (schoolId || 'global').trim();
  return `tkbsmart_${cleanId}_${baseKey}`;
};

export const getStoredTeachers = (schoolId: string = ''): Teacher[] => {
  try {
    const key = getSchoolKey(schoolId, 'teachers');
    const data = localStorage.getItem(key);
    if (!data) return [];
    const rawTeachers: Teacher[] = JSON.parse(data);
    return (rawTeachers || []).map(normalizeTeacher);
  } catch {
    return [];
  }
};

export const setStoredTeachers = (teachers: Teacher[], schoolId: string = '') => {
  const key = getSchoolKey(schoolId, 'teachers');
  localStorage.setItem(key, JSON.stringify(teachers));
};

export const getStoredClasses = (schoolId: string = ''): ClassItem[] => {
  try {
    const key = getSchoolKey(schoolId, 'classes');
    const data = localStorage.getItem(key);
    if (!data) return [];
    const list: ClassItem[] = JSON.parse(data);
    return (list || []).map((c) => {
      let g = c.grade;
      if (!g || g > 5 || g < 1) {
        const match = c.name?.match(/^([1-5])/);
        g = match ? parseInt(match[1], 10) : (g ? Math.min(5, Math.max(1, g)) : 1);
      }
      return { ...c, grade: g };
    });
  } catch {
    return [];
  }
};

export const setStoredClasses = (classes: ClassItem[], schoolId: string = '') => {
  const normalized = (classes || []).map((c) => {
    let g = c.grade;
    if (!g || g > 5 || g < 1) {
      const match = c.name?.match(/^([1-5])/);
      g = match ? parseInt(match[1], 10) : (g ? Math.min(5, Math.max(1, g)) : 1);
    }
    return { ...c, grade: g };
  });
  const key = getSchoolKey(schoolId, 'classes');
  localStorage.setItem(key, JSON.stringify(normalized));
};

export const getStoredSubjects = (schoolId: string = ''): Subject[] => {
  try {
    const key = getSchoolKey(schoolId, 'subjects');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : initialSubjects;
  } catch {
    return initialSubjects;
  }
};

export const setStoredSubjects = (subjects: Subject[], schoolId: string = '') => {
  const key = getSchoolKey(schoolId, 'subjects');
  localStorage.setItem(key, JSON.stringify(subjects));
};

export const getStoredAssignments = (schoolId: string = ''): Assignment[] => {
  try {
    const key = getSchoolKey(schoolId, 'assignments');
    const data = localStorage.getItem(key);
    if (!data) return [];
    const parsed: Assignment[] = JSON.parse(data);
    return (parsed || []).map((a, idx) => {
      if (!a.id) {
        return {
          ...a,
          id: `a_${a.teacherId || 't'}_${a.classId || 'c'}_${a.subjectId || 's'}_${idx}_${Date.now()}`,
        };
      }
      return a;
    });
  } catch {
    return [];
  }
};

export const setStoredAssignments = (assignments: Assignment[], schoolId: string = '') => {
  const key = getSchoolKey(schoolId, 'assignments');
  localStorage.setItem(key, JSON.stringify(assignments));
};

export const getStoredTimeConfig = (schoolId: string = ''): TimeConfig => {
  try {
    const key = getSchoolKey(schoolId, 'timeconfig');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : initialTimeConfig;
  } catch {
    return initialTimeConfig;
  }
};

export const setStoredTimeConfig = (config: TimeConfig, schoolId: string = '') => {
  const key = getSchoolKey(schoolId, 'timeconfig');
  localStorage.setItem(key, JSON.stringify(config));
};

export const getStoredScheduleCells = (schoolId: string = ''): ScheduleCell[] => {
  try {
    const key = getSchoolKey(schoolId, 'cells');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setStoredScheduleCells = (cells: ScheduleCell[], schoolId: string = '') => {
  const key = getSchoolKey(schoolId, 'cells');
  localStorage.setItem(key, JSON.stringify(cells));
};

export const getStoredVersions = (schoolId: string = ''): ScheduleVersion[] => {
  try {
    const key = getSchoolKey(schoolId, 'versions');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setStoredVersions = (versions: ScheduleVersion[], schoolId: string = '') => {
  const key = getSchoolKey(schoolId, 'versions');
  localStorage.setItem(key, JSON.stringify(versions));
};

export const getStoredLastSavedAt = (schoolId: string = ''): string | null => {
  const key = getSchoolKey(schoolId, 'last_saved_at');
  return localStorage.getItem(key);
};

export const setStoredLastSavedAt = (timeStr: string, schoolId: string = '') => {
  const key = getSchoolKey(schoolId, 'last_saved_at');
  localStorage.setItem(key, timeStr);
};

export const resetToSampleData = (schoolId: string = '') => {
  setStoredTeachers([], schoolId);
  setStoredClasses([], schoolId);
  setStoredSubjects(initialSubjects, schoolId);
  setStoredAssignments([], schoolId);
  setStoredTimeConfig(initialTimeConfig, schoolId);
  setStoredScheduleCells([], schoolId);
  setStoredVersions([], schoolId);
};

