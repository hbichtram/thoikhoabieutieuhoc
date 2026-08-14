import React from 'react';
import {
  Calendar,
  Sparkles,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  Zap,
  Lock,
  Building2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface LoginViewProps {
  onLoginGoogle: () => void;
  isLoggingIn: boolean;
  loginError: string | null;
  authReady: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginGoogle,
  isLoggingIn,
  loginError,
  authReady,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* =========================================================================
          LEFT PANEL: BRAND IDENTITY, AI TIMETABLE PREVIEW & CORE VALUES (54%)
          ========================================================================= */}
      <div className="lg:w-[54%] bg-[#0b1329] text-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        {/* TOP: Brand Header */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 shrink-0 border border-blue-400/20">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight text-white uppercase">
                  THỜI KHÓA BIỂU TIỂU HỌC
                </h1>
                <span className="text-[11px] font-semibold bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-md border border-blue-400/20 tracking-wider">
                  v1.0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-normal mt-0.5">
                Trợ lý thiết kế và xếp thời khóa biểu
              </p>
            </div>
          </div>
        </div>

        {/* MIDDLE: AI Timetable Preview Card & 3 Core Values */}
        <div className="relative z-10 my-8 lg:my-10 space-y-5">
          {/* Card: AI Mini Dashboard */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4.5">
            {/* Header of AI Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/90 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </span>
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                  AI ĐANG TỐI ƯU THỜI KHÓA BIỂU
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 bg-blue-950/70 border border-blue-800/50 px-3 py-1 rounded-full self-start sm:self-auto">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                </span>
                <span className="text-[11px] font-medium text-cyan-300">
                  AI đang tối ưu…
                </span>
              </div>
            </div>

            {/* Mini Timetable Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Thứ 2 */}
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  THỨ 2
                </div>
                <div className="space-y-1.5">
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-200 border border-blue-500/25 text-center">
                    Toán
                  </div>
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/60 text-center">
                    Tiếng Việt
                  </div>
                </div>
              </div>

              {/* Thứ 3 */}
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  THỨ 3
                </div>
                <div className="space-y-1.5">
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-200 border border-emerald-500/25 text-center">
                    Tiếng Việt
                  </div>
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/60 text-center">
                    Toán
                  </div>
                </div>
              </div>

              {/* Thứ 4 */}
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  THỨ 4
                </div>
                <div className="space-y-1.5">
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-200 border border-indigo-500/25 text-center">
                    Tiếng Anh
                  </div>
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/60 text-center">
                    Mỹ thuật
                  </div>
                </div>
              </div>

              {/* Thứ 5 */}
              <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  THỨ 5
                </div>
                <div className="space-y-1.5">
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-200 border border-amber-500/25 text-center">
                    Khoa học
                  </div>
                  <div className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/60 text-center">
                    Âm nhạc
                  </div>
                </div>
              </div>
            </div>

            {/* AI Optimization Checklist */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px]">Không trùng giáo viên</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px]">Không trùng lớp</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px]">Đảm bảo số tiết</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px]">Tự phát hiện xung đột</span>
              </div>
            </div>
          </div>

          {/* 3 Core Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-800/90 p-3.5 rounded-xl text-slate-200">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs font-medium leading-snug">
                Xếp TKB tự động thông minh
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-800/90 p-3.5 rounded-xl text-slate-200">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-xs font-medium leading-snug">
                Tự động kiểm tra xung đột
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-800/90 p-3.5 rounded-xl text-slate-200">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs font-medium leading-snug">
                Xuất Word & Excel chuẩn mẫu
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM: Clean Copyright Footer */}
        <div className="relative z-10 text-xs text-slate-400 font-normal pt-4 border-t border-slate-800/60 flex items-center justify-between">
          <span>© 2026 Thời Khóa Biểu Tiểu Học · Tác giả: Hồng Bích Trâm</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL: LOGIN ACTION CARD (46%)
          ========================================================================= */}
      <div className="lg:w-[46%] bg-[#f8fafc] flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="max-w-md w-full bg-white rounded-[24px] border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 sm:p-10 space-y-7">
          {/* Card Header */}
          <div className="text-center space-y-2.5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 mb-4 shadow-sm">
              <Calendar className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-sm text-slate-500 font-normal max-w-xs mx-auto leading-relaxed">
              Quản lý thời khóa biểu nhà trường dễ dàng hơn
            </p>
          </div>

          {/* Friendly Error Alert (if any) */}
          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-medium flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block text-rose-900">Đăng nhập không thành công</span>
                <span className="block text-rose-700 leading-relaxed">
                  Vui lòng thử lại bằng tài khoản Google được cấp quyền.
                </span>
              </div>
            </div>
          )}

          {/* Google Login Action Button */}
          <div className="space-y-4 pt-1">
            <button
              id="google-login-btn"
              type="button"
              onClick={onLoginGoogle}
              disabled={isLoggingIn || !authReady}
              className={`w-full h-[54px] px-6 rounded-[14px] font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 border ${
                isLoggingIn || !authReady
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50/80 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer shadow-sm'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-slate-700">Đang đăng nhập…</span>
                </>
              ) : (
                <>
                  {/* Google SVG Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="font-semibold text-slate-800 text-base">Tiếp tục với Google</span>
                </>
              )}
            </button>

            {!authReady && (
              <p className="text-center text-xs text-slate-400 animate-pulse">
                Đang khởi tạo hệ thống xác thực…
              </p>
            )}

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-normal pt-1">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Đăng nhập an toàn bằng tài khoản Google</span>
            </div>
          </div>

          {/* Target Audience Badge */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Dành cho Ban giám hiệu & cán bộ phụ trách thời khóa biểu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
