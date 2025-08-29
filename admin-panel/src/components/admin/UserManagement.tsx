'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPut, apiPost, apiDelete, TokenExpiredError, ApiError } from '../../utils/api';
import { useTokenHandler } from '../../hooks/useTokenHandler';
import TokenExpiredModal from '../common/TokenExpiredModal';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  UserPlusIcon,
  ArrowPathIcon,
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended' | 'pending';
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  kycLevel?: number; // 0-3, where 0=pending/rejected, 1=basic, 2=intermediate, 3=advanced
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
  totalTrades: number;
  totalVolume: string;
  phoneNumber?: string;
  country?: string;
  role?: string;
  loginAttempts?: number;
  lockUntil?: string;
}

interface UserFilters {
  status?: string;
  kycStatus?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
  verifiedUsers: number;
  kycApprovedUsers: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20
  });
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    pendingUsers: 0,
    verifiedUsers: 0,
    kycApprovedUsers: 0
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User>>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    country: '',
    role: 'user',
    status: 'active',
    kycStatus: 'pending',
    kycLevel: 0
  });
  const [createFormData, setCreateFormData] = useState<Partial<User>>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    country: '',
    role: 'user',
    status: 'active',
    password: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  
  const { isTokenExpiredModalOpen, handleApiError, closeTokenExpiredModal, redirectToLogin } = useTokenHandler();

  // Fill edit form when selectedUser changes
  useEffect(() => {
    if (selectedUser && showEditModal) {
      setEditFormData({
        email: selectedUser.email || '',
        username: selectedUser.username || '',
        firstName: selectedUser.firstName || '',
        lastName: selectedUser.lastName || '',
        phoneNumber: selectedUser.phoneNumber || '',
        country: selectedUser.country || '',
        role: selectedUser.role || 'user',
        status: selectedUser.status || 'active',
        kycStatus: selectedUser.kycStatus || 'pending',
        kycLevel: selectedUser.kycLevel || 0
      });
    }
  }, [selectedUser, showEditModal]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.kycStatus) queryParams.append('kycStatus', filters.kycStatus);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.emailVerified !== undefined) queryParams.append('emailVerified', filters.emailVerified.toString());
      if (filters.twoFactorEnabled !== undefined) queryParams.append('twoFactorEnabled', filters.twoFactorEnabled.toString());
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await apiGet(`/admin/users?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
        setTotalUsers(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
        
        // Update stats
        if (data.data.stats) {
          setUserStats(data.data.stats);
        }
      } else {
        toast.error('Gagal memuat data user');
      }
    } catch (error) {
      // Debug: Log error detail dari server
      console.log('❌ [DEBUG] Error saat update user:');
      console.log('📥 Error Type:', error.constructor.name);
      console.log('📥 Error Message:', error.message);
      if (error instanceof ApiError) {
        console.log('📥 Status Code:', error.status);
        console.log('📥 Error Code:', error.code);
        console.log('📥 Error Details:', JSON.stringify(error.details, null, 2));
      }
      console.log('📥 Full Error Object:', error);
      
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error);
      } else {
        console.error('Error fetching users:', error);
        toast.error('Gagal memuat data user');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, handleApiError]);

  const handleSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setFilters({ ...filters, sortBy: key, sortOrder: direction, page: 1 });
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;
    
    try {
      setActionLoading(true);
      
      // Optimistic update
      const oldUsers = [...users];
      if (bulkAction === 'delete') {
        setUsers(prevUsers => prevUsers.filter(user => !selectedUsers.includes(user.id)));
        setTotalUsers(prev => prev - selectedUsers.length);
      } else {
        setUsers(prevUsers => 
          prevUsers.map(user => 
            selectedUsers.includes(user.id) 
              ? { ...user, status: bulkAction as 'active' | 'suspended' | 'pending' }
              : user
          )
        );
      }
      
      const response = await apiPost('/admin/users/bulk-action', {
        action: bulkAction,
        userIds: selectedUsers
      });
      
      if (response.ok) {
        toast.success(`Bulk action ${bulkAction} berhasil diterapkan`);
        setSelectedUsers([]);
        setBulkAction('');
        // Refresh stats after bulk action
        setTimeout(() => fetchUsers(), 1000);
      } else {
        // Revert optimistic update on error
        setUsers(oldUsers);
        if (bulkAction === 'delete') {
          setTotalUsers(prev => prev + selectedUsers.length);
        }
        toast.error('Gagal menjalankan bulk action');
      }
    } catch (error) {
      // Revert optimistic update on error
      setUsers(oldUsers);
      if (bulkAction === 'delete') {
        setTotalUsers(prev => prev + selectedUsers.length);
      }
      if (error instanceof TokenExpiredError) {
        handleApiError(error);
      } else {
        console.error('Error bulk action:', error);
        toast.error('Gagal menjalankan bulk action');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const resetPassword = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin reset password user ini?')) return;
    
    try {
      setActionLoading(true);
      const response = await apiPost(`/admin/users/${userId}/reset-password`, {});
      if (response.ok) {
        toast.success('Password reset berhasil dikirim ke email user');
      } else {
        toast.error('Gagal reset password');
      }
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        handleApiError(error);
      } else {
        console.error('Error reset password:', error);
        toast.error('Gagal reset password');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    
    try {
      // Optimistic update
      const oldUsers = [...users];
      const userToDelete = users.find(u => u.id === userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setTotalUsers(prev => prev - 1);
      
      // Update stats optimistically
      if (userToDelete) {
        setUserStats(prev => {
          let newStats = { ...prev, totalUsers: prev.totalUsers - 1 };
          if (userToDelete.status === 'active') newStats.activeUsers--;
          else if (userToDelete.status === 'suspended') newStats.suspendedUsers--;
          else if (userToDelete.status === 'pending') newStats.pendingUsers--;
          
          if (userToDelete.emailVerified) newStats.verifiedUsers--;
          if (userToDelete.kycStatus === 'approved') newStats.kycApprovedUsers--;
          
          return newStats;
        });
      }
      
      const response = await apiDelete(`/admin/users/${userId}`);
      if (response.ok) {
        toast.success('User berhasil dihapus');
      } else {
        // Revert optimistic update on error
        setUsers(oldUsers);
        setTotalUsers(prev => prev + 1);
        toast.error('Gagal menghapus user');
      }
    } catch (error) {
      // Revert optimistic update on error
      setUsers(oldUsers);
      setTotalUsers(prev => prev + 1);
      if (error instanceof TokenExpiredError) {
        handleApiError(error);
      } else {
        console.error('Error delete user:', error);
        toast.error('Gagal menghapus user');
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.email || !createFormData.username || !createFormData.firstName || !createFormData.lastName) {
      toast.error('Harap isi semua field yang wajib');
      return;
    }

    try {
      setFormLoading(true);
      
      // Debug: Log data yang akan dikirim ke server
      console.log('🚀 [DEBUG] Data create user yang dikirim ke server:');
      console.log('📤 Create Form Data:', JSON.stringify(createFormData, null, 2));
      console.log('📤 Request URL:', '/admin/users');
      
      const response = await apiPost('/admin/users', createFormData);
      
      if (response.ok) {
        const newUser = await response.json();
        
        // Debug: Log response sukses dari server
        console.log('✅ [DEBUG] Response sukses create user dari server:');
        console.log('📥 Status:', response.status);
        console.log('📥 Response Data:', JSON.stringify(newUser, null, 2));
        
        // Optimistic update
        setUsers(prevUsers => [newUser.data, ...prevUsers]);
        setTotalUsers(prev => prev + 1);
        setUserStats(prev => ({
          ...prev,
          totalUsers: prev.totalUsers + 1,
          activeUsers: newUser.data.status === 'active' ? prev.activeUsers + 1 : prev.activeUsers
        }));
        
        toast.success('User berhasil dibuat');
        setShowCreateModal(false);
        setCreateFormData({
          email: '',
          username: '',
          firstName: '',
          lastName: '',
          phoneNumber: '',
          country: '',
          role: 'user',
          status: 'active',
          password: ''
        });
        // Refresh data untuk memastikan konsistensi
        setTimeout(() => fetchUsers(), 1000);
      } else {
        const errorData = await response.json();
        
        // Debug: Log error response dari server
        console.log('❌ [DEBUG] Error response create user dari server:');
        console.log('📥 Status:', response.status);
        console.log('📥 Error Data:', JSON.stringify(errorData, null, 2));
        
        toast.error(errorData.message || 'Gagal membuat user');
      }
    } catch (error) {
      // Debug: Log error detail dari server
      console.log('❌ [DEBUG] Error saat create user:');
      console.log('📥 Error Type:', error.constructor.name);
      console.log('📥 Error Message:', error.message);
      if (error instanceof ApiError) {
        console.log('📥 Status Code:', error.status);
        console.log('📥 Error Code:', error.code);
        console.log('📥 Error Details:', JSON.stringify(error.details, null, 2));
      }
      console.log('📥 Full Error Object:', error);
      
      if (error instanceof TokenExpiredError) {
        handleApiError(error);
      } else {
        console.error('Error creating user:', error);
        toast.error('Gagal membuat user');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setFormLoading(true);
      
      // Validate and clean data before sending
      const cleanedData = { ...editFormData };
      
      // Remove empty strings and replace with null or remove entirely
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') {
          delete cleanedData[key]; // Remove empty fields entirely
        }
      });
      
      // Ensure required fields have valid values
      if (cleanedData.firstName && !/^[a-zA-Z\s]+$/.test(cleanedData.firstName)) {
        toast.error('Nama depan hanya boleh berisi huruf dan spasi');
        return;
      }
      
      if (cleanedData.lastName && !/^[a-zA-Z\s]+$/.test(cleanedData.lastName)) {
        toast.error('Nama belakang hanya boleh berisi huruf dan spasi');
        return;
      }
      
      if (cleanedData.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(cleanedData.phoneNumber)) {
        toast.error('Format nomor telepon tidak valid');
        return;
      }
      
      if (cleanedData.country && cleanedData.country.length !== 2) {
        toast.error('Kode negara harus 2 huruf');
        return;
      }
      
      // Debug: Log data yang akan dikirim ke server
      console.log('🚀 [DEBUG] Data yang dikirim ke server:');
      console.log('📤 User ID:', selectedUser.id);
      console.log('📤 Edit Form Data:', JSON.stringify(cleanedData, null, 2));
      console.log('📤 Request URL:', `/admin/users/${selectedUser.id}`);
      
      const response = await apiPut(`/admin/users/${selectedUser.id}`, cleanedData);
      
      const updatedUser = await response.json();
      
      // Debug: Log response dari server
      console.log('✅ [DEBUG] Response sukses dari server:');
      console.log('📥 Status:', response.status);
      console.log('📥 Response Data:', JSON.stringify(updatedUser, null, 2));
      
      // Optimistic update
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id ? { ...user, ...updatedUser.data } : user
        )
      );
      
      // Show success message from backend or default
      toast.success(updatedUser.message || 'User berhasil diperbarui');
      setShowEditModal(false);
      setEditFormData({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        country: '',
        role: 'user',
        status: 'active',
        kycStatus: 'pending',
        kycLevel: 0
      });
      setSelectedUser(null);
      // Refresh data untuk memastikan konsistensi
      setTimeout(() => fetchUsers(), 1000);
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error);
      } else {
        console.error('Error updating user:', error);
        toast.error('Gagal memperbarui user');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const exportUsers = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.kycStatus) queryParams.append('kycStatus', filters.kycStatus);
      if (filters.search) queryParams.append('search', filters.search);
      
      const response = await apiGet(`/admin/users/export?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Export berhasil');
      } else {
        toast.error('Gagal export data');
      }
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        handleApiError(error);
      } else {
        console.error('Error export:', error);
        toast.error('Gagal export data');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, fetchUsers]);

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      // Optimistic update
      const oldUsers = [...users];
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, status: status as 'active' | 'suspended' | 'pending' } : user
        )
      );
      
      const response = await apiPut(`/admin/users/${userId}/status`, { status });

      if (response.ok) {
        toast.success('Status user berhasil diperbarui');
        // Update stats optimistically
        setUserStats(prev => {
          const oldUser = oldUsers.find(u => u.id === userId);
          if (!oldUser) return prev;
          
          let newStats = { ...prev };
          // Decrease old status count
          if (oldUser.status === 'active') newStats.activeUsers--;
          else if (oldUser.status === 'suspended') newStats.suspendedUsers--;
          else if (oldUser.status === 'pending') newStats.pendingUsers--;
          
          // Increase new status count
          if (status === 'active') newStats.activeUsers++;
          else if (status === 'suspended') newStats.suspendedUsers++;
          else if (status === 'pending') newStats.pendingUsers++;
          
          return newStats;
        });
      } else {
        // Revert optimistic update on error
        setUsers(oldUsers);
        toast.error('Gagal memperbarui status user');
      }
    } catch (error) {
      // Revert optimistic update on error
      setUsers(oldUsers);
      if (error instanceof TokenExpiredError) {
        handleApiError(error);
      } else {
        console.error('Error updating user status:', error);
        toast.error('Gagal memperbarui status user');
      }
    }
  };

  const updateKYCStatus = async (userId: string, kycStatus: string) => {
    try {
      // Optimistic update
      const oldUsers = [...users];
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, kycStatus: kycStatus as 'pending' | 'approved' | 'rejected' | 'not_submitted' } : user
        )
      );
      
      const response = await apiPut(`/admin/users/${userId}/kyc-status`, { kycStatus });

      if (response.ok) {
        toast.success('Status KYC berhasil diperbarui');
        // Update stats optimistically
        setUserStats(prev => {
          const oldUser = oldUsers.find(u => u.id === userId);
          if (!oldUser) return prev;
          
          let newStats = { ...prev };
          // Decrease old KYC status count
          if (oldUser.kycStatus === 'approved') newStats.kycApprovedUsers--;
          
          // Increase new KYC status count
          if (kycStatus === 'approved') newStats.kycApprovedUsers++;
          
          return newStats;
        });
      } else {
        // Revert optimistic update on error
        setUsers(oldUsers);
        toast.error('Gagal memperbarui status KYC');
      }
    } catch (error) {
      // Revert optimistic update on error
      setUsers(oldUsers);
      if (error instanceof TokenExpiredError) {
        handleApiError(error);
      } else {
        console.error('Error updating KYC status:', error);
        toast.error('Gagal memperbarui status KYC');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'not_submitted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  return (
    <div className="space-y-6">
      <TokenExpiredModal 
        isOpen={isTokenExpiredModalOpen}
        onClose={closeTokenExpiredModal}
        onLogin={redirectToLogin}
      />
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={exportUsers}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Tambah User
          </button>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.totalUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.activeUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Suspended</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.suspendedUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ArrowPathIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.pendingUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.verifiedUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <KeyIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">KYC Approved</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.kycApprovedUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filter & Search
          </h3>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MagnifyingGlassIcon className="h-4 w-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Email atau username..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
            >
              <option value="">Semua Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">KYC Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.kycStatus || ''}
              onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value || undefined, page: 1 })}
            >
              <option value="">Semua KYC</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="not_submitted">Not Submitted</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, limit: 20 })}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Verified
                </label>
                <select
                  value={filters.emailVerified === undefined ? '' : filters.emailVerified.toString()}
                  onChange={(e) => setFilters({ ...filters, emailVerified: e.target.value === '' ? undefined : e.target.value === 'true', page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Not Verified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  2FA Enabled
                </label>
                <select
                  value={filters.twoFactorEnabled === undefined ? '' : filters.twoFactorEnabled.toString()}
                  onChange={(e) => setFilters({ ...filters, twoFactorEnabled: e.target.value === '' ? undefined : e.target.value === 'true', page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Operations */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UsersIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.length} user(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="text-sm border border-blue-300 rounded px-3 py-1 bg-white"
              >
                <option value="">Select Action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="suspend">Suspend</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || actionLoading}
                className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Apply'}
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>
                    <div className="flex items-center">
                      User
                      {sortConfig.key === 'email' && (
                        <ChevronUpIcon className={`ml-1 h-4 w-4 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      {sortConfig.key === 'status' && (
                        <ChevronUpIcon className={`ml-1 h-4 w-4 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('kycStatus')}>
                    <div className="flex items-center">
                      KYC
                      {sortConfig.key === 'kycStatus' && (
                        <ChevronUpIcon className={`ml-1 h-4 w-4 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trading</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center">
                      Joined
                      {sortConfig.key === 'createdAt' && (
                        <ChevronUpIcon className={`ml-1 h-4 w-4 ${sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users && Array.isArray(users) ? users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          user.status === 'active' ? 'bg-green-400' :
                          user.status === 'suspended' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`}></div>
                        {user.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.emailVerified ? '✓ Email' : '✗ Email'} | {user.twoFactorEnabled ? '✓ 2FA' : '✗ 2FA'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKYCStatusColor(user.kycStatus)}`}>
                        {user.kycStatus === 'approved' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                        {user.kycStatus === 'pending' && <ClockIcon className="w-3 h-3 mr-1" />}
                        {user.kycStatus === 'rejected' && <XCircleIcon className="w-3 h-3 mr-1" />}
                        {user.kycStatus ? user.kycStatus.replace('_', ' ') : 'Not Available'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{user.totalTrades} trades</div>
                      <div className="text-xs text-gray-500">{formatCurrency(user.totalVolume)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowEditModal(true); }}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Edit User"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => resetPassword(user.id)}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                          title="Reset Password"
                        >
                          <KeyIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete User"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Tidak ada users tersedia
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                disabled={filters.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                disabled={filters.page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(filters.page - 1) * filters.limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(filters.page * filters.limit, totalUsers)}</span> of{' '}
                  <span className="font-medium">{totalUsers}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setFilters({ ...filters, page })}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          filters.page === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                    disabled={filters.page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60000] flex items-center justify-center p-4" style={{left: '290px'}}>
          <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Details</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.country || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.role || 'user'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">KYC Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKYCStatusColor(selectedUser.kycStatus)}`}>
                    {selectedUser.kycStatus}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Trades</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.totalTrades}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Volume</label>
                  <p className="mt-1 text-sm text-gray-900">${selectedUser.totalVolume?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Login Attempts</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.loginAttempts || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Joined Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60000] flex items-center justify-center p-4" style={{left: '290px'}}>
          <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.username}
                    onChange={(e) => setCreateFormData({...createFormData, username: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.firstName}
                    onChange={(e) => setCreateFormData({...createFormData, firstName: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={createFormData.lastName}
                    onChange={(e) => setCreateFormData({...createFormData, lastName: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={createFormData.phoneNumber}
                    onChange={(e) => setCreateFormData({...createFormData, phoneNumber: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <input
                    type="text"
                    value={createFormData.country}
                    onChange={(e) => setCreateFormData({...createFormData, country: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select 
                    value={createFormData.role}
                    onChange={(e) => setCreateFormData({...createFormData, role: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select 
                    value={createFormData.status}
                    onChange={(e) => setCreateFormData({...createFormData, status: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password *</label>
                <input
                  type="password"
                  required
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({
                      email: '',
                      username: '',
                      firstName: '',
                      lastName: '',
                      phoneNumber: '',
                      country: '',
                      role: 'user',
                      status: 'active',
                      password: ''
                    });
                  }}
                  disabled={formLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60000] flex items-center justify-center p-4" style={{left: '290px'}}>
          <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditFormData({
                    email: '',
                    username: '',
                    firstName: '',
                    lastName: '',
                    phoneNumber: '',
                    country: '',
                    role: 'user',
                    status: 'active',
                    kycStatus: 'pending',
                    kycLevel: 0
                  });
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editFormData.phoneNumber}
                    onChange={(e) => setEditFormData({...editFormData, phoneNumber: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={editFormData.country}
                    onChange={(e) => setEditFormData({...editFormData, country: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select 
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="user">User</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select 
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KYC Status</label>
                  <select 
                    value={editFormData.kycStatus}
                    onChange={(e) => setEditFormData({...editFormData, kycStatus: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KYC Level</label>
                  <select 
                    value={editFormData.kycLevel || 0}
                    onChange={(e) => setEditFormData({...editFormData, kycLevel: parseInt(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={0}>Level 0 - Pending/Rejected</option>
                    <option value={1}>Level 1 - Basic Verification</option>
                    <option value={2}>Level 2 - Intermediate Verification</option>
                    <option value={3}>Level 3 - Advanced Verification</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditFormData({
                      email: '',
                      username: '',
                      firstName: '',
                      lastName: '',
                      phoneNumber: '',
                      country: '',
                      role: 'user',
                      status: 'active',
                      kycStatus: 'pending',
                      kycLevel: 0
                    });
                    setSelectedUser(null);
                  }}
                  disabled={formLoading}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {formLoading && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {formLoading ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}