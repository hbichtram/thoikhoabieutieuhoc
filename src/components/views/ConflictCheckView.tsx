import React, { useState } from 'react';
import {
  Search,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Filter,
  Sparkles,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
  User,
  Zap,
} from 'lucide-react';
import {
  ScheduleStats,
  ConflictIssue,
  MissingPeriodItem,
  ScheduleCell,
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  DayOfWeek,
} from '../../types';
import { TimetableAssistantDrawer } from './TimetableAssistantDrawer';
import { AssistantProposal } from '../../utils/timetableAssistant';
import { checkFullSchedule } from '../../utils/conflictChecker';

interface ConflictCheckViewProps {
  stats: ScheduleStats;
  cells: ScheduleCell[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
  timeConfig: TimeConfig;
  onUpdateCells: (newCells: ScheduleCell[]) => Promise<void>;
  onRunGlobalCheck: () => void;
  onNavigateToTimetable: (classId?: string, teacherId?: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const ConflictCheckView: React.FC<ConflictCheckViewProps> = ({
  stats,
  cells,
  teachers,
  classes,
  subjects,
  assignments,
  timeConfig,
  onUpdateCells,
  onRunGlobalCheck,
  onNavigateToTimetable,
  onNavigateToTab,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'missing'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Assistant Drawer State
  const [selectedIssueForAssistant, setSelectedIssueForAssistant] = useState<ConflictIssue | MissingPeriodItem | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Undo and History State
  const [previousCellsSnapshot, setPreviousCellsSnapshot] = useState<ScheduleCell[] | null>(null);
  const [lastAppliedProposal, setLastAppliedProposal] = useState<AssistantProposal | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

  const teacherMap = new Map<string, Teacher>(teachers.map((t) => [t.id, t]));
  const classMap = new Map<string, ClassItem>(classes.map((c) => [c.id, c]));
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  // Combine conflicts, warnings and missing periods into a comprehensive searchable list
  const allAuditedItems: Array<{
    id: string;
    rawItem: ConflictIssue | MissingPeriodItem;
    category: 'critical' | 'warning' | 'missing';
    title: string;
    description: string;
    classId?: string;
    teacherId?: string;
    subjectId?: string;
    day?: DayOfWeek;
  }> = [];

  // Critical Conflicts
  (stats.conflicts || []).forEach((c) => {
    allAuditedItems.push({
      id: c.id,
      rawItem: c,
      category: 'critical',
      title: c.message,
      description: 'Lỗi nghiêm trọng - Vi phạm quy tắc chuẩn thời khóa biểu.',
      classId: c.classId,
      teacherId: c.teacherId,
      subjectId: c.subjectId,
      day: c.day,
    });
  });

  // Warnings
  (stats.warnings || []).forEach((w) => {
    allAuditedItems.push({
      id: w.id,
      rawItem: w,
      category: 'warning',
      title: w.message,
      description: 'Cảnh báo sư phạm - Cần xem xét điều chỉnh để tối ưu lịch học.',
      classId: w.classId,
      teacherId: w.teacherId,
      subjectId: w.subjectId,
      day: w.day,
    });
  });

  // Missing Periods
  (stats.missingPeriods || []).forEach((m) => {
    const cls = classMap.get(m.classId);
    const sub = subjectMap.get(m.subjectId);
    const tch = m.teacherId ? teacherMap.get(m.teacherId) : null;
    allAuditedItems.push({
      id: m.id,
      rawItem: m,
      category: 'missing',
      title: `Thiếu ${m.missing} tiết môn ${sub ? sub.name : m.subjectName || 'Môn học'} (Lớp ${cls ? cls.name : m.className || 'Lớp'})`,
      description: `Phân công: ${m.required} tiết/tuần, hiện mới xếp được ${m.placed} tiết. ${tch ? `(GV: ${tch.name})` : m.teacherName ? `(GV: ${m.teacherName})` : '(Chưa có GV)'}`,
      classId: m.classId,
      teacherId: m.teacherId,
      subjectId: m.subjectId,
    });
  });

  const filteredItems = allAuditedItems.filter((item) => {
    const matchCategory = severityFilter === 'all' || item.category === severityFilter;
    const matchSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleOpenAssistant = (rawItem: ConflictIssue | MissingPeriodItem) => {
    setSelectedIssueForAssistant(rawItem);
    setIsAssistantOpen(true);
  };

  const handleApplyProposal = async (proposal: AssistantProposal) => {
    // 1. Save snapshot of current cells for complete reversible undo
    setPreviousCellsSnapshot([...cells]);
    setLastAppliedProposal(proposal);

    let nextCells: ScheduleCell[] = [...cells];

    if (proposal.actionType === 'add_cell' && proposal.newCellPayload) {
      nextCells.push(proposal.newCellPayload as ScheduleCell);
    } else if (proposal.actionType === 'move_cell' && proposal.cellToMoveId && proposal.newCellPayload) {
      nextCells = nextCells.filter((c) => c.id !== proposal.cellToMoveId);
      nextCells.push(proposal.newCellPayload as ScheduleCell);
    }

    // 2. Perform state update and Firestore sync
    await onUpdateCells(nextCells);

    // 3. Re-run audit verification on new state
    const newStats = checkFullSchedule(teachers, classes, subjects, assignments, timeConfig, nextCells);
    if (newStats.criticalErrorCount < stats.criticalErrorCount || newStats.missingCount < stats.missingCount) {
      setActionNotice({
        type: 'success',
        message: `✓ Đã áp dụng thành công: ${proposal.title}. Đã xử lý vấn đề an toàn!`,
      });
    } else if (newStats.criticalErrorCount > stats.criticalErrorCount) {
      setActionNotice({
        type: 'warning',
        message: `⚠️ Phương án đã được xếp nhưng hệ thống phát hiện có cảnh báo mới. Bạn có thể bấm Hoàn tác nếu muốn.`,
      });
    } else {
      setActionNotice({
        type: 'success',
        message: `✓ Đã xử lý và cập nhật thời khóa biểu thành công!`,
      });
    }

    // Auto clear notification after 8 seconds
    setTimeout(() => {
      setActionNotice(null);
    }, 8000);
  };

  const handleUndo = async () => {
    if (!previousCellsSnapshot) return;
    try {
      await onUpdateCells(previousCellsSnapshot);
      setPreviousCellsSnapshot(null);
      setLastAppliedProposal(null);
      setActionNotice({
        type: 'success',
        message: '↩ Đã hoàn tác thành công! Thời khóa biểu đã quay về trạng thái trước đó.',
      });
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      alert('Không thể hoàn tác. Vui lòng thử lại!');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Global Audit Button */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-red-600" />
            <span>Kiểm tra Xung đột & Trợ lý TKB Thông minh</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl">
            Tự động phân tích xung đột lịch dạy, thiếu tiết, trùng lớp và tích hợp <strong>Trợ lý TKB</strong> giúp tìm vị trí xếp tiết tối ưu an toàn với 1 cú nhấp chuột.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {previousCellsSnapshot && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-4 py-3 rounded-xl transition-all active:scale-95 text-xs shrink-0 shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Hoàn tác thay đổi vừa rồi</span>
            </button>
          )}

          <button
            onClick={onRunGlobalCheck}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 text-xs shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>🔍 KIỂM TRA TOÀN BỘ</span>
          </button>
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs font-medium animate-in fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>

          {previousCellsSnapshot && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 font-bold shadow-2xs text-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hoàn tác ngay</span>
            </button>
          )}
        </div>
      )}

      {/* Audit Stats Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Lỗi nghiêm trọng</div>
          <div
            className={`text-3xl font-bold mt-1 ${
              stats.criticalErrorCount > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {stats.criticalErrorCount} lỗi
          </div>
          <p className="text-[11px] text-slate-400 mt-1">🔴 Không được phép tồn tại</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Thiếu tiết phân công</div>
          <div
            className={`text-3xl font-bold mt-1 ${
              stats.missingCount > 0 ? 'text-blue-600' : 'text-emerald-600'
            }`}
          >
            {stats.missingCount} môn
          </div>
          <p className="text-[11px] text-slate-400 mt-1">🔵 Tổng thiếu {stats.totalMissingPeriodsCount} tiết</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Cảnh báo sư phạm</div>
          <div
            className={`text-3xl font-bold mt-1 ${
              stats.warningCount > 0 ? 'text-amber-600' : 'text-slate-700'
            }`}
          >
            {stats.warningCount} cảnh báo
          </div>
          <p className="text-[11px] text-slate-400 mt-1">🟡 Cần xem xét điều chỉnh</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Tiến độ hoàn thành</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">
            {stats.completionPercentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Đã xếp {stats.totalPlacedPeriods}/{stats.totalRequiredPeriods} tiết
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên GV, lớp, môn học hoặc nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-500">Lọc:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg flex-wrap gap-1">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                severityFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({allAuditedItems.length})
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                severityFilter === 'critical'
                  ? 'bg-white text-red-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-red-600'
              }`}
            >
              🔴 Lỗi ({stats.criticalErrorCount})
            </button>
            <button
              onClick={() => setSeverityFilter('missing')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                severityFilter === 'missing'
                  ? 'bg-white text-blue-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              🔵 Thiếu tiết ({stats.missingCount})
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                severityFilter === 'warning'
                  ? 'bg-white text-amber-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-amber-600'
              }`}
            >
              🟡 Cảnh báo ({stats.warningCount})
            </button>
          </div>
        </div>
      </div>

      {/* Issue Cards List with Trợ lý TKB integration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Danh sách phát hiện ({filteredItems.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Bấm <strong>✨ Trợ lý TKB</strong> tại mỗi mục để nhận đề xuất xử lý tự động
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-12 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <h3 className="font-bold text-emerald-900 text-lg">Không phát hiện vấn đề nào!</h3>
            <p className="text-emerald-700 text-xs mt-1">
              Thời khóa biểu của trường đạt tiêu chuẩn hợp lệ 100%.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCritical = item.category === 'critical';
            const isWarning = item.category === 'warning';
            const isMissing = item.category === 'missing';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-xs ${
                  isCritical
                    ? 'bg-red-50/60 border-red-200 text-red-950'
                    : isWarning
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-blue-50/60 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <span className="text-2xl mt-0.5 shrink-0">
                    {isCritical ? '🔴' : isWarning ? '🟡' : '🔵'}
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isCritical
                            ? 'bg-red-200 text-red-800'
                            : isWarning
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-blue-200 text-blue-800'
                        }`}
                      >
                        {isCritical ? 'Lỗi nghiêm trọng' : isWarning ? 'Cảnh báo' : 'Thiếu tiết'}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 leading-snug">
                      {item.title}
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/50">
                  <button
                    onClick={() => onNavigateToTimetable(item.classId, item.teacherId)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
                  >
                    Xem TKB
                  </button>

                  <button
                    onClick={() => handleOpenAssistant(item.rawItem)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 text-xs transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>Trợ lý TKB</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Timetable Assistant Drawer */}
      <TimetableAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        targetIssue={selectedIssueForAssistant}
        currentCells={cells}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        assignments={assignments}
        timeConfig={timeConfig}
        onApplyProposal={handleApplyProposal}
        onNavigateToTimetable={onNavigateToTimetable}
        onNavigateToTab={onNavigateToTab}
        lastAppliedProposal={lastAppliedProposal}
        onUndoLastApply={previousCellsSnapshot ? handleUndo : undefined}
      />
    </div>
  );
};
