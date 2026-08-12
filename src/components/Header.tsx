import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Save,
  LogIn,
  LogOut,
  User as UserIcon,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Info,
  X,
  Check,
} from 'lucide-react';
import { TimeConfig, ScheduleStats } from '../types';
import { User } from 'firebase/auth';

interface HeaderProps {
  timeConfig: TimeConfig;
  stats: ScheduleStats;
  user: User | null;
  isSyncing: boolean;
  syncError?: string | null;
  isLoggingIn?: boolean;
  loginError?: string | null;
  onNavigateToAudit: () => void;
  onSaveQuickVersion: () => void;
  onLoginGoogle: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeConfig,
  stats,
  user,
  isSyncing,
  syncError,
  isLoggingIn = false,
  loginError,
  onNavigateToAudit,
  onSaveQuickVersion,
  onLoginGoogle,
  onLogout,
}) => {
  const [showUserInfoModal, setShowUserInfoModal] = useState<boolean>(false);

  useEffect(() => {
    console.log("[HEADER FIRESTORE STATE]", {
      syncError,
      syncStatus: isSyncing ? "SYNCING" : syncError ? "ERROR" : "SYNCED"
    });
  }, [syncError, isSyncing]);

  return (
    <>
      <header className="print:hidden bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        {/* Brand title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight text-white">TKB SMART</h1>
              <span className="text-xs bg-blue-500/20 text-blue-300 font-medium px-2 py-0.5 rounded border border-blue-400/30">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Trợ lý thiết kế thời khóa biểu trường tiểu học</p>
          </div>
        </div>

        {/* School Year & Semester Badge & Sync Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3 bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-700/80 text-xs">
            <div className="text-slate-300 font-medium">
              Năm học: <span className="text-blue-400 font-bold">{timeConfig.schoolYear}</span>
            </div>
            <div className="w-px h-3.5 bg-slate-700" />
            <div className="text-slate-300 font-medium">
              Học kỳ: <span className="text-blue-400 font-bold">{timeConfig.semester}</span>
            </div>
          </div>

          {/* Sync Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-semibold">
            {user ? (
              isSyncing ? (
                <span className="flex items-center gap-1.5 text-amber-400 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>🔄 Đang đồng bộ...</span>
                </span>
              ) : syncError ? (
                <span className="flex items-center gap-1.5 text-rose-400" title={syncError}>
                  <CloudOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>🔴 Firestore lỗi: {syncError}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-400" title={`UID: ${user.uid}`}>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🟢 Firestore đã đồng bộ</span>
                </span>
              )
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300" title="Cần đăng nhập Google để lưu Firestore">
                <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                <span>🔐 Chưa đăng nhập</span>
              </span>
            )}
          </div>
        </div>

        {/* Audit Stats, Auth & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Firebase Authentication Status & Button */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              {/* User Avatar */}
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User Avatar"
                  className="w-6 h-6 rounded-full border border-blue-400 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600/80 text-white flex items-center justify-center font-bold text-[10px]">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <div className="flex flex-col text-left">
                <span className="font-bold text-white max-w-[110px] truncate leading-tight">
                  {user.displayName || user.email?.split('@')[0] || 'Tài khoản Google'}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium leading-tight">🟢 Đã đăng nhập</span>
              </div>

              {/* User info button */}
              <button
                onClick={() => setShowUserInfoModal(true)}
                className="text-slate-300 hover:text-blue-400 p-1 rounded-lg hover:bg-slate-700 transition-colors ml-1"
                title="👤 Thông tin tài khoản"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="text-slate-300 hover:text-red-400 p-1 rounded-lg hover:bg-slate-700 transition-colors"
                title="🚪 Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginGoogle}
              disabled={isLoggingIn}
              className={`flex items-center gap-1.5 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md transition-all active:scale-95 ${
                isLoggingIn
                  ? 'bg-amber-600 text-white cursor-wait opacity-90'
                  : 'bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/50'
              }`}
              title="Đăng nhập tài khoản Google để tự động lưu dữ liệu vào Firebase Firestore"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>⏳ Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>🔵 Đăng nhập Google</span>
                </>
              )}
            </button>
          )}

          {/* Error / Warning Badges */}
          <button
            onClick={onNavigateToAudit}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors text-xs"
            title="Bấm để xem danh sách lỗi kiểm tra"
          >
            {stats.criticalErrorCount > 0 ? (
              <span className="flex items-center gap-1 font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-lg border border-red-800/80">
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.criticalErrorCount} Lỗi
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/80">
                <CheckCircle className="w-3.5 h-3.5" />
                0 Lỗi
              </span>
            )}

            {stats.warningCount > 0 && (
              <span className="flex items-center gap-1 font-semibold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-800/80">
                {stats.warningCount} Cảnh báo
              </span>
            )}
          </button>

          {/* Quick Save version button */}
          <button
            onClick={onSaveQuickVersion}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
            title="Lưu phiên bản TKB vào Firestore"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu phiên bản</span>
          </button>
        </div>
      </header>

      {/* Login Error Notification Banner */}
      {loginError && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>🔴 {loginError}</span>
          </div>
          <span className="text-[11px] opacity-80">Mở Console (F12) để xem chi tiết.</span>
        </div>
      )}

      {/* Account Info Modal */}
      {showUserInfoModal && user && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-4 relative">
            <button
              onClick={() => setShowUserInfoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
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
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {user.displayName || 'Tài khoản Google'}
                </h3>
                <p className="text-xs text-slate-500">{user.email || 'Chưa có email'}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px]">Mã định danh User (UID):</div>
                <div className="font-mono bg-white p-2 rounded border border-slate-200 text-slate-800 break-all select-all font-bold">
                  {user.uid}
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mọi dữ liệu TKB, Giáo viên, Phân công được lưu riêng biệt theo UID này trên Firebase Firestore.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUserInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition-all"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowUserInfoModal(false);
                  onLogout();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xs text-white transition-all flex items-center gap-1.5"
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
