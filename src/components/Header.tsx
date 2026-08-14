import React, { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  LogIn,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Info,
  X,
  Check,
  Building2,
  ShieldCheck,
  ChevronDown,
  CloudCheck,
  CloudOff,
} from 'lucide-react';
import { TimeConfig, ScheduleStats, UserProfile, School } from '../types';
import { User } from 'firebase/auth';

interface HeaderProps {
  timeConfig: TimeConfig;
  stats: ScheduleStats;
  user: User | null;
  userProfile?: UserProfile | null;
  currentSchool?: School | null;
  schoolsList?: School[];
  isSyncing: boolean;
  syncError?: string | null;
  isLoggingIn?: boolean;
  loginError?: string | null;
  onNavigateToAudit: () => void;
  onSaveQuickVersion?: () => void;
  onLoginGoogle: () => void;
  onLogout: () => void;
  onSwitchSchool?: (schoolId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeConfig,
  stats,
  user,
  userProfile,
  currentSchool,
  schoolsList = [],
  isSyncing,
  syncError,
  isLoggingIn = false,
  loginError,
  onNavigateToAudit,
  onLoginGoogle,
  onLogout,
  onSwitchSchool,
}) => {
  const [showUserInfoModal, setShowUserInfoModal] = useState<boolean>(false);
  const [isSchoolMenuOpen, setIsSchoolMenuOpen] = useState<boolean>(false);
  const isAdmin = userProfile?.role === 'admin';

  // Format short display name
  const displayName = user
    ? user.displayName || user.email?.split('@')[0] || 'Tài khoản'
    : 'Chưa đăng nhập';

  const userInitial = user
    ? user.displayName
      ? user.displayName.charAt(0).toUpperCase()
      : user.email
      ? user.email.charAt(0).toUpperCase()
      : 'U'
    : 'U';

  return (
    <>
      <header className="print:hidden bg-[#0b1329] text-white border-b border-slate-800/90 px-4 lg:px-6 py-2.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
          
          {/* =========================================================================
              KHU VỰC A: THƯƠNG HIỆU (BRAND)
              ========================================================================= */}
          <div className="flex items-center gap-3 shrink-0">
            {/* App Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-900/30 shrink-0 border border-blue-400/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>

            {/* App Title & Subtitle */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-white uppercase leading-none">
                  THỜI KHÓA BIỂU TIỂU HỌC
                </h1>
                <span className="text-[10px] font-semibold bg-blue-500/15 text-blue-300 px-1.5 py-0.2 rounded border border-blue-400/20 leading-tight">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5 leading-none hidden sm:block">
                Trợ lý thiết kế và xếp thời khóa biểu
              </p>
            </div>
          </div>

          {/* =========================================================================
              KHU VỰC B: NGỮ CẢNH HỆ THỐNG (SYSTEM CONTEXT - SCHOOL & YEAR/SEMESTER)
              ========================================================================= */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* School Selector / Tag */}
            {user && currentSchool ? (
              <div className="relative">
                {isAdmin && schoolsList.length > 1 && onSwitchSchool ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSchoolMenuOpen(!isSchoolMenuOpen)}
                      className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                      title="Bấm để chuyển đổi trường quản lý"
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-slate-400 font-normal">Trường:</span>
                      <span className="text-blue-300 max-w-[160px] lg:max-w-[220px] truncate">
                        {currentSchool.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>

                    {/* School Dropdown Menu */}
                    {isSchoolMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsSchoolMenuOpen(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                            Chọn trường quản lý ({schoolsList.length})
                          </div>
                          <div className="max-h-60 overflow-y-auto py-1">
                            {schoolsList.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  onSwitchSchool(s.id);
                                  setIsSchoolMenuOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                                  s.id === currentSchool.id
                                    ? 'bg-blue-600/20 text-blue-300 font-bold'
                                    : 'text-slate-300'
                                }`}
                              >
                                <span className="truncate">{s.name}</span>
                                {s.id === currentSchool.id && (
                                  <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-slate-400 font-normal">Trường:</span>
                    <span className="text-blue-300 font-bold max-w-[160px] lg:max-w-[220px] truncate" title={currentSchool.name}>
                      {currentSchool.name}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* School Year & Semester Group */}
            <div className="flex items-center gap-2.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-xs">
              <span className="text-slate-300 font-medium">
                {timeConfig.schoolYear}
              </span>
              <span className="w-px h-3 bg-slate-700" />
              <span className="text-slate-300 font-medium">
                Học kỳ <strong className="text-blue-400">{timeConfig.semester}</strong>
              </span>
            </div>
          </div>

          {/* =========================================================================
              KHU VỰC C: TRẠNG THÁI & TÀI KHOẢN (STATUS, AUDIT & ACCOUNT)
              ========================================================================= */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* 1. System Sync Status (Pure SaaS wording, No "Firestore") */}
            <div className="hidden lg:flex items-center">
              {user ? (
                isSyncing ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Đang đồng bộ…</span>
                  </div>
                ) : syncError ? (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold shadow-xs"
                    title={syncError}
                  >
                    <CloudOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Lỗi đồng bộ — Thử lại</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold shadow-xs">
                    <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã lưu & đồng bộ</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold shadow-xs">
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chưa đăng nhập</span>
                </div>
              )}
            </div>

            {/* 2. Audit / Conflict Indicator Group */}
            <button
              type="button"
              onClick={onNavigateToAudit}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 transition-all cursor-pointer shadow-xs text-xs font-semibold"
              title="Bấm để xem danh sách kiểm tra & cảnh báo TKB"
            >
              {stats.criticalErrorCount > 0 ? (
                <span className="flex items-center gap-1 text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-800/80">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{stats.criticalErrorCount} Lỗi</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/70 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>0 Lỗi</span>
                </span>
              )}

              {stats.warningCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-800/60">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>{stats.warningCount} Cảnh báo</span>
                </span>
              )}
            </button>

            {/* 3. Account Chip & Auth Actions */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-900/90 pl-2 pr-1.5 py-1.5 rounded-xl border border-slate-700/80 shadow-xs">
                {/* Avatar */}
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Avatar"
                    className="w-7 h-7 rounded-lg border border-blue-400/50 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {userInitial}
                  </div>
                )}

                {/* User Info & Role */}
                <div className="flex flex-col text-left leading-tight pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white max-w-[90px] sm:max-w-[120px] truncate">
                      {displayName}
                    </span>
                    {isAdmin ? (
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.2 rounded border border-purple-400/30 leading-none">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-400/30 leading-none">
                        Cán bộ
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Đã đăng nhập</span>
                  </span>
                </div>

                {/* Compact Info & Logout Buttons */}
                <div className="flex items-center gap-0.5 border-l border-slate-700/80 pl-1">
                  <button
                    type="button"
                    onClick={() => setShowUserInfoModal(true)}
                    className="text-slate-400 hover:text-blue-300 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Thông tin tài khoản"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLoginGoogle}
                disabled={isLoggingIn}
                className={`flex items-center gap-1.5 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
                  isLoggingIn
                    ? 'bg-amber-600 text-white cursor-wait opacity-90'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
                }`}
                title="Đăng nhập tài khoản Google"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang đăng nhập…</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập Google</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login Error Notification Banner (if any) */}
      {loginError && (
        <div className="bg-rose-600 text-white px-4 py-1.5 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        </div>
      )}

      {/* Account Info Modal */}
      {showUserInfoModal && user && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-4 relative">
            <button
              onClick={() => setShowUserInfoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg">
                  {userInitial}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {user.displayName || 'Tài khoản Google'}
                </h3>
                <p className="text-xs text-slate-500">{user.email || 'Chưa có email'}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
                  <div className="text-slate-400 font-bold uppercase text-[9px]">
                    Vai trò hệ thống
                  </div>
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    {userProfile?.role === 'admin' ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-purple-700">Admin Hệ thống</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-blue-700">Cán bộ Quản lý</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
                  <div className="text-slate-400 font-bold uppercase text-[9px]">Trạng thái</div>
                  <div className="font-bold text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>
                      {userProfile?.status === 'active'
                        ? 'Đang hoạt động'
                        : userProfile?.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* School Assignment Info */}
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/80 space-y-1">
                <div className="text-blue-600 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Trường phân quyền:</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {currentSchool?.name || userProfile?.schoolName || 'Chưa xác định'}
                </div>
                <div className="font-mono text-[11px] text-blue-700">
                  Mã trường: <strong>{currentSchool?.id || userProfile?.schoolId || 'N/A'}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px]">
                  Mã định danh (UID):
                </div>
                <div className="font-mono bg-white p-2 rounded border border-slate-200 text-slate-800 break-all select-all font-bold text-[11px]">
                  {user.uid}
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Dữ liệu thời khóa biểu được lưu trữ an toàn và cô lập riêng biệt theo trường.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUserInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowUserInfoModal(false);
                  onLogout();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xs text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
