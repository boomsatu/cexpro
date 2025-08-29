'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  RefreshCw
} from 'lucide-react';

interface TradingMetrics {
  totalVolume24h: number;
  totalTrades24h: number;
  activeUsers24h: number;
  averageTradeSize: number;
  topTradingPair: string;
  volumeChange24h: number;
  tradesChange24h: number;
  usersChange24h: number;
}

interface VolumeData {
  timestamp: string;
  volume: number;
  trades: number;
  price: number;
}

interface TradingPairAnalytics {
  symbol: string;
  volume24h: number;
  trades24h: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  marketShare: number;
  avgTradeSize: number;
  uniqueTraders: number;
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers24h: number;
  verifiedUsers: number;
  kycPendingUsers: number;
  topTraders: {
    userId: string;
    username: string;
    volume24h: number;
    trades24h: number;
    pnl24h: number;
  }[];
  userDistribution: {
    region: string;
    count: number;
    percentage: number;
  }[];
}

interface RevenueAnalytics {
  totalRevenue24h: number;
  tradingFees24h: number;
  withdrawalFees24h: number;
  revenueChange24h: number;
  revenueByPair: {
    symbol: string;
    revenue: number;
    percentage: number;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
    growth: number;
  }[];
}

interface PerformanceMetrics {
  systemUptime: number;
  avgResponseTime: number;
  orderExecutionTime: number;
  apiCallsPerSecond: number;
  errorRate: number;
  peakConcurrentUsers: number;
}

const AdvancedAnalytics: React.FC = () => {
  const [tradingMetrics, setTradingMetrics] = useState<TradingMetrics>({
    totalVolume24h: 0,
    totalTrades24h: 0,
    activeUsers24h: 0,
    averageTradeSize: 0,
    topTradingPair: '',
    volumeChange24h: 0,
    tradesChange24h: 0,
    usersChange24h: 0
  });
  const [, setVolumeData] = useState<VolumeData[]>([]);
  const [tradingPairs, setTradingPairs] = useState<TradingPairAnalytics[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics>({
    totalUsers: 0,
    activeUsers: 0,
    newUsers24h: 0,
    verifiedUsers: 0,
    kycPendingUsers: 0,
    topTraders: [],
    userDistribution: []
  });
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics>({
    totalRevenue24h: 0,
    tradingFees24h: 0,
    withdrawalFees24h: 0,
    revenueChange24h: 0,
    revenueByPair: [],
    monthlyRevenue: []
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    systemUptime: 0,
    avgResponseTime: 0,
    orderExecutionTime: 0,
    apiCallsPerSecond: 0,
    errorRate: 0,
    peakConcurrentUsers: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API calls
      // Fetch trading metrics from backend API
      // const tradingMetricsResponse = await fetch('/api/admin/analytics/trading-metrics');
      // const tradingMetricsData = await tradingMetricsResponse.json();
      
      // Placeholder empty data - replace with actual API data
      const mockTradingMetrics: TradingMetrics = {
        totalVolume24h: 0,
        totalTrades24h: 0,
        activeUsers24h: 0,
        averageTradeSize: 0,
        topTradingPair: 'N/A',
        volumeChange24h: 0,
        tradesChange24h: 0,
        usersChange24h: 0
      };

      const mockVolumeData: VolumeData[] = [];
      const mockTradingPairs: TradingPairAnalytics[] = [];

      const mockUserAnalytics: UserAnalytics = {
        totalUsers: 0,
        activeUsers: 0,
        newUsers24h: 0,
        verifiedUsers: 0,
        kycPendingUsers: 0,
        topTraders: [],
        userDistribution: []
      };

      const mockRevenueAnalytics: RevenueAnalytics = {
        totalRevenue24h: 0,
        tradingFees24h: 0,
        withdrawalFees24h: 0,
        revenueChange24h: 0,
        revenueByPair: [],
        monthlyRevenue: []
      };

      const mockPerformanceMetrics: PerformanceMetrics = {
        systemUptime: 0,
        avgResponseTime: 0,
        orderExecutionTime: 0,
        apiCallsPerSecond: 0,
        errorRate: 0,
        peakConcurrentUsers: 0
      };

      setTradingMetrics(mockTradingMetrics);
      setVolumeData(mockVolumeData);
      setTradingPairs(mockTradingPairs);
      setUserAnalytics(mockUserAnalytics);
      setRevenueAnalytics(mockRevenueAnalytics);
      setPerformanceMetrics(mockPerformanceMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <ArrowUpRight className="w-4 h-4 text-green-500" />
    ) : (
      <ArrowDownRight className="w-4 h-4 text-red-500" />
    );
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchAnalyticsData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(tradingMetrics.totalVolume24h)}</div>
                <p className="text-sm text-muted-foreground">24h Volume</p>
              </div>
              <div className="flex items-center space-x-1">
                {getChangeIcon(tradingMetrics.volumeChange24h)}
                <span className={`text-sm font-medium ${getChangeColor(tradingMetrics.volumeChange24h)}`}>
                  {formatPercentage(tradingMetrics.volumeChange24h)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(tradingMetrics.totalTrades24h)}</div>
                <p className="text-sm text-muted-foreground">24h Trades</p>
              </div>
              <div className="flex items-center space-x-1">
                {getChangeIcon(tradingMetrics.tradesChange24h)}
                <span className={`text-sm font-medium ${getChangeColor(tradingMetrics.tradesChange24h)}`}>
                  {formatPercentage(tradingMetrics.tradesChange24h)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(tradingMetrics.activeUsers24h)}</div>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <div className="flex items-center space-x-1">
                {getChangeIcon(tradingMetrics.usersChange24h)}
                <span className={`text-sm font-medium ${getChangeColor(tradingMetrics.usersChange24h)}`}>
                  {formatPercentage(tradingMetrics.usersChange24h)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(revenueAnalytics.totalRevenue24h)}</div>
                <p className="text-sm text-muted-foreground">24h Revenue</p>
              </div>
              <div className="flex items-center space-x-1">
                {getChangeIcon(revenueAnalytics.revenueChange24h)}
                <span className={`text-sm font-medium ${getChangeColor(revenueAnalytics.revenueChange24h)}`}>
                  {formatPercentage(revenueAnalytics.revenueChange24h)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Volume Trend (24h)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-muted-foreground">Volume Chart Placeholder</p>
                        <p className="text-xs text-muted-foreground">Real-time volume data visualization</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Market Share Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                      <div className="text-center">
                        <PieChart className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-muted-foreground">Market Share Chart</p>
                        <p className="text-xs text-muted-foreground">Trading pair distribution</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Trading Pair</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{tradingMetrics.topTradingPair}</div>
                      <p className="text-sm text-muted-foreground">Most active pair</p>
                      <div className="mt-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {tradingPairs[0]?.marketShare.toFixed(1)}% market share
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Average Trade Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(tradingMetrics.averageTradeSize)}</div>
                      <p className="text-sm text-muted-foreground">Per transaction</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{performanceMetrics.systemUptime}%</div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <div className="mt-2">
                        <Badge className="bg-green-100 text-green-800">
                          {performanceMetrics.avgResponseTime}ms avg response
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trading" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trading Pair</TableHead>
                      <TableHead>24h Volume</TableHead>
                      <TableHead>24h Trades</TableHead>
                      <TableHead>Price Change</TableHead>
                      <TableHead>Market Share</TableHead>
                      <TableHead>Avg Trade Size</TableHead>
                      <TableHead>Unique Traders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradingPairs.map((pair) => (
                      <TableRow key={pair.symbol}>
                        <TableCell>
                          <div className="font-medium">{pair.symbol}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(pair.volume24h)}</TableCell>
                        <TableCell>{formatNumber(pair.trades24h)}</TableCell>
                        <TableCell>
                          <div className={`flex items-center space-x-1 ${getChangeColor(pair.priceChange24h)}`}>
                            {getChangeIcon(pair.priceChange24h)}
                            <span>{formatPercentage(pair.priceChange24h)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${pair.marketShare}%` }}
                              />
                            </div>
                            <span className="text-sm">{pair.marketShare.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(pair.avgTradeSize)}</TableCell>
                        <TableCell>{formatNumber(pair.uniqueTraders)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">User Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Users</span>
                      <span className="font-medium">{formatNumber(userAnalytics.totalUsers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Users (24h)</span>
                      <span className="font-medium">{formatNumber(userAnalytics.activeUsers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Users (24h)</span>
                      <span className="font-medium text-green-600">+{formatNumber(userAnalytics.newUsers24h)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verified Users</span>
                      <span className="font-medium">{formatNumber(userAnalytics.verifiedUsers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>KYC Pending</span>
                      <span className="font-medium text-orange-600">{formatNumber(userAnalytics.kycPendingUsers)}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Geographic Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {userAnalytics.userDistribution.map((region) => (
                      <div key={region.region} className="flex items-center justify-between">
                        <span className="text-sm">{region.region}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${region.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12">{region.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Traders (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trader</TableHead>
                          <TableHead>24h Volume</TableHead>
                          <TableHead>24h Trades</TableHead>
                          <TableHead>24h P&L</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userAnalytics.topTraders.map((trader, index) => (
                          <TableRow key={trader.userId}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Badge variant="solid" color="primary">#{index + 1}</Badge>
                                <span className="font-medium">{trader.username}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(trader.volume24h)}</TableCell>
                            <TableCell>{formatNumber(trader.trades24h)}</TableCell>
                            <TableCell>
                              <span className={trader.pnl24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(trader.pnl24h)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="revenue" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue Breakdown (24h)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Trading Fees</span>
                      <span className="font-medium">{formatCurrency(revenueAnalytics.tradingFees24h)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Withdrawal Fees</span>
                      <span className="font-medium">{formatCurrency(revenueAnalytics.withdrawalFees24h)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total Revenue</span>
                      <span className="font-bold">{formatCurrency(revenueAnalytics.totalRevenue24h)}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue by Trading Pair</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {revenueAnalytics.revenueByPair.map((pair) => (
                      <div key={pair.symbol} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{pair.symbol}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{formatCurrency(pair.revenue)}</span>
                          <Badge variant="light" color="success">{pair.percentage}%</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-muted-foreground">Revenue Trend Chart</p>
                      <p className="text-xs text-muted-foreground">Monthly revenue growth visualization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Uptime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{performanceMetrics.systemUptime}%</div>
                      <p className="text-sm text-muted-foreground">Last 30 days</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{performanceMetrics.avgResponseTime}ms</div>
                      <p className="text-sm text-muted-foreground">Average API response</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Execution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{performanceMetrics.orderExecutionTime}ms</div>
                      <p className="text-sm text-muted-foreground">Average execution time</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">API Load</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{formatNumber(performanceMetrics.apiCallsPerSecond)}</div>
                      <p className="text-sm text-muted-foreground">Calls per second</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Error Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{performanceMetrics.errorRate}%</div>
                      <p className="text-sm text-muted-foreground">System error rate</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Peak Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{formatNumber(performanceMetrics.peakConcurrentUsers)}</div>
                      <p className="text-sm text-muted-foreground">Concurrent users (24h peak)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAnalytics;