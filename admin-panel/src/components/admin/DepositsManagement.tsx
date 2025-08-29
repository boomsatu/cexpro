"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPut } from '@/utils/api';
import { useTokenHandler } from '@/hooks/useTokenHandler';
import { TokenExpiredModal } from '@/components/common/TokenExpiredModal';

interface Deposit {
  id: number;
  user_id: number;
  username: string;
  email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  transaction_hash?: string;
  created_at: string;
  updated_at: string;
}

const DepositsManagement: React.FC = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  const { isTokenExpiredModalOpen, handleApiError, closeTokenExpiredModal, redirectToLogin } = useTokenHandler();

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/admin/deposits?page=${currentPage}&status=${filter === 'all' ? '' : filter}`);
      
      if (response.ok) {
        const data = await response.json();
        setDeposits(data.data.deposits || []);
        setTotalPages(data.data.totalPages || 1);
      } else {
        throw new Error('Failed to fetch deposits');
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal memuat data deposit');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, handleApiError]);

  const handleStatusUpdate = async (depositId: number, newStatus: 'approved' | 'rejected') => {
    try {
      setProcessingId(depositId);
      const response = await apiPut(`/admin/deposits/${depositId}/status`, {
        status: newStatus
      });
      
      if (response.ok) {
        toast.success(`Deposit berhasil ${newStatus === 'approved' ? 'disetujui' : 'ditolak'}`);
        fetchDeposits(); // Refresh data
      } else {
        throw new Error('Failed to update deposit status');
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal mengupdate status deposit');
      }
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [currentPage, filter, fetchDeposits]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
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
          Manajemen Deposit
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola deposit pengguna, setujui atau tolak deposit yang masuk
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'pending', label: 'Menunggu' },
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

      {/* Deposits Table */}
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
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data deposit
                  </td>
                </tr>
              ) : (
                deposits && Array.isArray(deposits) ? deposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {deposit.username}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {deposit.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(deposit.amount, deposit.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(deposit.status)}>
                        {deposit.status === 'pending' ? 'Menunggu' : 
                         deposit.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {deposit.transaction_hash ? 
                          `${deposit.transaction_hash.substring(0, 10)}...` : 
                          '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(deposit.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {deposit.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(deposit.id, 'approved')}
                            disabled={processingId === deposit.id}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            {processingId === deposit.id ? 'Processing...' : 'Setujui'}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(deposit.id, 'rejected')}
                            disabled={processingId === deposit.id}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            {processingId === deposit.id ? 'Processing...' : 'Tolak'}
                          </button>
                        </div>
                      )}
                      {deposit.status !== 'pending' && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada deposits tersedia
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

export default DepositsManagement;