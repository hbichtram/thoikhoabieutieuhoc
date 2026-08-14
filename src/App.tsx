/**
 * THỜI KHÓA BIỂU TIỂU HỌC - Trợ lý thiết kế và xếp thời khóa biểu
 * Tác giả: Hồng Bích Trâm
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { TeachersView } from './components/views/TeachersView';
import { ClassesView } from './components/views/ClassesView';
import { SubjectsView } from './components/views/SubjectsView';
import { AssignmentsView } from './components/views/AssignmentsView';
import { TimetableDesignView } from './components/views/TimetableDesignView';
import { ConflictCheckView } from './components/views/ConflictCheckView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/LoginView';
import { PendingApprovalView } from './components/views/PendingApprovalView';
import { DisabledAccountView } from './components/views/DisabledAccountView';
import { UnauthorizedAccountView } from './components/views/UnauthorizedAccountView';
import { UnassignedSchoolView } from './components/views/UnassignedSchoolView';
import { UserManagementView } from './components/views/UserManagementView';
import { SchoolManagementView } from './components/views/SchoolManagementView';
import { Calendar, RefreshCw } from 'lucide-react';

import {
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  ScheduleCell,
  ScheduleVersion,
  UserProfile,
  School,
} from './types';

import {
  getStoredTeachers,
  setStoredTeachers,
  getStoredClasses,
  setStoredClasses,
  getStoredSubjects,
  setStoredSubjects,
  getStoredAssignments,
  setStoredAssignments,
  getStoredTimeConfig,
  setStoredTimeConfig,
  getStoredScheduleCells,
  setStoredScheduleCells,
  getStoredVersions,
  setStoredVersions,
  resetToSampleData,
} from './services/storage';

import {
  auth,
  subscribeAuthState,
  loginWithGoogle,
  logoutFirebase,
  syncUserProfile,
  getUserProfile,
  getAllSchools,
  getSchool,
  saveSchoolTimetable,
  loadSchoolTimetable,
  saveSchoolVersion,
  getSchoolVersions,
  deleteSchoolVersion,
} from './services/firebase';

import { User } from 'firebase/auth';
import { checkFullSchedule } from './utils/conflictChecker';
import { normalizeTeacher } from './utils/teacherUtils';
import { normalizeScheduleCells } from './utils/timetableUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasUnsavedScheduleChanges, setHasUnsavedScheduleChanges] = useState<boolean>(false);
  const [timetableFilter, setTimetableFilter] = useState<{ classId?: string; teacherId?: string } | null>(null);

  // Firebase Auth, RBAC & Multi-Tenant State
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string>('');

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const activeRequestIdRef = useRef<number>(0);
  const loadedSchoolIdRef = useRef<string | null>(null);

  // Core States for Timetable Data
  const [teachers, setTeachers] = useState<Teacher[]>(getStoredTeachers);
  const [classes, setClasses] = useState<ClassItem[]>(getStoredClasses);
  const [subjects, setSubjects] = useState<Subject[]>(getStoredSubjects);
  const [assignments, setAssignments] = useState<Assignment[]>(getStoredAssignments);
  const [timeConfig, setTimeConfig] = useState<TimeConfig>(getStoredTimeConfig);
  const [cells, setCells] = useState<ScheduleCell[]>(getStoredScheduleCells);
  const [versions, setVersions] = useState<ScheduleVersion[]>(getStoredVersions);

  const setFirestoreSyncSuccess = useCallback((source: string, reqId: number) => {
    if (reqId === activeRequestIdRef.current) {
      console.log(`[FIRESTORE SYNC SUCCESS] (${source}) (reqId #${reqId})`);
      setSyncError(null);
    }
  }, []);

  const setFirestoreSyncError = useCallback((errVal: string, source: string, reqId: number) => {
    if (reqId === activeRequestIdRef.current) {
      console.error(`[FIRESTORE SYNC ERROR] (${source}) (reqId #${reqId}) ->`, errVal);
      setSyncError(errVal);
    }
  }, []);

  // Refresh User Profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
        if (profile.role === 'admin') {
          const schoolList = await getAllSchools();
          setSchools(schoolList);
          if (profile.schoolId) {
            setActiveSchoolId(profile.schoolId);
          } else if (schoolList.length > 0) {
            setActiveSchoolId(schoolList[0].id);
          }
        } else if (profile.role === 'manager' && profile.status === 'active' && profile.schoolId) {
          setActiveSchoolId(profile.schoolId);
          const mySchool = await getSchool(profile.schoolId);
          if (mySchool) {
            setSchools([mySchool]);
          }
        } else {
          setActiveSchoolId('');
          setSchools([]);
        }
      }
    } catch (e) {
      console.error('Error refreshing user profile:', e);
    }
  }, [user]);

  // 1. Listen to Firebase Authentication State & sync user profile
  useEffect(() => {
    const unsubscribe = subscribeAuthState(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await syncUserProfile(currentUser);
          setUserProfile(profile);

          if (profile?.role === 'admin') {
            // Admin can fetch all schools
            const schoolList = await getAllSchools();
            setSchools(schoolList);
            if (profile.schoolId) {
              setActiveSchoolId(profile.schoolId);
            } else if (schoolList.length > 0) {
              setActiveSchoolId(schoolList[0].id);
            }
          } else if (profile?.role === 'manager' && profile.status === 'active' && profile.schoolId) {
            // Manager only fetches their own specific school document
            setActiveSchoolId(profile.schoolId);
            const mySchool = await getSchool(profile.schoolId);
            if (mySchool) {
              setSchools([mySchool]);
            }
          } else {
            setActiveSchoolId('');
            setSchools([]);
          }
        } catch (err) {
          console.error('[AUTH ERROR] Sync user profile failed:', err);
        }
      } else {
        setUserProfile(null);
        setActiveSchoolId('');
        setSchools([]);
        loadedSchoolIdRef.current = null;
        activeRequestIdRef.current += 1;
        setSyncError(null);
        setIsSyncing(false);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Firestore Timetable Data when auth is active and activeSchoolId changes
  useEffect(() => {
    if (!authReady || !user || !userProfile || userProfile.status !== 'active') return;

    // Strict validation: Manager only loads their assigned schoolId
    if (userProfile.role === 'manager') {
      if (!userProfile.schoolId || !userProfile.schoolId.trim() || activeSchoolId !== userProfile.schoolId) {
        return;
      }
    } else if (userProfile.role === 'admin') {
      if (!activeSchoolId || !activeSchoolId.trim()) {
        return;
      }
    } else {
      return;
    }

    const targetSchoolId = activeSchoolId.trim();
    if (!targetSchoolId) return;

    if (loadedSchoolIdRef.current === targetSchoolId) return;
    loadedSchoolIdRef.current = targetSchoolId;

    const currentReqId = ++activeRequestIdRef.current;
    setIsSyncing(true);
    setSyncError(null);

    loadSchoolTimetable(targetSchoolId)
      .then(async (remoteData) => {
        if (currentReqId !== activeRequestIdRef.current) return;
        if (remoteData) {
          if (remoteData.teachers) {
            const normalized = remoteData.teachers.map((t: Teacher) => normalizeTeacher(t));
            setTeachers(normalized);
            setStoredTeachers(normalized);
          }
          if (remoteData.classes) {
            setClasses(remoteData.classes);
            setStoredClasses(remoteData.classes);
          }
          if (remoteData.subjects) {
            setSubjects(remoteData.subjects);
            setStoredSubjects(remoteData.subjects);
          }
          if (remoteData.assignments) {
            setAssignments(remoteData.assignments);
            setStoredAssignments(remoteData.assignments);
          }
          if (remoteData.timeConfig) {
            setTimeConfig(remoteData.timeConfig);
            setStoredTimeConfig(remoteData.timeConfig);
          }
          if (remoteData.cells) {
            const normalizedCells = normalizeScheduleCells(
              remoteData.cells,
              remoteData.assignments || assignments
            );
            setCells(normalizedCells);
            setStoredScheduleCells(normalizedCells);
          }
          if (remoteData.versions) {
            setVersions(remoteData.versions);
            setStoredVersions(remoteData.versions);
          }
          console.log(`[FIRESTORE READ SUCCESS] Loaded school: ${targetSchoolId}`);
        } else {
          console.log(`[FIRESTORE READ SUCCESS] No existing timetable document for school: ${targetSchoolId}`);
        }

        // Also fetch school versions
        try {
          const remoteVersions = await getSchoolVersions(targetSchoolId);
          if (remoteVersions && remoteVersions.length > 0) {
            setVersions(remoteVersions);
            setStoredVersions(remoteVersions);
          }
        } catch (vErr) {
          console.warn('Could not fetch versions collection:', vErr);
        }

        setFirestoreSyncSuccess('LOAD_SCHOOL_DATA_SUCCESS', currentReqId);
      })
      .catch((err) => {
        if (currentReqId !== activeRequestIdRef.current) return;
        const errMsg = err?.code || err?.message || String(err);
        console.error(`[FIRESTORE READ FAILED] for school: ${targetSchoolId}`, err);
        setFirestoreSyncError(errMsg, 'LOAD_SCHOOL_DATA_FAILED', currentReqId);
      })
      .finally(() => {
        if (currentReqId === activeRequestIdRef.current) {
          setIsSyncing(false);
        }
      });
  }, [authReady, user, userProfile, activeSchoolId, setFirestoreSyncSuccess, setFirestoreSyncError]);

  // Sync state to LocalStorage as secondary fallback cache
  useEffect(() => { setStoredTeachers(teachers); }, [teachers]);
  useEffect(() => { setStoredClasses(classes); }, [classes]);
  useEffect(() => { setStoredSubjects(subjects); }, [subjects]);
  useEffect(() => { setStoredAssignments(assignments); }, [assignments]);
  useEffect(() => { setStoredTimeConfig(timeConfig); }, [timeConfig]);
  useEffect(() => { setStoredScheduleCells(cells); }, [cells]);
  useEffect(() => { setStoredVersions(versions); }, [versions]);

  // Helper to persist changes into Firestore for the current active school
  const syncToFirestore = useCallback(
    async (
      overrides?: {
        teachers?: Teacher[];
        classes?: ClassItem[];
        subjects?: Subject[];
        assignments?: Assignment[];
        timeConfig?: TimeConfig;
        cells?: ScheduleCell[];
        versions?: ScheduleVersion[];
      },
      context: string = 'SYNC_TO_FIRESTORE'
    ) => {
      const activeAuthUser = auth.currentUser;
      if (
        !authReady ||
        !user ||
        !activeAuthUser ||
        !userProfile ||
        userProfile.status !== 'active'
      ) {
        return;
      }

      // Check role authorization for activeSchoolId
      if (userProfile.role === 'manager') {
        if (!userProfile.schoolId || !userProfile.schoolId.trim() || activeSchoolId !== userProfile.schoolId) {
          console.warn('[SYNC BLOCKED] Manager without matching active schoolId');
          return;
        }
      } else if (userProfile.role === 'admin') {
        if (!activeSchoolId || !activeSchoolId.trim()) {
          console.warn('[SYNC BLOCKED] Admin without active schoolId');
          return;
        }
      } else {
        return;
      }

      const targetSchoolId = activeSchoolId.trim();
      const currentReqId = ++activeRequestIdRef.current;
      setIsSyncing(true);
      try {
        const fullData = {
          teachers: overrides?.teachers ?? teachers,
          classes: overrides?.classes ?? classes,
          subjects: overrides?.subjects ?? subjects,
          assignments: overrides?.assignments ?? assignments,
          timeConfig: overrides?.timeConfig ?? timeConfig,
          cells: overrides?.cells ?? cells,
          versions: overrides?.versions ?? versions,
        };

        const success = await saveSchoolTimetable(targetSchoolId, fullData, context);
        if (currentReqId === activeRequestIdRef.current) {
          if (success) {
            setFirestoreSyncSuccess(`WRITE_SUCCESS_${context}`, currentReqId);
          }
        }
      } catch (error: any) {
        if (currentReqId === activeRequestIdRef.current) {
          const errMsg = error?.code || error?.message || String(error);
          setFirestoreSyncError(errMsg, `WRITE_ERROR_${context}`, currentReqId);
          console.error(`[FIRESTORE WRITE ERROR] (${context}):`, error);
        }
      } finally {
        if (currentReqId === activeRequestIdRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [
      authReady,
      user,
      userProfile,
      activeSchoolId,
      teachers,
      classes,
      subjects,
      assignments,
      timeConfig,
      cells,
      versions,
      setFirestoreSyncSuccess,
      setFirestoreSyncError,
    ]
  );

  const handleTabChange = (newTab: TabType) => {
    if (activeTab === 'timetable' && hasUnsavedScheduleChanges && newTab !== 'timetable') {
      const confirmLeave = confirm(
        '⚠️ Bạn có thay đổi TKB chưa được lưu.\n\nBạn có muốn rời khỏi trang không?'
      );
      if (!confirmLeave) return;
    }
    setActiveTab(newTab);
  };

  // Compute Full Schedule Statistics & Conflicts
  const stats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, cells);

  // Handlers for Teachers
  const handleAddTeacher = async (newTeacher: Teacher) => {
    const norm = normalizeTeacher(newTeacher);
    const next = [...teachers, norm];
    setTeachers(next);
    await syncToFirestore({ teachers: next }, 'ADD_TEACHER');
  };

  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    const norm = normalizeTeacher(updatedTeacher);
    const next = teachers.map((t) => (t.id === norm.id ? norm : t));
    setTeachers(next);
    await syncToFirestore({ teachers: next }, 'UPDATE_TEACHER');
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    const nextTeachers = teachers.filter((t) => t.id !== teacherId);
    const nextAssignments = assignments.map((a) =>
      a.teacherId === teacherId ? { ...a, teacherId: undefined } : a
    );
    const nextCells = cells.map((c) => (c.teacherId === teacherId ? { ...c, teacherId: '' } : c));
    setTeachers(nextTeachers);
    setAssignments(nextAssignments);
    setCells(nextCells);
    await syncToFirestore(
      {
        teachers: nextTeachers,
        assignments: nextAssignments,
        cells: nextCells,
      },
      'DELETE_TEACHER'
    );
  };

  const handleBatchSetTeachers = async (newTeachers: Teacher[]) => {
    const normList = newTeachers.map((t) => normalizeTeacher(t));
    setTeachers(normList);
    await syncToFirestore({ teachers: normList }, 'BATCH_SET_TEACHERS');
  };

  // Handlers for Classes
  const handleAddClass = async (newClass: ClassItem) => {
    const next = [...classes, newClass];
    setClasses(next);
    await syncToFirestore({ classes: next }, 'ADD_CLASS');
  };

  const handleUpdateClass = async (updatedClass: ClassItem) => {
    const next = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
    setClasses(next);
    await syncToFirestore({ classes: next }, 'UPDATE_CLASS');
  };

  const handleDeleteClass = async (classId: string) => {
    const nextClasses = classes.filter((c) => c.id !== classId);
    const nextAssignments = assignments.filter((a) => a.classId !== classId);
    const nextCells = cells.filter((c) => c.classId !== classId);
    setClasses(nextClasses);
    setAssignments(nextAssignments);
    setCells(nextCells);
    await syncToFirestore(
      {
        classes: nextClasses,
        assignments: nextAssignments,
        cells: nextCells,
      },
      'DELETE_CLASS'
    );
  };

  // Handlers for Subjects
  const handleAddSubject = async (newSubject: Subject) => {
    const next = [...subjects, newSubject];
    setSubjects(next);
    await syncToFirestore({ subjects: next }, 'ADD_SUBJECT');
  };

  const handleUpdateSubject = async (updatedSubject: Subject) => {
    const next = subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
    setSubjects(next);
    await syncToFirestore({ subjects: next }, 'UPDATE_SUBJECT');
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const nextSubjects = subjects.filter((s) => s.id !== subjectId);
    const nextAssignments = assignments.filter((a) => a.subjectId !== subjectId);
    const nextCells = cells.filter((c) => c.subjectId !== subjectId);
    setSubjects(nextSubjects);
    setAssignments(nextAssignments);
    setCells(nextCells);
    await syncToFirestore(
      {
        subjects: nextSubjects,
        assignments: nextAssignments,
        cells: nextCells,
      },
      'DELETE_SUBJECT'
    );
  };

  // Handlers for Assignments
  const handleAddAssignment = async (newAssignment: Assignment) => {
    const next = [...assignments, newAssignment];
    setAssignments(next);
    await syncToFirestore({ assignments: next }, 'ADD_ASSIGNMENT');
  };

  const handleUpdateAssignment = async (updatedAssignment: Assignment) => {
    const next = assignments.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a));
    setAssignments(next);
    await syncToFirestore({ assignments: next }, 'UPDATE_ASSIGNMENT');
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    const next = assignments.filter((a) => a.id !== assignmentId);
    setAssignments(next);
    await syncToFirestore({ assignments: next }, 'DELETE_ASSIGNMENT');
  };

  const handleBatchSetAssignments = async (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
    await syncToFirestore({ assignments: newAssignments }, 'BATCH_SET_ASSIGNMENTS');
  };

  // Version Control Handlers
  const handleSaveQuickVersion = async (
    name?: string,
    type: 'draft' | 'editing' | 'official' = 'editing',
    notes?: string
  ) => {
    const now = new Date();
    const versionName =
      name ||
      `Bản lưu ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const newVersion: ScheduleVersion = {
      id: `ver_${Date.now()}`,
      name: versionName,
      timestamp: now.toISOString(),
      type,
      notes: notes || `Phiên bản TKB trường ${activeSchoolId}`,
      cells: JSON.parse(JSON.stringify(cells)),
    };


    const nextVersions = [newVersion, ...versions];
    setVersions(nextVersions);

    if (
      user &&
      userProfile &&
      userProfile.status === 'active' &&
      activeSchoolId &&
      (userProfile.role === 'admin' || (userProfile.role === 'manager' && userProfile.schoolId === activeSchoolId))
    ) {
      try {
        await saveSchoolVersion(activeSchoolId, newVersion);
        await syncToFirestore({ versions: nextVersions }, 'SAVE_QUICK_VERSION');
        alert(`✅ Đã lưu phiên bản TKB "${newVersion.name}" thành công.`);
      } catch (err: any) {
        console.error('[FIRESTORE] WRITE ERROR for TimetableVersion:', err);
        alert(`⚠️ Lỗi ghi TimetableVersion: ${err?.message || String(err)}`);
      }
    }
  };

  const handleRestoreVersion = async (ver: ScheduleVersion) => {
    setCells(ver.cells);
    await syncToFirestore({ cells: ver.cells }, 'RESTORE_VERSION');
    alert(`Đã khôi phục thành công bản TKB: ${ver.name}`);
  };

  const handleDeleteVersion = async (versionId: string) => {
    const nextVersions = versions.filter((v) => v.id !== versionId);
    setVersions(nextVersions);
    if (
      user &&
      userProfile &&
      userProfile.status === 'active' &&
      activeSchoolId &&
      (userProfile.role === 'admin' || (userProfile.role === 'manager' && userProfile.schoolId === activeSchoolId))
    ) {
      await deleteSchoolVersion(activeSchoolId, versionId);
      await syncToFirestore({ versions: nextVersions }, 'DELETE_VERSION');
    }
  };

  const handleResetSampleData = async () => {
    resetToSampleData();
    const t = getStoredTeachers();
    const c = getStoredClasses();
    const s = getStoredSubjects();
    const a = getStoredAssignments();
    const tc = getStoredTimeConfig();
    const sc = getStoredScheduleCells();
    const v = getStoredVersions();

    setTeachers(t);
    setClasses(c);
    setSubjects(s);
    setAssignments(a);
    setTimeConfig(tc);
    setCells(sc);
    setVersions(v);

    await syncToFirestore(
      {
        teachers: t,
        classes: c,
        subjects: s,
        assignments: a,
        timeConfig: tc,
        cells: sc,
        versions: v,
      },
      'RESET_SAMPLE_DATA'
    );
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    activeRequestIdRef.current += 1;
    setSyncError(null);
    loadedSchoolIdRef.current = null;
    try {
      const loggedInUser = await loginWithGoogle();
      if (loggedInUser) {
        setUser(loggedInUser);
        const profile = await syncUserProfile(loggedInUser);
        setUserProfile(profile);

        if (profile?.role === 'admin') {
          const schoolList = await getAllSchools();
          setSchools(schoolList);
          if (profile.schoolId) {
            setActiveSchoolId(profile.schoolId);
          } else if (schoolList.length > 0) {
            setActiveSchoolId(schoolList[0].id);
          }
        } else if (profile?.role === 'manager' && profile.status === 'active' && profile.schoolId) {
          setActiveSchoolId(profile.schoolId);
          const mySchool = await getSchool(profile.schoolId);
          if (mySchool) {
            setSchools([mySchool]);
          }
        } else {
          setActiveSchoolId('');
          setSchools([]);
        }
      }
    } catch (error: any) {
      console.error('[FIREBASE AUTH] Google Login Failed:', error);
      let errMsg = 'Đăng nhập Google thất bại.';
      if (error?.code === 'auth/operation-not-allowed') {
        errMsg =
          'Google provider chưa được Enable trong Firebase Console (Authentication -> Sign-in method -> Google).';
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errMsg = 'Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.';
      } else if (error?.message) {
        errMsg = error.message;
      }
      setLoginError(errMsg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    await logoutFirebase();
    setUser(null);
    setUserProfile(null);
    setActiveSchoolId('');
    setSchools([]);
    activeRequestIdRef.current += 1;
    setSyncError(null);
    setLoginError(null);
    loadedSchoolIdRef.current = null;
  };

  // Handle Switch School (Admin Only)
  const handleSwitchSchool = (newSchoolId: string) => {
    if (newSchoolId === activeSchoolId) return;
    loadedSchoolIdRef.current = null;
    setActiveSchoolId(newSchoolId);
  };

  // 1. Loading screen while initializing auth
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-blue-500/25 animate-pulse">
          <Calendar className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-3 text-slate-300 font-semibold text-sm bg-slate-900/80 px-4 py-2.5 rounded-full border border-slate-800">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
          <span>Đang xác thực tài khoản & phân quyền...</span>
        </div>
      </div>
    );
  }

  // 2. Show Login Screen if user is not authenticated
  if (!user) {
    return (
      <LoginView
        onLoginGoogle={handleGoogleLogin}
        isLoggingIn={isLoggingIn}
        loginError={loginError}
        authReady={authReady}
      />
    );
  }

  // 3. User is not registered / authorized by Admin
  if (!userProfile) {
    return (
      <UnauthorizedAccountView
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // 4. User is Disabled
  if (userProfile.status === 'disabled') {
    return (
      <DisabledAccountView
        userProfile={userProfile}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Manager is active but not assigned to any school yet
  if (userProfile.role === 'manager' && !userProfile.schoolId) {
    return (
      <UnassignedSchoolView
        userProfile={userProfile}
        onRefresh={refreshProfile}
        onLogout={handleLogout}
      />
    );
  }

  // 6. Legacy pending fallback
  if (userProfile.status === 'pending') {
    return (
      <PendingApprovalView
        userProfile={userProfile}
        onLogout={handleLogout}
        onRefresh={refreshProfile}
      />
    );
  }

  const currentSchool =
    schools.find((s) => s.id === activeSchoolId) ||
    (userProfile?.schoolId
      ? {
          id: userProfile.schoolId,
          name: userProfile.schoolName || userProfile.schoolId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <Header
        timeConfig={timeConfig}
        stats={stats}
        user={user}
        userProfile={userProfile}
        currentSchool={currentSchool}
        schoolsList={schools}
        isSyncing={isSyncing}
        syncError={syncError}
        isLoggingIn={isLoggingIn}
        loginError={loginError}
        onNavigateToAudit={() => setActiveTab('audit')}
        onSaveQuickVersion={() => handleSaveQuickVersion()}
        onLoginGoogle={handleGoogleLogin}
        onLogout={handleLogout}
        onSwitchSchool={handleSwitchSchool}
      />

      {/* Main Body Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          errorCount={stats.criticalErrorCount}
          warningCount={stats.warningCount}
          userProfile={userProfile}
        />

        {/* Content View Page */}
        <main className="flex-1 overflow-y-auto pb-12">
          {activeTab === 'overview' && (
            <DashboardView
              stats={stats}
              cells={cells}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              assignments={assignments}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersView
              teachers={teachers}
              subjects={subjects}
              classes={classes}
              assignments={assignments}
              cells={cells}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onBatchSetTeachers={handleBatchSetTeachers}
            />
          )}

          {activeTab === 'classes' && (
            <ClassesView
              classes={classes}
              teachers={teachers}
              assignments={assignments}
              cells={cells}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectsView
              subjects={subjects}
              onAddSubject={handleAddSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
            />
          )}

          {activeTab === 'assignments' && (
            <AssignmentsView
              assignments={assignments}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              cells={cells}
              onAddAssignment={handleAddAssignment}
              onUpdateAssignment={handleUpdateAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              onBatchSetAssignments={handleBatchSetAssignments}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableDesignView
              cells={cells}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              assignments={assignments}
              timeConfig={timeConfig}
              initialClassId={timetableFilter?.classId}
              initialTeacherId={timetableFilter?.teacherId}
              onUpdateCells={async (newCells) => {
                setCells(newCells);
                await syncToFirestore({ cells: newCells }, 'UPDATE_CELLS');
              }}
              onHasUnsavedChangesChange={setHasUnsavedScheduleChanges}
            />
          )}

          {activeTab === 'audit' && (
            <ConflictCheckView
              stats={stats}
              cells={cells}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              assignments={assignments}
              timeConfig={timeConfig}
              onUpdateCells={async (newCells) => {
                setCells(newCells);
                await syncToFirestore({ cells: newCells }, 'UPDATE_CELLS');
              }}
              onRunGlobalCheck={() => {
                alert('Đã hoàn tất kiểm tra toàn bộ thời khóa biểu! Kết quả đã được làm mới.');
              }}
              onNavigateToTimetable={(classId, teacherId) => {
                setTimetableFilter({ classId, teacherId });
                setActiveTab('timetable');
              }}
              onNavigateToTab={(tab) => {
                setActiveTab(tab as TabType);
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              cells={cells}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              assignments={assignments}
              timeConfig={timeConfig}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              timeConfig={timeConfig}
              versions={versions}
              currentCells={cells}
              onUpdateTimeConfig={async (newConfig) => {
                setTimeConfig(newConfig);
                await syncToFirestore({ timeConfig: newConfig }, 'UPDATE_TIME_CONFIG');
              }}
              onSaveVersion={(name, type, notes) => handleSaveQuickVersion(name, type, notes)}
              onRestoreVersion={handleRestoreVersion}
              onDeleteVersion={handleDeleteVersion}
              onResetSampleData={handleResetSampleData}
            />
          )}

          {/* Admin: User Management */}
          {activeTab === 'users' && userProfile?.role === 'admin' && (
            <UserManagementView
              currentUserProfile={userProfile}
              onRefreshCurrentProfile={refreshProfile}
            />
          )}

          {/* Admin: School Management */}
          {activeTab === 'schools' && userProfile?.role === 'admin' && (
            <SchoolManagementView
              currentSchoolId={activeSchoolId}
              onSelectActiveSchool={(schoolId) => {
                handleSwitchSchool(schoolId);
                setActiveTab('overview');
              }}
              onSchoolsChanged={async () => {
                const updatedSchools = await getAllSchools();
                setSchools(updatedSchools);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
