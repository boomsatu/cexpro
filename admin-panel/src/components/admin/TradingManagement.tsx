'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

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
  tick_size: string;
  lot_size: string;
  min_notional: string;
  max_notional: string | null;
  status: string;
  trading_enabled: boolean;
  margin_trading_enabled: boolean;
  volume_24h: string;
  quote_volume_24h: string;
  high_24h: string | null;
  low_24h: string | null;
  last_price: string | null;
  price_change_24h: string;
  price_change_percent_24h: string;
  trades_count_24h: number;
  market_maker_program: boolean;
  liquidity_score: string;
  created_at: string;
  updated_at: string;
  stats?: {
    transactions_24h: number;
    volume_24h: number;
    avg_price_24h: number;
    latest_price: number;
    last_trade_at: string | null;
  };
}

interface Trade {
  id: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: string;
  price: string;
  executedQuantity: string;
  executedPrice: string;
  status: 'pending' | 'filled' | 'cancelled' | 'partially_filled';
  fee: string;
  createdAt: string;
  user: {
    email: string;
    username: string;
  };
}

interface TradingStats {
  totalTrades24h: number;
  totalVolume24h: string;
  totalFees24h: string;
  activeTradingPairs: number;
  topTradingPairs: Array<{
    symbol: string;
    volume: string;
    trades: number;
  }>;
}

export default function TradingManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pairs' | 'trades' | 'stats'>('pairs');
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'pairs') {
      fetchTradingPairs();
    } else if (activeTab === 'trades') {
      fetchRecentTrades();
    } else if (activeTab === 'stats') {
      fetchTradingStats();
    }
  }, [activeTab]);

  const fetchTradingPairs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Token tidak ditemukan');
        return;
      }

      const response = await fetch('http://localhost:3001/api/v1/admin/trading/pairs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTradingPairs(data.data.trading_pairs || []);
      } else {
        toast.error('Gagal memuat trading pairs');
      }
    } catch (error) {
      console.error('Error fetching trading pairs:', error);
      toast.error('Gagal memuat trading pairs');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTrades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Token tidak ditemukan');
        return;
      }

      const response = await fetch('http://localhost:3001/api/v1/admin/trading/trades?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrades(data.data.trades);
      } else {
        toast.error('Gagal memuat data trades');
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast.error('Gagal memuat data trades');
    } finally {
      setLoading(false);
    }
  };

  const fetchTradingStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Token tidak ditemukan');
        return;
      }

      const response = await fetch('http://localhost:3001/api/v1/admin/trading/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      } else {
        toast.error('Gagal memuat statistik trading');
      }
    } catch (error) {
      console.error('Error fetching trading stats:', error);
      toast.error('Gagal memuat statistik trading');
    } finally {
      setLoading(false);
    }
  };



  const togglePairStatus = async (pairId: string, status: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Token tidak ditemukan');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/v1/admin/trading/pairs/${pairId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success('Status trading pair berhasil diperbarui');
        fetchTradingPairs();
      } else {
        toast.error('Gagal memperbarui status trading pair');
      }
    } catch (error) {
      console.error('Error updating pair status:', error);
      toast.error('Gagal memperbarui status trading pair');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'filled': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'partially_filled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
      return '$0.00';
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Number(amount));
  };

  const formatPercentage = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '0.00%';
    }
    return `${Number(value).toFixed(2)}%`;
  };

  const formatFee = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '0.00%';
    }
    return `${(Number(value) * 100).toFixed(2)}%`;
  };

  const formatPrice = (price: string | number | null | undefined, decimals: number = 4) => {
    if (price === null || price === undefined || price === '' || isNaN(Number(price))) {
      return '$0.0000';
    }
    return `$${Number(price).toFixed(decimals)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Trading Management</h1>
        {activeTab === 'pairs' && (
          <button
            onClick={() => router.push('/trading/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Trading Pair
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'pairs', label: 'Trading Pairs' },
            { key: 'trades', label: 'Recent Trades' },
            { key: 'stats', label: 'Statistics' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'pairs' | 'orders' | 'history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {/* Trading Pairs Tab */}
          {activeTab === 'pairs' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">24h Volume</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">24h Change</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tradingPairs && Array.isArray(tradingPairs) ? tradingPairs.map((pair) => (
                      <tr key={pair.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{pair.symbol}</div>
                          <div className="text-xs text-gray-500">Trading Pair</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pair.status)}`}>
                            {pair.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(pair.last_price || pair.stats?.latest_price, pair.price_precision)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(pair.volume_24h || pair.stats?.volume_24h)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={Number(pair.price_change_percent_24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {Number(pair.price_change_percent_24h || 0) >= 0 ? '+' : ''}{formatPercentage(pair.price_change_percent_24h)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>Maker: {formatFee(pair.maker_fee)}</div>
                          <div>Taker: {formatFee(pair.taker_fee)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/trading/edit/${pair.id}`)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              Edit
                            </button>
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={pair.status}
                              onChange={(e) => togglePairStatus(pair.id, e.target.value)}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="maintenance">Maintenance</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          {loading ? 'Memuat trading pairs...' : 'Tidak ada trading pairs tersedia'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Trades Tab */}
          {activeTab === 'trades' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trades && Array.isArray(trades) ? trades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{trade.user.username}</div>
                          <div className="text-xs text-gray-500">{trade.user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.symbol}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            trade.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.type.toUpperCase()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {parseFloat(trade.executedQuantity) || parseFloat(trade.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${parseFloat(trade.executedPrice || trade.price).toFixed(8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status)}`}>
                            {trade.status ? trade.status.replace('_', ' ') : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(trade.createdAt)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          {loading ? 'Memuat trades...' : 'Tidak ada trades tersedia'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">24h Trades</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats?.totalTrades24h?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">24h Volume</p>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats?.totalVolume24h || '0')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">24h Fees</p>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats?.totalFees24h || '0')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Pairs</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats?.activeTradingPairs || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Trading Pairs */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Trading Pairs (24h)</h3>
                <div className="space-y-3">
                  {stats && stats.topTradingPairs && Array.isArray(stats.topTradingPairs) ? stats.topTradingPairs.map((pair, index) => (
                    <div key={pair.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{pair.symbol}</p>
                          <p className="text-sm text-gray-500">{pair.trades} trades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(pair.volume)}</p>
                        <p className="text-sm text-gray-500">Volume</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      Tidak ada data trading pairs tersedia
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}