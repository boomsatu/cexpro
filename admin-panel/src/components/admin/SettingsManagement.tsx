"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPut, apiPost } from '@/utils/api';
import { useTokenHandler } from '@/hooks/useTokenHandler';
import { TokenExpiredModal } from '@/components/common/TokenExpiredModal';

interface SystemSettings {
  id: number;
  key: string;
  value: string;
  description: string;
  category: string;
  updated_at: string;
}

interface TradingPair {
  id: string;
  symbol: string;
  base_currency_id: string;
  quote_currency_id: string;
  is_active: boolean;
  price_precision: number;
  quantity_precision: number;
  min_order_size: string;
  max_order_size: string | null;
  maker_fee: string;
  taker_fee: string;
  min_notional: string;
  status: string;
  trading_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const SettingsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'trading' | 'fees'>('system');
  const [, setSettings] = useState<SystemSettings[]>([]);
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { isTokenExpiredModalOpen, handleApiError, closeTokenExpiredModal, redirectToLogin } = useTokenHandler();

  // Helper functions for safe formatting
  const formatFee = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '0.00%';
    }
    return `${(Number(value) * 100).toFixed(2)}%`;
  };

  const formatAmount = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '0.00';
    }
    return Number(value).toFixed(8);
  };

  // System Settings State
  const [systemConfig, setSystemConfig] = useState({
    maintenance_mode: 'false',
    registration_enabled: 'true',
    kyc_required: 'true',
    min_withdrawal_amount: '10',
    max_withdrawal_amount: '10000',
    withdrawal_fee_percentage: '0.5',
    deposit_confirmation_blocks: '6'
  });

  // New Trading Pair State
  const [newPair, setNewPair] = useState({
    base_currency: '',
    quote_currency: '',
    min_trade_amount: 0,
    max_trade_amount: 0,
    trading_fee: 0
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet('/admin/settings');
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data.settings || []);
        
        // Convert settings array to object for easier handling
        const configObj: Record<string, string> = {};
        data.data.settings?.forEach((setting: SystemSettings) => {
          configObj[setting.key] = setting.value;
        });
        setSystemConfig(prev => ({ ...prev, ...configObj }));
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal memuat pengaturan sistem');
      }
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  const fetchTradingPairs = useCallback(async () => {
    try {
      const response = await apiGet('/admin/trading-pairs');
      
      if (response.ok) {
        const data = await response.json();
        setTradingPairs(data.data.trading_pairs || []);
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal memuat trading pairs');
      }
    }
  }, [handleApiError]);

  const saveSystemSettings = async () => {
    try {
      setSaving(true);
      const response = await apiPut('/admin/settings', {
        settings: systemConfig
      });
      
      if (response.ok) {
        toast.success('Pengaturan sistem berhasil disimpan');
        fetchSettings();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal menyimpan pengaturan sistem');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleTradingPair = async (pairId: string, isActive: boolean) => {
    try {
      const response = await apiPut(`/admin/trading/pairs/${pairId}`, {
        is_active: !isActive
      });
      
      if (response.ok) {
        toast.success(`Trading pair berhasil ${!isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
        fetchTradingPairs();
      } else {
        throw new Error('Failed to toggle trading pair');
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal mengupdate trading pair');
      }
    }
  };

  const addTradingPair = async () => {
    try {
      if (!newPair.base_currency || !newPair.quote_currency) {
        toast.error('Base currency dan quote currency harus diisi');
        return;
      }

      const response = await apiPost('/admin/trading-pairs', newPair);
      
      if (response.ok) {
        toast.success('Trading pair berhasil ditambahkan');
        setNewPair({
          base_currency: '',
          quote_currency: '',
          min_trade_amount: 0,
          max_trade_amount: 0,
          trading_fee: 0
        });
        fetchTradingPairs();
      } else {
        throw new Error('Failed to add trading pair');
      }
    } catch (error: unknown) {
      handleApiError(error);
      if (!(error.name === 'TokenExpiredError')) {
        toast.error('Gagal menambahkan trading pair');
      }
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTradingPairs();
  }, [fetchSettings, fetchTradingPairs]);

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
          Pengaturan Sistem
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola konfigurasi sistem, trading pairs, dan pengaturan lainnya
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'system', label: 'Sistem' },
              { key: 'trading', label: 'Trading Pairs' },
              { key: 'fees', label: 'Fee & Limits' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'system' | 'trading' | 'fees')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
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

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Pengaturan Sistem
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mode Maintenance
              </label>
              <select
                value={systemConfig.maintenance_mode}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, maintenance_mode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="false">Nonaktif</option>
                <option value="true">Aktif</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Registrasi Diizinkan
              </label>
              <select
                value={systemConfig.registration_enabled}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, registration_enabled: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="true">Ya</option>
                <option value="false">Tidak</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                KYC Wajib
              </label>
              <select
                value={systemConfig.kyc_required}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, kyc_required: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="true">Ya</option>
                <option value="false">Tidak</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Konfirmasi Blok Deposit
              </label>
              <input
                type="number"
                value={systemConfig.deposit_confirmation_blocks}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, deposit_confirmation_blocks: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={saveSystemSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      )}

      {/* Trading Pairs Tab */}
      {activeTab === 'trading' && (
        <div className="space-y-6">
          {/* Add New Trading Pair */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Tambah Trading Pair Baru
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Currency
                </label>
                <input
                  type="text"
                  value={newPair.base_currency}
                  onChange={(e) => setNewPair(prev => ({ ...prev, base_currency: e.target.value.toUpperCase() }))}
                  placeholder="BTC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quote Currency
                </label>
                <input
                  type="text"
                  value={newPair.quote_currency}
                  onChange={(e) => setNewPair(prev => ({ ...prev, quote_currency: e.target.value.toUpperCase() }))}
                  placeholder="USDT"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Trade
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={newPair.min_trade_amount}
                  onChange={(e) => setNewPair(prev => ({ ...prev, min_trade_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Trading Fee (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPair.trading_fee}
                  onChange={(e) => setNewPair(prev => ({ ...prev, trading_fee: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={addTradingPair}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>

          {/* Trading Pairs List */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Trading Pairs
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pair
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Min Trade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trading Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {tradingPairs && Array.isArray(tradingPairs) ? tradingPairs.map((pair) => (
                    <tr key={pair.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {pair.symbol}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatAmount(pair.min_order_size || pair.min_notional)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        Maker: {formatFee(pair.maker_fee)}<br/>
                        Taker: {formatFee(pair.taker_fee)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (pair.is_active || pair.trading_enabled) 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {(pair.is_active || pair.trading_enabled) ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => toggleTradingPair(pair.id, pair.is_active || pair.trading_enabled)}
                          className={`px-3 py-1 rounded text-xs ${
                            (pair.is_active || pair.trading_enabled)
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {(pair.is_active || pair.trading_enabled) ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Tidak ada trading pairs tersedia
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fees & Limits Tab */}
      {activeTab === 'fees' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Fee & Limits
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Withdrawal Amount
              </label>
              <input
                type="number"
                value={systemConfig.min_withdrawal_amount}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, min_withdrawal_amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Withdrawal Amount
              </label>
              <input
                type="number"
                value={systemConfig.max_withdrawal_amount}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, max_withdrawal_amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Withdrawal Fee (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={systemConfig.withdrawal_fee_percentage}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, withdrawal_fee_percentage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={saveSystemSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
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

export default SettingsManagement;