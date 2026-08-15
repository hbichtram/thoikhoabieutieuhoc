import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  School as SchoolIcon,
  Users,
  Calendar,
  X,
  Save,
  MapPin,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { School, UserProfile } from '../../types';
import {
  getAllSchools,
  saveSchool,
  deleteSchool,
  getAllUserProfiles,
} from '../../services/firebase';

interface SchoolManagementViewProps {
  currentSchoolId: string;
  onSelectActiveSchool: (schoolId: string) => void;
  onSchoolsChanged?: () => void;
}

export const SchoolManagementView: React.FC<SchoolManagementViewProps> = ({
  currentSchoolId,
  onSelectActiveSchool,
  onSchoolsChanged,
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolIdInput, setSchoolIdInput] = useState<string>('');
  const [schoolNameInput, setSchoolNameInput] = useState<string>('');
  const [schoolCodeInput, setSchoolCodeInput] = useState<string>('');
  const [schoolAddressInput, setSchoolAddressInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteTargetSchool, setDeleteTargetSchool] = useState<School | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedSchools, fetchedUsers] = await Promise.all([
        getAllSchools(),
        getAllUserProfiles(),
      ]);
      setSchools(fetchedSchools);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading schools:', error);
      showToast('error', 'Không thể tải danh sách trường.');
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

  const getManagerCount = (schoolId: string): number => {
    return users.filter((u) => u.schoolId === schoolId).length;
  };

  const handleOpenAdd = () => {
    setEditingSchool(null);
    setSchoolIdInput(`school_${String(schools.length + 1).padStart(3, '0')}`);
    setSchoolNameInput('');
    setSchoolCodeInput('');
    setSchoolAddressInput('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (school: School) => {
    setEditingSchool(school);
    setSchoolIdInput(school.id);
    setSchoolNameInput(school.name);
    setSchoolCodeInput(school.code || '');
    setSchoolAddressInput(school.address || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolIdInput.trim() || !schoolNameInput.trim()) {
      setModalError('Vui lòng nhập đầy đủ Mã trường và Tên trường.');
      return;
    }

    // Format schoolId (alphanumeric and underscores)
    const cleanId = schoolIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // Check duplicate ID when creating new
    if (!editingSchool && schools.some((s) => s.id === cleanId)) {
      setModalError(`Mã trường "${cleanId}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    setIsProcessing(true);
    setModalError(null);

    try {
      const now = new Date().toISOString();
      const schoolData: School = {
        id: cleanId,
        name: schoolNameInput.trim(),
        code: schoolCodeInput.trim().toUpperCase() || cleanId.toUpperCase(),
        address: schoolAddressInput.trim(),
        createdAt: editingSchool ? editingSchool.createdAt : now,
        updatedAt: now,
      };

      const result = await saveSchool(schoolData);
      if (result.success) {
        showToast('success', `Đã lưu trường: ${schoolData.name}`);
        setIsModalOpen(false);
        await loadData();
        onSchoolsChanged?.();
      } else {
        setModalError(
          `[DEBUG SCHOOL CREATE]\nerrorCode: ${result.errorCode || 'unknown'}\nerrorMessage: ${result.error || 'Lỗi không xác định'}\npath: ${result.path || `schools/${schoolData.id}`}`
        );
      }
    } catch (error: any) {
      setModalError(
        `[DEBUG SCHOOL CREATE]\nerrorCode: ${error?.code || 'client_exception'}\nerrorMessage: ${error?.message || 'Đã xảy ra lỗi khi tạo trường.'}\npath: schools/${cleanId}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetSchool) return;

    setIsProcessing(true);
    try {
      const success = await deleteSchool(deleteTargetSchool.id);
      if (success) {
        showToast('success', `Đã xóa trường ${deleteTargetSchool.name}`);
        setDeleteTargetSchool(null);
        await loadData();
        onSchoolsChanged?.();
      } else {
        showToast('error', 'Không thể xóa trường. Vui lòng kiểm tra quyền Admin.');
      }
    } catch (error) {
      showToast('error', 'Lỗi khi xóa trường.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Quản lý Danh sách Trường học
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Mỗi trường là một Tenant độc lập với dữ liệu TKB hoàn toàn tách biệt
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Trường học</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Info */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên trường, mã trường..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
          <span>Tổng số: <strong className="text-slate-900">{schools.length}</strong> trường</span>
          <span className="text-slate-300">•</span>
          <span>
            Đang làm việc: <strong className="text-blue-600 font-bold">{currentSchoolId}</strong>
          </span>
        </div>
      </div>

      {/* Grid of School Cards */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách trường học...</p>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Không tìm thấy trường nào</p>
          <p className="text-xs text-slate-400">Bấm nút "Thêm Trường học" để tạo mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchools.map((school) => {
            const isCurrent = school.id === currentSchoolId;
            const managerCount = getManagerCount(school.id);

            return (
              <div
                key={school.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between space-y-4 relative ${
                  isCurrent
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-3 right-3 text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                    Đang chọn
                  </span>
                )}

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                      {school.code ? school.code.substring(0, 3) : 'TH'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {school.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>Mã ID: <strong>{school.id}</strong></span>
                      </div>
                    </div>
                  </div>

                  {school.address && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{school.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{managerCount} Cán bộ</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tạo: {new Date(school.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(school)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Sửa thông tin trường"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {schools.length > 1 && (
                      <button
                        onClick={() => setDeleteTargetSchool(school)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa trường này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {!isCurrent ? (
                    <button
                      onClick={() => onSelectActiveSchool(school.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Chọn xem TKB</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Trường hiện tại</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT SCHOOL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSchool}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-5 relative"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>{editingSchool ? 'Chỉnh sửa Trường học' : 'Thêm Trường học mới'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Thông tin trường học làm định danh Tenant độc lập
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
                <label className="font-bold text-slate-700">Mã trường (School ID):</label>
                <input
                  type="text"
                  required
                  disabled={!!editingSchool}
                  value={schoolIdInput}
                  onChange={(e) => setSchoolIdInput(e.target.value)}
                  placeholder="e.g. th_lequydon hoặc th_nguyendu"
                  className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                    editingSchool ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
                  }`}
                />
                <p className="text-[10px] text-slate-400">
                  Dùng làm khóa chính Firestore: <code className="font-mono">schools/{'{schoolId}'}</code>
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên trường đầy đủ:</label>
                <input
                  type="text"
                  required
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  placeholder="e.g. Trường Tiểu học Lê Quý Đôn"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mã viết tắt:</label>
                  <input
                    type="text"
                    value={schoolCodeInput}
                    onChange={(e) => setSchoolCodeInput(e.target.value)}
                    placeholder="e.g. LQD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-bold focus:outline-hidden uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Địa chỉ / Tỉnh thành:</label>
                  <input
                    type="text"
                    value={schoolAddressInput}
                    onChange={(e) => setSchoolAddressInput(e.target.value)}
                    placeholder="e.g. Hà Nội"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isProcessing ? 'Đang lưu...' : 'Lưu trường'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTargetSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-slate-800 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">
                Xác nhận xóa trường học?
              </h3>
              <p className="text-xs text-slate-500">
                Bạn có chắc muốn xóa trường <strong>{deleteTargetSchool.name}</strong> ({deleteTargetSchool.id})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTargetSchool(null)}
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
