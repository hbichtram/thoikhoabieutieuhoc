import React from 'react';
import { ShieldX, LogOut, Mail, User, PhoneCall } from 'lucide-react';
import { UserProfile } from '../../types';

interface DisabledAccountViewProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export const DisabledAccountView: React.FC<DisabledAccountViewProps> = ({
  userProfile,
  onLogout,
}) => {
  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 sm:p-6 text-slate-800 antialiased font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 p-6 text-white text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-lg border border-white/30">
            <ShieldX className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Tài khoản đã bị tạm khóa
          </h2>
          <p className="text-xs sm:text-sm text-red-100 font-medium">
            Truy cập bị từ chối bởi Quản trị viên hệ thống
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
            <p className="leading-relaxed font-medium">
              Tài khoản này hiện đang ở trạng thái <strong>Vô hiệu hóa (Disabled)</strong>. Mọi quyền truy cập vào dữ liệu trường học và tính năng xếp thời khóa biểu đã bị tạm dừng.
            </p>
          </div>

          {/* User Details */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2 text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Tài khoản bị khóa
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Người dùng:</span>
                <span className="font-bold text-slate-800">{userProfile?.displayName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-800">{userProfile?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center space-y-1">
            <p>Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ với Quản trị viên hệ thống để được hỗ trợ mở khóa.</p>
          </div>

          {/* Actions */}
          <button
            onClick={onLogout}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất khỏi tài khoản</span>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
          © 2026 Thời Khóa Biểu Tiểu Học · Tác giả: Hồng Bích Trâm
        </div>
      </div>
    </div>
  );
};
