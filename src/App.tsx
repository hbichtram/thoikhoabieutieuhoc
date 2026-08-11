/**
 * TKB SMART - Trợ lý thiết kế thời khóa biểu trường tiểu học
 */

import React, { useState, useEffect } from 'react';
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
  ConflictIssue,
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

import { checkFullSchedule } from './utils/conflictChecker';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasUnsavedScheduleChanges, setHasUnsavedScheduleChanges] = useState<boolean>(false);

  const handleTabChange = (newTab: TabType) => {
    if (activeTab === 'timetable' && hasUnsavedScheduleChanges && newTab !== 'timetable') {
      const confirmLeave = confirm('⚠️ Bạn có thay đổi TKB chưa được lưu.\n\nBạn có muốn rời khỏi trang không?');
      if (!confirmLeave) return;
    }
    setActiveTab(newTab);
  };

  // Core States
  const [teachers, setTeachers] = useState<Teacher[]>(getStoredTeachers);
  const [classes, setClasses] = useState<ClassItem[]>(getStoredClasses);
  const [subjects, setSubjects] = useState<Subject[]>(getStoredSubjects);
  const [assignments, setAssignments] = useState<Assignment[]>(getStoredAssignments);
  const [timeConfig, setTimeConfig] = useState<TimeConfig>(getStoredTimeConfig);
  const [cells, setCells] = useState<ScheduleCell[]>(getStoredScheduleCells);
  const [versions, setVersions] = useState<ScheduleVersion[]>(getStoredVersions);

  // Sync to localStorage
  useEffect(() => {
    setStoredTeachers(teachers);
  }, [teachers]);

  useEffect(() => {
    setStoredClasses(classes);
  }, [classes]);

  useEffect(() => {
    setStoredSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    setStoredAssignments(assignments);
  }, [assignments]);

  useEffect(() => {
    setStoredTimeConfig(timeConfig);
  }, [timeConfig]);

  useEffect(() => {
    setStoredScheduleCells(cells);
  }, [cells]);

  useEffect(() => {
    setStoredVersions(versions);
  }, [versions]);

  // Compute Full Schedule Statistics & Conflicts
  const stats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, cells);

  // Handlers for Teachers
  const handleAddTeacher = (newTeacher: Teacher) => {
    setTeachers((prev) => [...prev, newTeacher]);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)));
  };

  const handleDeleteTeacher = (id: string) => {
    const targetTeacher = teachers.find((t) => t.id === id || t.code === id);
    const targetId = targetTeacher ? targetTeacher.id : id;
    const targetCode = targetTeacher ? targetTeacher.code : id;

    console.log("App.tsx handleDeleteTeacher executing for:", targetId, targetCode);

    // Filter teachers list strictly by target ID and Code
    setTeachers((prev) =>
      prev.filter((t) => t.id !== targetId && t.code !== targetCode)
    );

    // Clear homeroomTeacherId in classes if this teacher was homeroom teacher
    setClasses((prev) =>
      prev.map((c) =>
        c.homeroomTeacherId === targetId || c.homeroomTeacherId === targetCode
          ? { ...c, homeroomTeacherId: undefined }
          : c
      )
    );

    // Clean up assignments and scheduled cells as safety fallback
    setAssignments((prev) =>
      prev.filter((a) => a.teacherId !== targetId && a.teacherId !== targetCode)
    );

    setCells((prev) =>
      prev.filter((c) => c.teacherId !== targetId && c.teacherId !== targetCode)
    );
  };

  // Handlers for Classes
  const handleAddClass = (newClass: ClassItem) => {
    setClasses((prev) => [...prev, newClass]);
  };

  const handleUpdateClass = (updatedClass: ClassItem) => {
    setClasses((prev) => prev.map((c) => (c.id === updatedClass.id ? updatedClass : c)));
  };

  const handleDeleteClass = (id: string) => {
    // Delete strictly by classId
    setClasses((prev) => prev.filter((c) => c.id !== id));
    // Clear homeroomClassId for any teacher associated with this classId
    setTeachers((prev) =>
      prev.map((t) => (t.homeroomClassId === id ? { ...t, homeroomClassId: undefined } : t))
    );
  };

  // Handlers for Subjects
  const handleAddSubject = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
  };

  const handleUpdateSubject = (updatedSubject: Subject) => {
    setSubjects((prev) => prev.map((s) => (s.id === updatedSubject.id ? updatedSubject : s)));
  };

  const handleDeleteSubject = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setAssignments((prev) => prev.filter((a) => a.subjectId !== id));
      setCells((prev) => prev.filter((c) => c.subjectId !== id));
    }
  };

  // Handlers for Assignments
  const handleAddAssignment = (newAssignment: Assignment) => {
    setAssignments((prev) => [...prev, newAssignment]);
  };

  const handleUpdateAssignment = (updatedAssignment: Assignment) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a))
    );
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setCells((prev) => prev.filter((c) => c.assignmentId !== id));
  };

  // Handlers for Versioning
  const handleSaveQuickVersion = (
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
    setVersions((prev) => [newVersion, ...prev]);
  };

  const handleRestoreVersion = (ver: ScheduleVersion) => {
    setCells(ver.cells);
    alert(`Đã khôi phục thành công bản TKB: ${ver.name}`);
  };

  const handleDeleteVersion = (versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  };

  const handleResetSampleData = () => {
    resetToSampleData();
    setTeachers(getStoredTeachers());
    setClasses(getStoredClasses());
    setSubjects(getStoredSubjects());
    setAssignments(getStoredAssignments());
    setTimeConfig(getStoredTimeConfig());
    setCells(getStoredScheduleCells());
    setVersions(getStoredVersions());
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <Header
        timeConfig={timeConfig}
        stats={stats}
        onNavigateToAudit={() => setActiveTab('audit')}
        onSaveQuickVersion={() => handleSaveQuickVersion()}
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
              onBatchSetTeachers={setTeachers}
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
              onBatchSetAssignments={setAssignments}
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
              onUpdateCells={setCells}
              onHasUnsavedChangesChange={setHasUnsavedScheduleChanges}
            />
          )}

          {activeTab === 'audit' && (
            <ConflictCheckView
              stats={stats}
              onRunGlobalCheck={() => {
                alert('Đã hoàn tất kiểm tra toàn bộ thời khóa biểu!');
              }}
              onNavigateToTimetable={(issue) => {
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
              onUpdateTimeConfig={setTimeConfig}
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
