import React from 'react';
import {
  Home,
  UserCheck,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Calendar,
  AlertTriangle,
  BarChart3,
  Settings,
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'assignments'
  | 'timetable'
  | 'audit'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  errorCount: number;
  warningCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  errorCount,
  warningCount,
}) => {
  const menuItems = [
    { id: 'overview', label: 'Tổng quan', icon: Home },
    { id: 'teachers', label: 'Giáo viên', icon: UserCheck },
    { id: 'classes', label: 'Lớp học', icon: GraduationCap },
    { id: 'subjects', label: 'Môn học', icon: BookOpen },
    { id: 'assignments', label: 'Phân công chuyên môn', icon: ClipboardList },
    { id: 'timetable', label: 'Thiết kế TKB', icon: Calendar, badge: 'Hot' },
    {
      id: 'audit',
      label: 'Kiểm tra TKB',
      icon: AlertTriangle,
      count: errorCount + warningCount,
      hasError: errorCount > 0,
    },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <aside className="print:hidden w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)] text-slate-300">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Chức năng chính
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && !isActive && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-400/20">
                  {item.badge}
                </span>
              )}

              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    item.hasError
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-slate-900'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 bg-slate-950/40">
        <div className="font-medium text-slate-400">THỜI KHÓA BIỂU TIỂU HỌC v1.0</div>
        <div className="mt-0.5 text-[11px] text-slate-500">Tác giả: Hồng Bích Trâm</div>
      </div>
    </aside>
  );
};
