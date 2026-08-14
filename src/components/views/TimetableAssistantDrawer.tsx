import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  RotateCcw,
  Clock,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ScheduleCell,
  Teacher,
  ClassItem,
  Subject,
  Assignment,
  TimeConfig,
  ConflictIssue,
  MissingPeriodItem,
} from '../../types';
import {
  AssistantProposal,
  AssistantAnalysisResult,
  analyzeIssueAndFindProposals,
} from '../../utils/timetableAssistant';

interface TimetableAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetIssue: ConflictIssue | MissingPeriodItem | null;
  currentCells: ScheduleCell[];
  teachers: Teacher[];
  classes: ClassItem[];
  subjects: Subject[];
  assignments: Assignment[];
  timeConfig: TimeConfig;
  onApplyProposal: (proposal: AssistantProposal) => Promise<void>;
  onNavigateToTimetable: (classId?: string, teacherId?: string) => void;
  onNavigateToTab?: (tab: string) => void;
  lastAppliedProposal?: AssistantProposal | null;
  onUndoLastApply?: () => Promise<void>;
}

const DAY_LABELS: Record<string, string> = {
  T2: 'Thứ 2',
  T3: 'Thứ 3',
  T4: 'Thứ 4',
  T5: 'Thứ 5',
  T6: 'Thứ 6',
};

export const TimetableAssistantDrawer: React.FC<TimetableAssistantDrawerProps> = ({
  isOpen,
  onClose,
  targetIssue,
  currentCells,
  teachers,
  classes,
  subjects,
  assignments,
  timeConfig,
  onApplyProposal,
  onNavigateToTimetable,
  onNavigateToTab,
  lastAppliedProposal,
  onUndoLastApply,
}) => {
  const [applyingProposalId, setApplyingProposalId] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'proposals' | 'details'>('proposals');

  if (!isOpen || !targetIssue) return null;

  // Run real-time solver analysis on current timetable state
  const analysis: AssistantAnalysisResult = analyzeIssueAndFindProposals(
    targetIssue,
    currentCells,
    teachers,
    classes,
    subjects,
    assignments,
    timeConfig
  );

  const isCritical = analysis.severity === 'critical';
  const isWarning = analysis.severity === 'warning';

  const handleApply = async (proposal: AssistantProposal) => {
    try {
      setApplyingProposalId(proposal.id);
      await onApplyProposal(proposal);
      setAppliedSuccess(`✓ Đã áp dụng thành công: ${proposal.title}`);
      setTimeout(() => setAppliedSuccess(null), 6000);
    } catch (err) {
      alert('Có lỗi khi áp dụng phương án. Vui lòng thử lại!');
    } finally {
      setApplyingProposalId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">Trợ lý Thời Khóa Biểu</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                  AI Solver
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Phân tích lỗi & đề xuất vị trí xếp tiết tối ưu an toàn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Undo Banner if an action was recently applied */}
        {lastAppliedProposal && onUndoLastApply && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Đã áp dụng: <strong>{lastAppliedProposal.title}</strong>
              </span>
            </div>
            <button
              onClick={onUndoLastApply}
              className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hoàn tác thay đổi</span>
            </button>
          </div>
        )}

        {/* Success Alert */}
        {appliedSuccess && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 px-5 flex items-center gap-2 text-xs text-blue-900 font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{appliedSuccess}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
          {/* Issue Summary Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isCritical
                ? 'bg-red-50/70 border-red-200 text-red-950'
                : isWarning
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-blue-50/70 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">
                  {isCritical ? '🔴' : isWarning ? '🟡' : '🔵'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        isCritical
                          ? 'bg-red-200 text-red-800'
                          : isWarning
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      {isCritical ? 'Lỗi nghiêm trọng' : isWarning ? 'Cảnh báo' : 'Phân công'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Mã: {analysis.issueType}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1.5 leading-snug">
                    {analysis.title}
                  </h4>
                </div>
              </div>
            </div>

            {/* Entities involved */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap gap-2 text-xs">
              {analysis.relatedEntity.classItem && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  <span>Lớp {analysis.relatedEntity.classItem.name}</span>
                </div>
              )}
              {analysis.relatedEntity.subject && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{analysis.relatedEntity.subject.name}</span>
                </div>
              )}
              {analysis.relatedEntity.teacher && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>GV: {analysis.relatedEntity.teacher.name}</span>
                </div>
              )}
              {analysis.contextDay && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    {DAY_LABELS[analysis.contextDay] || analysis.contextDay}
                    {analysis.contextPeriod ? ` - Tiết ${analysis.contextPeriod}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Cause breakdown */}
            <div className="mt-3 text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-slate-200/50">
              <span className="font-semibold text-slate-900">🔍 Phân tích nguyên nhân: </span>
              {analysis.cause}
            </div>
          </div>

          {/* Special Advice Box if no direct placement proposal applies */}
          {analysis.isSpecialCase && analysis.specialAdvice && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Hướng dẫn xử lý chuyên môn</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">
                {analysis.specialAdvice}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {onNavigateToTab && (
                  <>
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToTab('assignments');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      Đến trang Phân công chuyên môn
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToTab('teachers');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Xem Danh mục Giáo viên
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Proposals Section */}
          {analysis.proposals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Phương án xử lý tối ưu ({analysis.proposals.length})</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Đã kiểm tra 100% ràng buộc cứng & mềm
                </span>
              </div>

              <div className="space-y-3">
                {analysis.proposals.map((proposal, idx) => {
                  const isOptimal = proposal.isOptimal;
                  const isApplying = applyingProposalId === proposal.id;

                  return (
                    <div
                      key={proposal.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isOptimal
                          ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Top Rank Badge & Title */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {isOptimal ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                              🥇 Phương án tối ưu nhất
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                              Phương án #{proposal.rank}
                            </span>
                          )}
                          <h5 className="font-bold text-sm text-slate-900">{proposal.title}</h5>
                        </div>

                        {/* Score Indicator */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-black text-blue-600">
                              {proposal.score}/100
                            </div>
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                                style={{ width: `${proposal.score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {proposal.description}
                      </p>

                      {/* Criteria Checklist */}
                      <div className="mt-3 grid grid-cols-1 gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                        {proposal.reasons.map((reason, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-1.5">
                            <span className="text-emerald-600 font-bold shrink-0">✓</span>
                            <span>{reason.replace(/^✓\s*/, '')}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToTimetable(
                              analysis.relatedEntity.classItem?.id,
                              analysis.relatedEntity.teacher?.id
                            );
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
                        >
                          <span>Xem TKB</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleApply(proposal)}
                          disabled={isApplying}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
                            isOptimal
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 hover:shadow-blue-500/40'
                              : 'bg-slate-800 hover:bg-slate-700'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isApplying ? 'Đang áp dụng...' : 'Áp dụng phương án'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback if no valid open slots found */}
          {analysis.proposals.length === 0 && !analysis.isSpecialCase && (
            <div className="p-5 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
              <h5 className="font-bold text-sm">Chưa tìm thấy ô trống hoàn toàn phù hợp</h5>
              <p className="text-xs text-amber-800 max-w-sm mx-auto">
                Tất cả các ô trống hiện tại đều vướng giờ khóa của giáo viên hoặc lịch học của lớp. Bạn có thể mở giao diện Thời khóa biểu để hoán đổi tiết thủ công.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToTimetable(
                    analysis.relatedEntity.classItem?.id,
                    analysis.relatedEntity.teacher?.id
                  );
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                <span>Mở bảng Thời khóa biểu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>✨ Thuật toán TKB Tiểu học v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
