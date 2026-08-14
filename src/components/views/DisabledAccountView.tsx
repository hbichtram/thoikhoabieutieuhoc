import React from 'react';
import { ShieldX, LogOut, Mail, Lock } from 'lucide-react';
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
    <div className="min-h-screen w-full bg-[#0b1329] flex items-center justify-center p-4 sm:p-6 text-slate-800 antialiased font-sans relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-7 text-white text-center space-y-2.5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-lg border border-white/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            🔒 Tài khoản đã bị khóa
          </h2>
          <p className="text-xs sm:text-sm text-red-100 font-medium max-w-xs mx-auto">
            Quyền truy cập của tài khoản này đã bị tạm dừng
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-900 space-y-2 leading-relaxed">
            <p className="font-semibold text-rose-950 text-sm">
              Trạng thái: Vô hiệu hóa (Disabled)
            </p>
            <p className="text-slate-700">
              Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ mở khóa.
            </p>
          </div>

          {/* User Details */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2 text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Tài khoản
            </div>
            <div className="space-y-1.5 font-medium">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Người dùng:</span>
                <span className="font-bold text-slate-800">{userProfile?.displayName || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{userProfile?.email || 'N/A'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={onLogout}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng nhập lại bằng tài khoản khác</span>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400">
          © 2026 Thời Khóa Biểu Tiểu Học · Tác giả: Hồng Bích Trâm
        </div>
      </div>
    </div>
  );
};
