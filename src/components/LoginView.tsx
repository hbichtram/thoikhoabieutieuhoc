import React from 'react';
import { Calendar, AlertTriangle, RefreshCw, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-slate-900 flex flex-col lg:flex-row font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* LEFT COLUMN: BRANDING & ILLUSTRATION */}
      <div className="lg:w-7/12 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:28px_28px] opacity-10 pointer-events-none" />
        
        {/* Ambient Top Light Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-blue-500/25 shrink-0 border border-blue-400/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-2xl lg:text-3xl tracking-tight text-white">THỜI KHÓA BIỂU TIỂU HỌC</h1>
                <span className="text-xs bg-blue-500/20 text-blue-300 font-semibold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  v1.0
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-300 font-medium">
                Trợ lý thiết kế và xếp thời khóa biểu
              </p>
            </div>
          </div>
        </div>

        {/* Timetable Illustration Mockup Card */}
        <div className="relative z-10 my-8 lg:my-12 space-y-6">
          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                  Thời khóa biểu Tiểu học Tự động
                </span>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                100% Đúng chuẩn Bộ GD&ĐT
              </span>
            </div>

            {/* Mini Schedule Grid Mockup */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5'].map((day, idx) => (
                <div key={day} className="bg-slate-900/70 p-2 rounded-xl border border-slate-700/50 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{day}</div>
                  <div className={`p-1.5 rounded-md text-[11px] font-bold ${
                    idx === 0 ? 'bg-blue-600/30 text-blue-200 border border-blue-500/30' :
                    idx === 1 ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/30' :
                    idx === 2 ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30' :
                    'bg-amber-600/30 text-amber-200 border border-amber-500/30'
                  }`}>
                    {idx === 0 ? 'Toán' : idx === 1 ? 'Tiếng Việt' : idx === 2 ? 'Tiếng Anh' : 'Khoa học'}
                  </div>
                  <div className="p-1.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700/50">
                    {idx === 0 ? 'Tiếng Việt' : idx === 1 ? 'Toán' : idx === 2 ? 'Mỹ thuật' : 'Âm nhạc'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl text-slate-200 font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Xếp TKB tự động thông minh</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl text-slate-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tự động kiểm tra xung đột</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl text-slate-200 font-medium">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Xuất Word & Excel chuẩn mẫu</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs text-slate-500 font-medium flex items-center justify-between border-t border-slate-800/80 pt-4">
          <span>© 2026 Thời Khóa Biểu Tiểu Học · Tác giả: Hồng Bích Trâm</span>
          <span>Phần mềm Thời khóa biểu Tiểu học</span>
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN FORM */}
      <div className="lg:w-5/12 bg-slate-100 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 sm:p-10 space-y-8">
          
          {/* Form Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 mb-3 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
              Đăng nhập để quản lý thời khóa biểu của trường
            </p>
          </div>

          {/* Error Message Display */}
          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-medium flex items-start gap-3 text-left shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-rose-800">Đăng nhập không thành công</span>
                <span className="block text-rose-600 leading-relaxed">
                  Vui lòng thử lại. ({loginError})
                </span>
              </div>
            </div>
          )}

          {/* Login Action Section */}
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={onLoginGoogle}
              disabled={isLoggingIn || !authReady}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 border ${
                isLoggingIn || !authReady
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Đang xác thực tài khoản...</span>
                </>
              ) : (
                <>
                  {/* Google Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="font-semibold text-slate-800">Tiếp tục với Google</span>
                </>
              )}
            </button>

            {!authReady && (
              <p className="text-center text-xs text-slate-400 animate-pulse">
                Đang khởi tạo hệ thống xác thực...
              </p>
            )}
          </div>

          {/* Security Assurance */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Sử dụng tài khoản Google để đăng nhập an toàn</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dành cho Hiệu trưởng • Hiệu phó • Cán bộ phụ trách TKB
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
