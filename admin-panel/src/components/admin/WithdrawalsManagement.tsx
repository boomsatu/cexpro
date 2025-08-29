"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPut } from '@/utils/api';
import { useTokenHandler } from '@/hooks/useTokenHandler';
import { TokenExpiredModal } from '@/components/common/TokenExpiredModal';

interface Withdrawal {
  id: number;
  user_id: number;
  username: string;
  email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  wallet_address: string;
  transaction_hash?: string;
  created_at: string;
  updated_at: string;
}

const WithdrawalsManagement: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'processing'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  const { isTokenExpiredModalOpen, handleApiError, closeTokenExpiredModal, redirectToLogin } = useTokenHandler();

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/admin/withdrawals?page=${currentPage}&status=${filter === 'all' ? '' : filter}`);
      
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.data.withdrawals || []);
        setTotalPages(data.data.totalPages || 1);
      } else {
        throw new Error('Failed to fetch withdrawals');
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal memuat data withdrawal');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, handleApiError]);

  const handleStatusUpdate = async (withdrawalId: number, newStatus: 'approved' | 'rejected' | 'processing') => {
    try {
      setProcessingId(withdrawalId);
      const response = await apiPut(`/admin/withdrawals/${withdrawalId}/status`, {
        status: newStatus
      });
      
      if (response.ok) {
        const statusText = newStatus === 'approved' ? 'disetujui' : 
                          newStatus === 'rejected' ? 'ditolak' : 'diproses';
        toast.success(`Withdrawal berhasil ${statusText}`);
        fetchWithdrawals(); // Refresh data
      } else {
        throw new Error('Failed to update withdrawal status');
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal mengupdate status withdrawal');
      }
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [currentPage, filter, fetchWithdrawals]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency.toUpperCase()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const formatAddress = (address: string) => {
    if (!address) return '-';
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Manajemen Withdrawal
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola withdrawal pengguna, setujui atau tolak permintaan withdrawal
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'pending', label: 'Menunggu' },
              { key: 'processing', label: 'Diproses' },
              { key: 'approved', label: 'Disetujui' },
              { key: 'rejected', label: 'Ditolak' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key as 'all' | 'pending' | 'approved' | 'rejected');
                  setCurrentPage(1);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Alamat Wallet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hash Transaksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data withdrawal
                  </td>
                </tr>
              ) : (
                withdrawals && Array.isArray(withdrawals) ? withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {withdrawal.username}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {withdrawal.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(withdrawal.amount, withdrawal.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {formatAddress(withdrawal.wallet_address)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(withdrawal.status)}>
                        {withdrawal.status === 'pending' ? 'Menunggu' : 
                         withdrawal.status === 'processing' ? 'Diproses' :
                         withdrawal.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {withdrawal.transaction_hash ? 
                          `${withdrawal.transaction_hash.substring(0, 10)}...` : 
                          '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(withdrawal.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {withdrawal.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(withdrawal.id, 'processing')}
                            disabled={processingId === withdrawal.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            {processingId === withdrawal.id ? 'Processing...' : 'Proses'}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(withdrawal.id, 'rejected')}
                            disabled={processingId === withdrawal.id}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            {processingId === withdrawal.id ? 'Processing...' : 'Tolak'}
                          </button>
                        </div>
                      )}
                      {withdrawal.status === 'processing' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(withdrawal.id, 'approved')}
                            disabled={processingId === withdrawal.id}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            {processingId === withdrawal.id ? 'Processing...' : 'Selesai'}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(withdrawal.id, 'rejected')}
                            disabled={processingId === withdrawal.id}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            {processingId === withdrawal.id ? 'Processing...' : 'Tolak'}
                          </button>
                        </div>
                      )}
                      {(withdrawal.status === 'approved' || withdrawal.status === 'rejected') && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada withdrawals tersedia
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* Token Expired Modal */}
      <TokenExpiredModal
        isOpen={isTokenExpiredModalOpen}
        onClose={closeTokenExpiredModal}
        onLogin={redirectToLogin}
      />
    </div>
  );
};

export default WithdrawalsManagement;