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
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col lg:flex-row font-sans text-[#0F172A] antialiased">
      {/* =========================================================================
          LEFT PANEL: BRAND IDENTITY, SMART ASSISTANT PREVIEW & FEATURES (57%)
          ========================================================================= */}
      <div className="w-full lg:w-[57%] bg-[#0B1736] text-white p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2563EB]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />

        {/* TOP: Brand Header */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-900/30 shrink-0 border border-blue-400/20">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl lg:text-2xl tracking-tight text-white uppercase">
                  THỜI KHÓA BIỂU TIỂU HỌC
                </h1>
                <span className="text-[10px] font-semibold bg-white/10 text-slate-200 px-1.5 py-0.5 rounded border border-white/10 tracking-wider">
                  v1.0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-normal">
                Trợ lý thiết kế và xếp thời khóa biểu
              </p>
            </div>
          </div>
        </div>

        {/* MIDDLE: Smart Assistant Timetable Box & Features */}
        <div className="relative z-10 my-6 sm:my-8 space-y-4 max-w-2xl">
          {/* Card: TRỢ LÍ TKB THÔNG MINH */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
            {/* Header of Assistant Card */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#06B6D4]">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                  TRỢ LÍ TKB THÔNG MINH
                </span>
              </div>

              {/* Status Badge */}
              <span className="text-[11px] font-medium bg-[#06B6D4]/15 text-[#06B6D4] px-2.5 py-0.5 rounded-full border border-[#06B6D4]/30">
                Trợ lí thông minh
              </span>
            </div>

            {/* 5-Day Full Timetable Grid: Thứ 2 -> Thứ 6 */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {/* Thứ 2 */}
              <div className="bg-[#0B1736] p-2 sm:p-2.5 rounded-lg border border-slate-800 text-center space-y-1.5">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  THỨ 2
                </div>
                <div className="space-y-1">
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-[#2563EB]/20 text-blue-200 border border-[#2563EB]/30 truncate">
                    Toán
                  </div>
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 truncate">
                    Tiếng Việt
                  </div>
                </div>
              </div>

              {/* Thứ 3 */}
              <div className="bg-[#0B1736] p-2 sm:p-2.5 rounded-lg border border-slate-800 text-center space-y-1.5">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  THỨ 3
                </div>
                <div className="space-y-1">
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 truncate">
                    Tiếng Việt
                  </div>
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-[#2563EB]/20 text-blue-200 border border-[#2563EB]/30 truncate">
                    Toán
                  </div>
                </div>
              </div>

              {/* Thứ 4 */}
              <div className="bg-[#0B1736] p-2 sm:p-2.5 rounded-lg border border-slate-800 text-center space-y-1.5">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  THỨ 4
                </div>
                <div className="space-y-1">
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 truncate">
                    Tiếng Anh
                  </div>
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-purple-500/20 text-purple-200 border border-purple-500/30 truncate">
                    Mỹ thuật
                  </div>
                </div>
              </div>

              {/* Thứ 5 */}
              <div className="bg-[#0B1736] p-2 sm:p-2.5 rounded-lg border border-slate-800 text-center space-y-1.5">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  THỨ 5
                </div>
                <div className="space-y-1">
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30 truncate">
                    Khoa học
                  </div>
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-rose-500/20 text-rose-200 border border-rose-500/30 truncate">
                    Âm nhạc
                  </div>
                </div>
              </div>

              {/* Thứ 6 */}
              <div className="bg-[#0B1736] p-2 sm:p-2.5 rounded-lg border border-slate-800 text-center space-y-1.5">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  THỨ 6
                </div>
                <div className="space-y-1">
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 truncate">
                    Tin học
                  </div>
                  <div className="py-1 px-1 rounded text-[10px] sm:text-[11px] font-medium bg-teal-500/20 text-teal-200 border border-teal-500/30 truncate">
                    Đạo đức
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Validation Checklist Criteria */}
            <div className="pt-2.5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                <span className="text-[11px]">Không trùng giáo viên</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                <span className="text-[11px]">Không trùng lớp</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                <span className="text-[11px]">Đảm bảo số tiết</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                <span className="text-[11px]">Tự phát hiện xung đột</span>
              </div>
            </div>
          </div>

          {/* 3 Core Features as Modern Small Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex items-center gap-2.5 bg-slate-900/70 border border-slate-800 p-2.5 sm:p-3 rounded-xl text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-xs font-medium leading-snug">
                Xếp TKB tự động thông minh
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/70 border border-slate-800 p-2.5 sm:p-3 rounded-xl text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4]" />
              </div>
              <span className="text-xs font-medium leading-snug">
                Tự động kiểm tra xung đột
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/70 border border-slate-800 p-2.5 sm:p-3 rounded-xl text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-xs font-medium leading-snug">
                Xuất Word &amp; Excel chuẩn mẫu
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM: Minimal Footer */}
        <div className="relative z-10 text-[11px] text-slate-400 font-normal pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span>© 2026 Thời Khóa Biểu Tiểu Học</span>
          <span>Tác giả: Hồng Bích Trâm</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL: CLEAN & CENTERED LOGIN CARD (43%)
          ========================================================================= */}
      <div className="w-full lg:w-[43%] bg-[#F8FAFC] flex items-center justify-center p-6 sm:p-8 lg:p-10 min-h-[460px] lg:min-h-screen">
        <div className="max-w-[420px] w-full bg-white rounded-[22px] border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Icon & Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-[#2563EB] shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-[26px] font-bold text-[#0F172A] tracking-tight">
                Đăng nhập
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] font-normal mt-1 leading-relaxed">
                Quản lý thời khóa biểu nhà trường dễ dàng hơn
              </p>
            </div>
          </div>

          {/* Friendly Error Alert (if any) */}
          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-rose-900">Đăng nhập không thành công</span>
                <span className="block text-rose-700 leading-relaxed text-[11px]">
                  Tài khoản Google chưa được cấp quyền trong hệ thống. Vui lòng liên hệ Quản trị viên trường để được thêm vào danh sách.
                </span>
              </div>
            </div>
          )}

          {/* Google Login Action Button */}
          <div className="space-y-3 pt-1">
            <button
              id="google-login-btn"
              type="button"
              onClick={onLoginGoogle}
              disabled={isLoggingIn || !authReady}
              className={`w-full h-[52px] px-5 rounded-[12px] font-medium text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-150 border ${
                isLoggingIn || !authReady
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm active:scale-[0.99] cursor-pointer'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                  <span className="text-[#0F172A] font-medium text-sm">Đang đăng nhập…</span>
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
                  <span className="font-semibold text-slate-800 text-sm sm:text-base">
                    Tiếp tục với Google
                  </span>
                </>
              )}
            </button>

            {!authReady && (
              <p className="text-center text-xs text-[#64748B] animate-pulse">
                Đang khởi tạo hệ thống xác thực…
              </p>
            )}

            {/* Subtle Security Notice */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#64748B] font-normal pt-0.5">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Đăng nhập an toàn bằng tài khoản Google</span>
            </div>
          </div>

          {/* Target Audience Line */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-[#64748B]">
            <Building2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span>Dành cho Ban giám hiệu &amp; cán bộ phụ trách thời khóa biểu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
