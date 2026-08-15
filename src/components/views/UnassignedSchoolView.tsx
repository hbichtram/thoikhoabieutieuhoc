import React from 'react';
import { School, LogOut, Mail, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { UserProfile } from '../../types';

interface UnassignedSchoolViewProps {
  userProfile: UserProfile | null;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
  reason?: 'unassigned' | 'not_found';
}

export const UnassignedSchoolView: React.FC<UnassignedSchoolViewProps> = ({
  userProfile,
  onRefresh,
  onLogout,
  isRefreshing = false,
  reason = 'unassigned',
}) => {
  const isNotFound = reason === 'not_found';

  return (
    <div className="min-h-screen w-full bg-[#0b1329] flex items-center justify-center p-4 sm:p-6 text-slate-800 antialiased font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden relative z-10">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-7 text-white text-center space-y-2.5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-lg border border-white/30">
            <School className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {isNotFound
              ? '⚠️ Trường được gán cho tài khoản không tồn tại trong hệ thống'
              : '⚠️ Tài khoản chưa được gán trường'}
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-sm mx-auto">
            {isNotFound
              ? `Mã trường "${userProfile?.schoolId || ''}" không tìm thấy trên hệ thống`
              : 'Tài khoản đã kích hoạt nhưng cần được phân công vào trường học cụ thể'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-950 space-y-2 leading-relaxed">
            <p className="font-semibold text-amber-900 text-sm">
              {isNotFound ? 'Không tìm thấy dữ liệu trường học' : 'Chưa có mã trường học (schoolId)'}
            </p>
            <p className="text-slate-600">
              {isNotFound
                ? `Hồ sơ của bạn được phân công mã trường "${userProfile?.schoolId}", tuy nhiên tài liệu trường này chưa tồn tại trong cơ sở dữ liệu. Vui lòng thông báo Quản trị viên để kiểm tra hoặc tạo trường.`
                : 'Vui lòng liên hệ Quản trị viên hệ thống để được gán vào trường học của bạn trước khi bắt đầu xếp thời khóa biểu.'}
            </p>
          </div>

          {/* Account Details */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2.5 text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Thông tin tài khoản
            </div>
            <div className="space-y-2 font-medium">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Cán bộ:</span>
                <span className="font-bold text-slate-800">{userProfile?.displayName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{userProfile?.email || 'N/A'}</span>
                </span>
              </div>
              {userProfile?.schoolId && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Mã trường gán:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                    {userProfile.schoolId}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Đã kích hoạt (Active)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Đang kiểm tra...' : 'Kiểm tra lại quyền'}</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
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
