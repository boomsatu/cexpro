'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { apiGet, TokenExpiredError, ApiError, handleApiError } from '../../utils/api';
import { useTokenHandler } from '../../hooks/useTokenHandler';
import TokenExpiredModal from '../common/TokenExpiredModal';
import { DashboardCardSkeleton, ActivityItemSkeleton } from '../common/LoadingSkeleton';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_today: number;
    new_this_month: number;
    growth_percentage: number;
  };
  transactions: {
    total: number;
    today: number;
    this_month: number;
    pending: number;
    growth_percentage: number;
  };
  volume: {
    today: number;
    this_month: number;
    total: number;
  };
  trading_pairs: {
    total: number;
    active: number;
  };
  system: {
    status: string;
    uptime: number;
    memory_usage: { used: number; total: number; percentage: number; };
    last_updated: string;
  };
  deposits?: {
    pending: number;
    completed_today: number;
    total_amount_today: number;
  };
  withdrawals?: {
    pending: number;
    completed_today: number;
    total_amount_today: number;
  };
  kyc?: {
    pending: number;
    verified_today: number;
    rejected_today: number;
  };
}

interface RecentActivity {
  id: string;
  admin_id: string;
  action: string;
  resource: string;
  details: Record<string, string | number | boolean>;
  created_at: string;
  admin: {
    name: string;
    email: string;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  status: string;
}

interface MarketData {
  symbol: string;
  price: string;
  change24h: string;
  volume24h: string;
  high24h: string;
  low24h: string;
}

interface RecentTransaction {
  id: string;
  type: string;
  user: string;
  amount: string;
  currency: string;
  status: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isTokenExpiredModalOpen, handleApiError, closeTokenExpiredModal, redirectToLogin } = useTokenHandler();

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await apiGet('/admin/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Fetch recent activities
      const activitiesResponse = await apiGet('/admin/dashboard/activities');
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.data.activities || []);
      }

      // Fetch market data
      const marketResponse = await apiGet('/admin/dashboard/market');
      if (marketResponse.ok) {
        const marketData = await marketResponse.json();
        setMarketData(marketData.data || []);
      }

      // Fetch recent transactions
      const transactionsResponse = await apiGet('/admin/dashboard/transactions');
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData.data || []);
      }

      setLoading(false);
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof ApiError) {
        handleApiError(error);
      } else {
        console.error('Error fetching dashboard data:', error);
        toast.error('Gagal memuat data dashboard');
      }
      setLoading(false);
    }
  }, [handleApiError]);

  // Separate loading state for initial load vs refresh
  const [initialLoading, setInitialLoading] = useState(true);
  
  useEffect(() => {
    if (!loading && initialLoading) {
      setInitialLoading(false);
    }
  }, [loading, initialLoading]);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 60 seconds to reduce server load
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
        
        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
            </div>
            {[...Array(5)].map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
            {[...Array(5)].map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TokenExpiredModal 
        isOpen={isTokenExpiredModalOpen}
        onClose={closeTokenExpiredModal}
        onLogin={redirectToLogin}
      />
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.users?.total?.toLocaleString() || '0'}</p>
              <p className="text-xs text-green-600">+{stats?.users?.active || '0'} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">24h Volume</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.volume?.today ? formatCurrency(stats.volume.today.toString()) : '$0'}</p>
              <p className="text-xs text-gray-500">{stats?.transactions?.today?.toLocaleString() || '0'} transactions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.volume?.total ? formatCurrency(stats.volume.total.toString()) : '$0'}</p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending KYC</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.kyc?.pending || '0'}</p>
              <p className="text-xs text-orange-600">Requires review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Deposits</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.deposits?.pending || '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.withdrawals?.pending || '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-lg">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Trading Pairs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.trading_pairs?.active || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Overview & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Market Overview</h3>
          <div className="space-y-3">
            {marketData.length > 0 ? (
              marketData.slice(0, 5).map((market) => (
                <div key={market.symbol} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{market.symbol}</p>
                    <p className="text-xs text-gray-500">Vol: {formatCurrency(market.volume24h)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(market.price)}</p>
                    <p className={`text-xs ${
                      parseFloat(market.change24h) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(market.change24h) >= 0 ? '+' : ''}{market.change24h}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No market data available</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.type} - {transaction.user}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {transaction.amount} {transaction.currency}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent transactions</p>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">System Status</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(stats?.system?.status || 'unknown')}`}>
              {stats?.system?.status || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Uptime</span>
            <span className="text-sm font-medium text-gray-900">
              {stats?.system?.uptime ? `${Math.floor(stats.system.uptime / 3600)}h ${Math.floor((stats.system.uptime % 3600) / 60)}m` : 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Last Updated</span>
            <span className="text-sm font-medium text-gray-900">
              {stats?.system?.last_updated ? formatDate(stats.system.last_updated) : 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Admin Activities</h3>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50">
                <div>
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">
                    {activity.admin.name} - {activity.resource}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Tidak ada aktivitas terbaru</p>
          )}
        </div>
      </div>
    </div>
  );
}