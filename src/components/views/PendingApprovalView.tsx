import React from 'react';
import { ShieldAlert, RefreshCw, LogOut, Mail, User, Clock, CheckCircle } from 'lucide-react';
import { UserProfile } from '../../types';

interface PendingApprovalViewProps {
  userProfile: UserProfile | null;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  userProfile,
  onRefresh,
  onLogout,
  isRefreshing = false,
}) => {
  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 sm:p-6 text-slate-800 antialiased font-sans">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden">
        {/* Top Accent Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white text-center space-y-2 relative">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-lg border border-white/30">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Tài khoản đang chờ phê duyệt
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 font-medium">
            Tài khoản của bạn đã được ghi nhận vào hệ thống
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Chưa được cấp quyền truy cập dữ liệu trường học</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Hệ thống <strong>THỜI KHÓA BIỂU TIỂU HỌC</strong> hoạt động theo mô hình <strong>Multi-Tenant bảo mật</strong>. Mỗi cán bộ quản lý chỉ được truy cập dữ liệu của trường mình sau khi được Quản trị viên hệ thống phê duyệt và gán mã trường (<code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-amber-800 font-bold">schoolId</code>).
            </p>
          </div>

          {/* User Details */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-3 text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Thông tin tài khoản đăng nhập
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Họ và tên:</span>
                </span>
                <span className="font-bold text-slate-800">{userProfile?.displayName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email:</span>
                </span>
                <span className="font-bold text-slate-800">{userProfile?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Vai trò:</span>
                <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  Cán bộ quản lý
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Đang chờ duyệt</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action guidance */}
          <div className="text-xs text-slate-500 space-y-1.5 border-t border-slate-100 pt-4">
            <p className="font-medium text-slate-700">💡 Hướng dẫn tiếp theo:</p>
            <p>Vui lòng thông báo cho Quản trị viên hệ thống để được kích hoạt tài khoản và gán vào trường của bạn.</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Đang kiểm tra...' : 'Kiểm tra lại quyền'}</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
          © 2026 Thời Khóa Biểu Tiểu Học · Tác giả: Hồng Bích Trâm
        </div>
      </div>
    </div>
  );
};
