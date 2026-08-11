/**
 * TKB SMART - Trợ lý thiết kế thời khóa biểu trường tiểu học
 */

import React, { useState, useEffect, useCallback } from 'react';
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

import {
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  ScheduleCell,
  ScheduleVersion,
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
  subscribeAuthState,
  loginWithGoogle,
  logoutFirebase,
  saveFullStateToFirestore,
  loadFullStateFromFirestore,
  saveTimetableVersionToFirestore,
  deleteTimetableVersionFromFirestore,
} from './services/firebase';

import { User } from 'firebase/auth';
import { checkFullSchedule } from './utils/conflictChecker';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasUnsavedScheduleChanges, setHasUnsavedScheduleChanges] = useState<boolean>(false);

  // Firebase Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Core States
  const [teachers, setTeachers] = useState<Teacher[]>(getStoredTeachers);
  const [classes, setClasses] = useState<ClassItem[]>(getStoredClasses);
  const [subjects, setSubjects] = useState<Subject[]>(getStoredSubjects);
  const [assignments, setAssignments] = useState<Assignment[]>(getStoredAssignments);
  const [timeConfig, setTimeConfig] = useState<TimeConfig>(getStoredTimeConfig);
  const [cells, setCells] = useState<ScheduleCell[]>(getStoredScheduleCells);
  const [versions, setVersions] = useState<ScheduleVersion[]>(getStoredVersions);

  // 1. Listen to Firebase Authentication State
  useEffect(() => {
    const unsubscribe = subscribeAuthState((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log(`[FIREBASE AUTH] Logged in user uid = ${currentUser.uid}, email = ${currentUser.email}`);
        setLoginError(null);
        // Load data from Firestore on sign-in
        setIsSyncing(true);
        loadFullStateFromFirestore(currentUser.uid)
          .then((remoteData) => {
            if (remoteData) {
              if (remoteData.teachers) {
                setTeachers(remoteData.teachers);
                setStoredTeachers(remoteData.teachers);
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
                setCells(remoteData.cells);
                setStoredScheduleCells(remoteData.cells);
              }
              if (remoteData.versions) {
                setVersions(remoteData.versions);
                setStoredVersions(remoteData.versions);
              }
              console.log(`[FIRESTORE] READ SUCCESS: Fully loaded data from Firestore for uid: ${currentUser.uid}`);
            } else {
              console.log(`[FIRESTORE] No existing Firestore document for uid ${currentUser.uid}. Seeding initial data...`);
              saveFullStateToFirestore({
                teachers: getStoredTeachers(),
                classes: getStoredClasses(),
                subjects: getStoredSubjects(),
                assignments: getStoredAssignments(),
                timeConfig: getStoredTimeConfig(),
                cells: getStoredScheduleCells(),
                versions: getStoredVersions(),
              }, currentUser.uid);
            }
          })
          .catch((err) => {
            console.error("[FIRESTORE] Failed to load data from Firestore:", err);
          })
          .finally(() => {
            setIsSyncing(false);
          });
      } else {
        console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng.");
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state to LocalStorage as secondary fallback cache
  useEffect(() => { setStoredTeachers(teachers); }, [teachers]);
  useEffect(() => { setStoredClasses(classes); }, [classes]);
  useEffect(() => { setStoredSubjects(subjects); }, [subjects]);
  useEffect(() => { setStoredAssignments(assignments); }, [assignments]);
  useEffect(() => { setStoredTimeConfig(timeConfig); }, [timeConfig]);
  useEffect(() => { setStoredScheduleCells(cells); }, [cells]);
  useEffect(() => { setStoredVersions(versions); }, [versions]);

  // Helper function to sync current state to Firestore
  const syncToFirestore = useCallback(async (overrides?: {
    teachers?: Teacher[];
    classes?: ClassItem[];
    subjects?: Subject[];
    assignments?: Assignment[];
    timeConfig?: TimeConfig;
    cells?: ScheduleCell[];
    versions?: ScheduleVersion[];
  }) => {
    if (!user) {
      console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng. Bỏ qua ghi Firestore.");
      return;
    }

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

      await saveFullStateToFirestore(fullData, user.uid);
      console.log(`[FIRESTORE] WRITE SUCCESS for uid: ${user.uid}`);
    } catch (error) {
      console.error("[FIRESTORE] WRITE ERROR:", error);
      alert(`⚠️ Lỗi ghi Firestore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSyncing(false);
    }
  }, [user, teachers, classes, subjects, assignments, timeConfig, cells, versions]);

  const handleTabChange = (newTab: TabType) => {
    if (activeTab === 'timetable' && hasUnsavedScheduleChanges && newTab !== 'timetable') {
      const confirmLeave = confirm('⚠️ Bạn có thay đổi TKB chưa được lưu.\n\nBạn có muốn rời khỏi trang không?');
      if (!confirmLeave) return;
    }
    setActiveTab(newTab);
  };

  // Compute Full Schedule Statistics & Conflicts
  const stats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, cells);

  // Handlers for Teachers
  const handleAddTeacher = async (newTeacher: Teacher) => {
    const next = [...teachers, newTeacher];
    setTeachers(next);
    await syncToFirestore({ teachers: next });
  };

  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    const next = teachers.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t));
    setTeachers(next);
    await syncToFirestore({ teachers: next });
  };

  const handleDeleteTeacher = async (id: string) => {
    const targetTeacher = teachers.find((t) => t.id === id || t.code === id);
    const targetId = targetTeacher ? targetTeacher.id : id;
    const targetCode = targetTeacher ? targetTeacher.code : id;

    const nextTeachers = teachers.filter((t) => t.id !== targetId && t.code !== targetCode);
    const nextClasses = classes.map((c) =>
      c.homeroomTeacherId === targetId || c.homeroomTeacherId === targetCode
        ? { ...c, homeroomTeacherId: undefined }
        : c
    );
    const nextAssignments = assignments.filter((a) => a.teacherId !== targetId && a.teacherId !== targetCode);
    const nextCells = cells.filter((c) => c.teacherId !== targetId && c.teacherId !== targetCode);

    setTeachers(nextTeachers);
    setClasses(nextClasses);
    setAssignments(nextAssignments);
    setCells(nextCells);

    await syncToFirestore({
      teachers: nextTeachers,
      classes: nextClasses,
      assignments: nextAssignments,
      cells: nextCells,
    });
  };

  const handleBatchSetTeachers = async (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    await syncToFirestore({ teachers: newTeachers });
  };

  // Handlers for Classes
  const handleAddClass = async (newClass: ClassItem) => {
    const next = [...classes, newClass];
    setClasses(next);
    await syncToFirestore({ classes: next });
  };

  const handleUpdateClass = async (updatedClass: ClassItem) => {
    const next = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
    setClasses(next);
    await syncToFirestore({ classes: next });
  };

  const handleDeleteClass = async (id: string) => {
    const nextClasses = classes.filter((c) => c.id !== id);
    const nextTeachers = teachers.map((t) => (t.homeroomClassId === id ? { ...t, homeroomClassId: undefined } : t));
    setClasses(nextClasses);
    setTeachers(nextTeachers);
    await syncToFirestore({ classes: nextClasses, teachers: nextTeachers });
  };

  // Handlers for Subjects
  const handleAddSubject = async (newSubject: Subject) => {
    const next = [...subjects, newSubject];
    setSubjects(next);
    await syncToFirestore({ subjects: next });
  };

  const handleUpdateSubject = async (updatedSubject: Subject) => {
    const next = subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
    setSubjects(next);
    await syncToFirestore({ subjects: next });
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
      const nextSubjects = subjects.filter((s) => s.id !== id);
      const nextAssignments = assignments.filter((a) => a.subjectId !== id);
      const nextCells = cells.filter((c) => c.subjectId !== id);
      setSubjects(nextSubjects);
      setAssignments(nextAssignments);
      setCells(nextCells);
      await syncToFirestore({ subjects: nextSubjects, assignments: nextAssignments, cells: nextCells });
    }
  };

  // Handlers for Assignments
  const handleAddAssignment = async (newAssignment: Assignment) => {
    const next = [...assignments, newAssignment];
    setAssignments(next);
    await syncToFirestore({ assignments: next });
  };

  const handleUpdateAssignment = async (updatedAssignment: Assignment) => {
    const next = assignments.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a));
    setAssignments(next);
    await syncToFirestore({ assignments: next });
  };

  const handleDeleteAssignment = async (id: string) => {
    const nextAssignments = assignments.filter((a) => a.id !== id);
    const nextCells = cells.filter((c) => c.assignmentId !== id);
    setAssignments(nextAssignments);
    setCells(nextCells);
    await syncToFirestore({ assignments: nextAssignments, cells: nextCells });
  };

  const handleBatchSetAssignments = async (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
    await syncToFirestore({ assignments: newAssignments });
  };

  // Handlers for Versioning
  const handleSaveQuickVersion = async (
    name?: string,
    type: 'draft' | 'editing' | 'official' = 'editing',
    notes?: string
  ) => {
    const vName = name || `TKB – ${new Date().toLocaleDateString('vi-VN')} – Bản ${versions.length + 1}`;
    const newVersion: ScheduleVersion = {
      id: `v_${Date.now()}`,
      name: vName,
      type,
      timestamp: new Date().toLocaleString('vi-VN'),
      cells: [...cells],
      notes,
    };
    const nextVersions = [newVersion, ...versions];
    setVersions(nextVersions);

    if (user) {
      try {
        await saveTimetableVersionToFirestore(newVersion, user.uid);
        await syncToFirestore({ versions: nextVersions });
        console.log(`[FIRESTORE] WRITE SUCCESS: TimetableVersion ${newVersion.id} saved to Firestore.`);
      } catch (err) {
        console.error("[FIRESTORE] WRITE ERROR for TimetableVersion:", err);
        alert(`⚠️ Lỗi ghi TimetableVersion vào Firestore: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      console.warn("[FIREBASE AUTH] Firebase Authentication chưa xác định được người dùng.");
      alert("⚠️ Dữ liệu đã lưu tạm ở LocalStorage. Hãy 'Đăng nhập Google' ở thanh trên để lưu vào Firebase Firestore.");
    }
  };

  const handleRestoreVersion = async (ver: ScheduleVersion) => {
    setCells(ver.cells);
    await syncToFirestore({ cells: ver.cells });
    alert(`Đã khôi phục thành công bản TKB: ${ver.name}`);
  };

  const handleDeleteVersion = async (versionId: string) => {
    const nextVersions = versions.filter((v) => v.id !== versionId);
    setVersions(nextVersions);
    if (user) {
      await deleteTimetableVersionFromFirestore(versionId, user.uid);
      await syncToFirestore({ versions: nextVersions });
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

    await syncToFirestore({
      teachers: t,
      classes: c,
      subjects: s,
      assignments: a,
      timeConfig: tc,
      cells: sc,
      versions: v,
    });
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const loggedInUser = await loginWithGoogle();
      if (loggedInUser) {
        setUser(loggedInUser);
        console.log("[FIREBASE AUTH] Google Login Success:", loggedInUser.email, loggedInUser.uid);
      }
    } catch (error: any) {
      console.error("[FIREBASE AUTH] Google Login Failed:", error);
      let errMsg = "Đăng nhập Google thất bại.";
      if (error?.code === 'auth/operation-not-allowed') {
        errMsg = "Google provider chưa được Enable trong Firebase Console (Authentication -> Sign-in method -> Google).";
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errMsg = "Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.";
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
    setLoginError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <Header
        timeConfig={timeConfig}
        stats={stats}
        user={user}
        isSyncing={isSyncing}
        isLoggingIn={isLoggingIn}
        loginError={loginError}
        onNavigateToAudit={() => setActiveTab('audit')}
        onSaveQuickVersion={() => handleSaveQuickVersion()}
        onLoginGoogle={handleGoogleLogin}
        onLogout={handleLogout}
      />

      {/* Main Body Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          errorCount={stats.criticalErrorCount}
          warningCount={stats.warningCount}
        />

        {/* Content View Page */}
        <main className="flex-1 overflow-y-auto pb-12">
          {activeTab === 'overview' && (
            <DashboardView
              stats={stats}
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
              onUpdateCells={async (newCells) => {
                setCells(newCells);
                await syncToFirestore({ cells: newCells });
              }}
              onHasUnsavedChangesChange={setHasUnsavedScheduleChanges}
            />
          )}

          {activeTab === 'audit' && (
            <ConflictCheckView
              stats={stats}
              onRunGlobalCheck={() => {
                alert('Đã hoàn tất kiểm tra toàn bộ thời khóa biểu!');
              }}
              onNavigateToTimetable={() => {
                setActiveTab('timetable');
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
                await syncToFirestore({ timeConfig: newConfig });
              }}
              onSaveVersion={(name, type, notes) => handleSaveQuickVersion(name, type, notes)}
              onRestoreVersion={handleRestoreVersion}
              onDeleteVersion={handleDeleteVersion}
              onResetSampleData={handleResetSampleData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
