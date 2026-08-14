import React from 'react';
import { ShieldAlert, LogOut, Mail, UserX, AlertTriangle, ArrowRight } from 'lucide-react';
import { User } from 'firebase/auth';

interface UnauthorizedAccountViewProps {
  user: User | null;
  onLogout: () => void;
}

export const UnauthorizedAccountView: React.FC<UnauthorizedAccountViewProps> = ({
  user,
  onLogout,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#0b1329] flex items-center justify-center p-4 sm:p-6 text-slate-800 antialiased font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden relative z-10">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-7 text-white text-center space-y-2.5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-lg border border-white/30">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            ⚠️ Tài khoản chưa được cấp quyền
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-sm mx-auto">
            Không tìm thấy thông tin đăng ký của tài khoản trong hệ thống
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4.5 text-xs text-amber-950 space-y-2 leading-relaxed">
            <p className="font-semibold text-amber-900 text-sm">
              Email Google này chưa được quản trị viên đăng ký trong hệ thống.
            </p>
            <p className="text-slate-600">
              Vui lòng liên hệ quản trị viên nhà trường để được cấp quyền truy cập và gán vào trường học trước khi đăng nhập.
            </p>
          </div>

          {/* Account Details */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2.5 text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Thông tin email vừa đăng nhập
            </div>
            <div className="space-y-2 font-medium">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Họ tên Google:</span>
                <span className="font-bold text-slate-800">{user?.displayName || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user?.email || 'N/A'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onLogout}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng nhập lại bằng tài khoản khác</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400">
          © 2026 Thời Khóa Biểu Tiểu Học · Tác giả: Hồng Bích Trâm
        </div>
      </div>
    </div>
  );
};
