import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  School as SchoolIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  UserCheck,
  Mail,
  Key,
  AlertTriangle,
  X,
  Save,
  Check,
} from 'lucide-react';
import { UserProfile, School, UserRole, UserStatus } from '../../types';
import {
  getAllUserProfiles,
  createUserProfileByAdmin,
  updateUserProfileByAdmin,
  deleteUserProfileByAdmin,
  getAllSchools,
  ADMIN_EMAIL,
} from '../../services/firebase';

interface UserManagementViewProps {
  currentUserProfile: UserProfile | null;
  onRefreshCurrentProfile: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUserProfile,
  onRefreshCurrentProfile,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('manager');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editSchoolId, setEditSchoolId] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('manager');
  const [newSchoolId, setNewSchoolId] = useState<string>('');

  // Delete Confirm Modal
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserProfile | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedSchools] = await Promise.all([
        getAllUserProfiles(),
        getAllSchools(),
      ]);
      setUsers(fetchedUsers);
      setSchools(fetchedSchools);
    } catch (error) {
      console.error('Error loading user management data:', error);
      setNotification({
        type: 'error',
        message: 'Không thể tải danh sách tài khoản. Vui lòng thử lại.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const getSchoolName = (schoolId: string | null): string => {
    if (!schoolId) return 'Chưa gán trường';
    const found = schools.find((s) => s.id === schoolId);
    return found ? found.name : schoolId;
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditRole(user.role || 'manager');
    setEditStatus(user.status || 'pending');
    setEditSchoolId(user.schoolId || (schools[0]?.id ?? ''));
    setModalError(null);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setModalError(null);

    // Safeguard: Do not demote or disable main admin
    const isMainAdmin = editingUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (isMainAdmin && (editRole !== 'admin' || editStatus !== 'active')) {
      setModalError(`Không thể thay đổi vai trò hoặc khóa tài khoản Quản trị viên chính (${ADMIN_EMAIL}).`);
      return;
    }

    setIsProcessing(true);
    try {
      const selectedSchool = schools.find((s) => s.id === editSchoolId);
      const updates: Partial<UserProfile> = {
        email: editingUser.email,
        displayName: editingUser.displayName,
        role: editRole,
        status: editStatus,
        schoolId: editRole === 'admin' ? (editSchoolId || null) : editSchoolId,
        schoolName: selectedSchool ? selectedSchool.name : (editSchoolId ? editSchoolId : null),
      };

      const success = await updateUserProfileByAdmin(editingUser.uid, updates);
      if (success) {
        showToast('success', `✓ Đã cập nhật thông tin cán bộ ${editingUser.displayName || editingUser.email}`);
        setEditingUser(null);
        await loadData();
        onRefreshCurrentProfile();
      } else {
        setModalError('Lỗi cập nhật dữ liệu Firestore. Vui lòng kiểm tra quyền.');
      }
    } catch (error: any) {
      setModalError(error.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Status Toggle
  const handleQuickStatusChange = async (user: UserProfile, targetStatus: UserStatus) => {
    if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && targetStatus !== 'active') {
      showToast('error', `Không thể khóa tài khoản Quản trị viên chính (${ADMIN_EMAIL}).`);
      return;
    }

    setIsProcessing(true);
    try {
      // Retain existing assigned school or null
      const assignedSchoolId = user.schoolId || null;
      const assignedSchoolName = user.schoolName || null;

      const success = await updateUserProfileByAdmin(user.uid, {
        email: user.email,
        displayName: user.displayName,
        status: targetStatus,
        schoolId: assignedSchoolId,
        schoolName: assignedSchoolName,
      });

      if (success) {
        const actionLabel = targetStatus === 'active' ? 'kích hoạt' : 'khóa';
        showToast('success', `✓ Đã ${actionLabel} tài khoản ${user.displayName || user.email}`);
        await loadData();
      } else {
        showToast('error', 'Cập nhật trạng thái thất bại.');
      }
    } catch (error) {
      showToast('error', 'Lỗi khi cập nhật trạng thái.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;

    if (deleteTargetUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showToast('error', `Không thể xóa tài khoản Quản trị viên chính (${ADMIN_EMAIL}).`);
      setDeleteTargetUser(null);
      return;
    }

    setIsProcessing(true);
    try {
      const success = await deleteUserProfileByAdmin(deleteTargetUser.uid, deleteTargetUser.email);
      if (success) {
        showToast('success', `✓ Đã xóa tài khoản ${deleteTargetUser.displayName || deleteTargetUser.email}`);
        setDeleteTargetUser(null);
        await loadData();
      } else {
        showToast('error', 'Không thể xóa tài khoản này.');
      }
    } catch (error) {
      showToast('error', 'Lỗi xóa tài khoản.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.schoolId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.uid || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchesStatus = selectedStatusFilter === 'all' || u.status === selectedStatusFilter;
    const matchesSchool = selectedSchoolFilter === 'all' || u.schoolId === selectedSchoolFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesSchool;
  });

  useEffect(() => {
    if (!isLoading) {
      console.log(`[STAFF LIST] Matching users:\n${filteredUsers.length}`);
    }
  }, [filteredUsers.length, isLoading, searchTerm, selectedRoleFilter, selectedStatusFilter, selectedSchoolFilter]);

  // Add Pre-registered User (Always Active immediately)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setModalError('Vui lòng nhập email hợp lệ.');
      return;
    }

    if (users.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      setModalError(`Email "${cleanEmail}" đã tồn tại trong danh sách tài khoản.`);
      return;
    }

    const assignedSchoolId = newSchoolId || (schools.length > 0 ? schools[0].id : '');
    if (newRole === 'manager' && !assignedSchoolId) {
      setModalError('Vui lòng tạo ít nhất 1 Trường học trước khi thêm Cán bộ Quản lý.');
      return;
    }

    setIsProcessing(true);
    setModalError(null);
    try {
      const selectedSchool = schools.find((s) => s.id === assignedSchoolId);

      const success = await createUserProfileByAdmin({
        email: cleanEmail,
        displayName: newName.trim() || cleanEmail.split('@')[0],
        role: newRole,
        status: 'active',
        schoolId: newRole === 'admin' ? (assignedSchoolId || null) : assignedSchoolId,
        schoolName: selectedSchool ? selectedSchool.name : (assignedSchoolId || null),
      });

      if (success) {
        const targetSchoolLabel = selectedSchool ? selectedSchool.name : 'toàn hệ thống';
        showToast('success', `✓ Tạo cán bộ thành công! Đã cấp quyền truy cập ${targetSchoolLabel} (🟢 Đang hoạt động).`);
        setIsAddModalOpen(false);
        setNewEmail('');
        setNewName('');
        await loadData();
      } else {
        setModalError('Lỗi khi thêm tài khoản vào Firestore. Vui lòng kiểm tra quyền Admin.');
      }
    } catch (error: any) {
      setModalError(error?.message || 'Lỗi khi tạo tài khoản.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const pendingUsers = users.filter((u) => u.status === 'pending').length;
  const disabledUsers = users.filter((u) => u.status === 'disabled').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto antialiased text-slate-800 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Quản lý Cán bộ & Phân quyền
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Kiểm soát quyền truy cập theo từng trường học (Multi-Tenant Isolation)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => {
              setNewSchoolId(schools[0]?.id || '');
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Cán bộ</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tổng tài khoản
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalUsers}</div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span>Toàn hệ thống</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Đang hoạt động
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{activeUsers}</div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Đã gán trường & cấp quyền</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
            Chờ phê duyệt
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{pendingUsers}</div>
          <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Chờ gán trường / duyệt</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
            Tạm khóa
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{disabledUsers}</div>
          <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
            <ShieldX className="w-3 h-3 text-rose-500" />
            <span>Bị vô hiệu hóa</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên cán bộ, email, mã trường, UID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">🛡️ Admin Hệ thống</option>
            <option value="manager">👤 Cán bộ Quản lý</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">🟢 Đang hoạt động</option>
            <option value="pending">🟡 Chờ phê duyệt</option>
            <option value="disabled">🔴 Đã khóa</option>
          </select>

          {/* School Filter */}
          <select
            value={selectedSchoolFilter}
            onChange={(e) => setSelectedSchoolFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden max-w-[180px] truncate"
          >
            <option value="all">Tất cả trường</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                🏫 {s.name} ({s.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách tài khoản...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Không tìm thấy cán bộ nào</p>
            <p className="text-xs text-slate-400">Thử thay đổi bộ lọc tìm kiếm hoặc thêm cán bộ mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Cán bộ / Email</th>
                  <th className="py-3 px-3">Vai trò</th>
                  <th className="py-3 px-3">Trường được phân quyền</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Ngày tạo</th>
                  <th className="py-3 px-4 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((user) => {
                  const isMainAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                  return (
                    <tr key={user.uid} className="hover:bg-slate-50/60 transition-colors">
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Avatar"
                              className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {user.displayName || 'Chưa đặt tên'}
                              </span>
                              {isMainAdmin && (
                                <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.2 rounded">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{user.email || 'N/A'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              UID: {user.uid.startsWith('pending_') || user.uid.startsWith('invite_') ? (
                                <span className="font-medium text-amber-600 italic">Chờ đăng nhập (tự động nhận UID)</span>
                              ) : (
                                <span className="font-semibold text-slate-600">{user.uid}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-3">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-1 rounded-full font-bold text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                            <span>Admin Hệ thống</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-1 rounded-full font-bold text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Cán bộ Quản lý</span>
                          </span>
                        )}
                      </td>

                      {/* School Assigned */}
                      <td className="py-3 px-3">
                        {user.schoolId ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1 truncate max-w-[200px]">
                              <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{getSchoolName(user.schoolId)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Mã: <span className="font-bold text-slate-600">{user.schoolId}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Chưa gán trường</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-full font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Đang hoạt động</span>
                          </span>
                        ) : user.status === 'invited' ? (
                          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200/80 px-2.5 py-1 rounded-full font-bold text-[11px]" title="Đã cấp quyền qua Gmail, tự kích hoạt khi cán bộ đăng nhập Google">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>Đã cấp quyền</span>
                          </span>
                        ) : user.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-full font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            <span>Chờ duyệt</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-1 rounded-full font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Đã khóa</span>
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Approval button for Pending */}
                          {user.status === 'pending' && (
                            <button
                              onClick={() => handleQuickStatusChange(user, 'active')}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title="Duyệt & Kích hoạt tài khoản"
                            >
                              <Check className="w-3 h-3" />
                              <span>Duyệt</span>
                            </button>
                          )}

                          {/* Quick Toggle Active/Disable */}
                          {user.status === 'active' && !isMainAdmin && (
                            <button
                              onClick={() => handleQuickStatusChange(user, 'disabled')}
                              disabled={isProcessing}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Khóa tài khoản này"
                            >
                              <ShieldX className="w-4 h-4" />
                            </button>
                          )}

                          {user.status === 'disabled' && (
                            <button
                              onClick={() => handleQuickStatusChange(user, 'active')}
                              disabled={isProcessing}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Mở khóa tài khoản"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Full Edit Modal */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa phân quyền & trường học"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button (disabled for main admin) */}
                          {!isMainAdmin && (
                            <button
                              onClick={() => setDeleteTargetUser(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa tài khoản khỏi hệ thống"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-5 relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Phân quyền cán bộ</span>
              </h3>
              <p className="text-xs text-slate-500">
                {editingUser.displayName || editingUser.email}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                Định danh: {editingUser.uid.startsWith('pending_') || editingUser.uid.startsWith('invite_') ? (
                  <span className="font-bold text-amber-700">pendingUsers/{editingUser.email}</span>
                ) : (
                  <span className="font-bold text-slate-700">users/{editingUser.uid}</span>
                )}
              </p>
            </div>

            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Vai trò (Role):</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('manager')}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      editRole === 'manager'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    👤 Cán bộ Quản lý
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      editRole === 'admin'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 ring-2 ring-purple-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🛡️ Admin Hệ thống
                  </button>
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Trạng thái (Status):</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={`py-2 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      editStatus === 'active'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🟢 Hoạt động
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('disabled')}
                    className={`py-2 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      editStatus === 'disabled'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🔴 Khóa
                  </button>
                </div>
              </div>

              {/* School Assignment */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Gán vào trường học ({schools.length} trường có sẵn):
                </label>
                <select
                  value={editSchoolId}
                  onChange={(e) => setEditSchoolId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Chưa gán trường --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Mọi dữ liệu TKB, phân công, giáo viên của trường này sẽ được cô lập riêng theo mã trường đã chọn.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isProcessing ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRE-REGISTERED USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddUser}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-5 relative"
          >
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Thêm Cán bộ Quản lý mới</span>
              </h3>
              <p className="text-xs text-slate-500">
                Đăng ký trước tài khoản và cấp trường cho cán bộ nhà trường
              </p>
            </div>

            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email đăng nhập Google:</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="canbo@gmail.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Họ và tên cán bộ:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Thầy/Cô Nguyễn Văn A"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Trường phân công:</label>
                <select
                  value={newSchoolId}
                  onChange={(e) => setNewSchoolId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Vai trò phân quyền:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="manager">👤 Cán bộ Quản lý</option>
                  <option value="admin">🛡️ Admin Hệ thống</option>
                </select>
              </div>

              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Trạng thái: 🟢 Hoạt động ngay (Active)</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Sau khi Admin tạo, cán bộ đăng nhập bằng Google sẽ vào thẳng Dashboard trường học mà không cần chờ duyệt.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isProcessing ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-slate-800 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">
                Xác nhận xóa tài khoản?
              </h3>
              <p className="text-xs text-slate-500">
                Bạn có chắc chắn muốn xóa tài khoản <strong>{deleteTargetUser.displayName || deleteTargetUser.email}</strong>? Hành động này sẽ thu hồi toàn bộ quyền truy cập của người dùng này.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {isProcessing ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
