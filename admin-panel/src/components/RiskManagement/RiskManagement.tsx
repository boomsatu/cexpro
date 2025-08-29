'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingUp, TrendingDown, Shield, Eye, Edit, Plus } from 'lucide-react';

interface RiskLimit {
  id: string;
  type: 'position' | 'daily_loss' | 'exposure' | 'concentration' | 'leverage';
  name: string;
  description: string;
  currentValue: number;
  limitValue: number;
  warningThreshold: number;
  currency?: string;
  status: 'normal' | 'warning' | 'breach';
  lastUpdated: string;
  userId?: string;
  username?: string;
}

interface RiskAlert {
  id: string;
  type: 'limit_breach' | 'concentration_risk' | 'market_volatility' | 'liquidity_risk' | 'counterparty_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggeredAt: string;
  status: 'active' | 'acknowledged' | 'resolved';
  affectedUsers?: string[];
  recommendedActions?: string[];
  assignedTo?: string;
}

interface PositionRisk {
  id: string;
  userId: string;
  username: string;
  symbol: string;
  position: number;
  marketValue: number;
  unrealizedPnL: number;
  riskScore: number;
  var95: number; // Value at Risk 95%
  leverage: number;
  marginUsed: number;
  marginAvailable: number;
  lastUpdated: string;
}

interface RiskMetrics {
  totalExposure: number;
  totalVar: number;
  portfolioRisk: number;
  concentrationRisk: number;
  liquidityRisk: number;
  activeAlerts: number;
  limitBreaches: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

const RiskManagement: React.FC = () => {
  const [limits, setLimits] = useState<RiskLimit[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [positions, setPositions] = useState<PositionRisk[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics>({
    totalExposure: 0,
    totalVar: 0,
    portfolioRisk: 0,
    concentrationRisk: 0,
    liquidityRisk: 0,
    activeAlerts: 0,
    limitBreaches: 0,
    riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLimit, setSelectedLimit] = useState<RiskLimit | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });


  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    try {
      // Loading state removed
      
      // Mock data - replace with actual API calls
      const mockLimits: RiskLimit[] = [
        {
          id: 'limit_001',
          type: 'position',
          name: 'Maximum Position Size',
          description: 'Maximum allowed position size per user',
          currentValue: 85000,
          limitValue: 100000,
          warningThreshold: 80000,
          currency: 'USD',
          status: 'warning',
          lastUpdated: '2024-01-15T14:30:00Z',
          userId: 'user_001',
          username: 'john_doe'
        },
        {
          id: 'limit_002',
          type: 'daily_loss',
          name: 'Daily Loss Limit',
          description: 'Maximum daily loss allowed',
          currentValue: 15000,
          limitValue: 20000,
          warningThreshold: 16000,
          currency: 'USD',
          status: 'normal',
          lastUpdated: '2024-01-15T14:25:00Z'
        },
        {
          id: 'limit_003',
          type: 'leverage',
          name: 'Maximum Leverage',
          description: 'Maximum leverage ratio allowed',
          currentValue: 45,
          limitValue: 50,
          warningThreshold: 40,
          status: 'warning',
          lastUpdated: '2024-01-15T14:20:00Z',
          userId: 'user_002',
          username: 'jane_smith'
        }
      ];

      const mockAlerts: RiskAlert[] = [
        {
          id: 'alert_001',
          type: 'limit_breach',
          severity: 'high',
          title: 'Position Limit Warning',
          description: 'User john_doe approaching maximum position limit',
          triggeredAt: '2024-01-15T14:30:00Z',
          status: 'active',
          affectedUsers: ['john_doe'],
          recommendedActions: ['Reduce position size', 'Monitor closely']
        },
        {
          id: 'alert_002',
          type: 'concentration_risk',
          severity: 'medium',
          title: 'Concentration Risk Alert',
          description: 'High concentration in BTC positions detected',
          triggeredAt: '2024-01-15T13:45:00Z',
          status: 'acknowledged',
          recommendedActions: ['Diversify portfolio', 'Review exposure limits']
        },
        {
          id: 'alert_003',
          type: 'market_volatility',
          severity: 'critical',
          title: 'Market Volatility Spike',
          description: 'Unusual market volatility detected across multiple pairs',
          triggeredAt: '2024-01-15T12:15:00Z',
          status: 'active',
          recommendedActions: ['Increase margin requirements', 'Review stop-loss orders', 'Monitor positions closely']
        }
      ];

      const mockPositions: PositionRisk[] = [
        {
          id: 'pos_001',
          userId: 'user_001',
          username: 'john_doe',
          symbol: 'BTC/USD',
          position: 2.5,
          marketValue: 125000,
          unrealizedPnL: 5000,
          riskScore: 75,
          var95: 8500,
          leverage: 3.2,
          marginUsed: 39000,
          marginAvailable: 11000,
          lastUpdated: '2024-01-15T14:30:00Z'
        },
        {
          id: 'pos_002',
          userId: 'user_002',
          username: 'jane_smith',
          symbol: 'ETH/USD',
          position: 15.8,
          marketValue: 45000,
          unrealizedPnL: -2500,
          riskScore: 65,
          var95: 3200,
          leverage: 2.1,
          marginUsed: 21500,
          marginAvailable: 8500,
          lastUpdated: '2024-01-15T14:28:00Z'
        }
      ];

      const mockMetrics: RiskMetrics = {
        totalExposure: 2450000,
        totalVar: 125000,
        portfolioRisk: 68,
        concentrationRisk: 45,
        liquidityRisk: 32,
        activeAlerts: 8,
        limitBreaches: 3,
        riskDistribution: {
          low: 45,
          medium: 32,
          high: 18,
          critical: 5
        }
      };

      setLimits(mockLimits);
      setAlerts(mockAlerts);
      setPositions(mockPositions);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching risk data:', error);
    } finally {
      // Loading state removed
    }
  };

  const handleLimitUpdate = async (limitId: string, newLimitValue: number, newWarningThreshold: number) => {
    try {
      console.log('Updating limit:', { limitId, newLimitValue, newWarningThreshold });
      
      setLimits(prev => prev.map(limit => 
        limit.id === limitId 
          ? { 
              ...limit, 
              limitValue: newLimitValue,
              warningThreshold: newWarningThreshold,
              lastUpdated: new Date().toISOString()
            }
          : limit
      ));
    } catch (error) {
      console.error('Error updating limit:', error);
    }
  };

  const handleAlertStatusUpdate = async (alertId: string, newStatus: RiskAlert['status']) => {
    try {
      console.log('Updating alert status:', { alertId, newStatus });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: newStatus }
          : alert
      ));
    } catch (error) {
      console.error('Error updating alert status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      normal: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      breach: 'bg-red-100 text-red-800',
      active: 'bg-red-100 text-red-800',
      acknowledged: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={statusConfig[status as keyof typeof statusConfig]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={severityConfig[severity as keyof typeof severityConfig]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Risk Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">${metrics.totalExposure.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Total Exposure</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">${metrics.totalVar.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Value at Risk (95%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{metrics.activeAlerts}</div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.portfolioRisk}%</div>
                <p className="text-sm text-muted-foreground">Portfolio Risk Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.riskDistribution.low}</div>
              <p className="text-sm text-muted-foreground">Low Risk</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{metrics.riskDistribution.medium}</div>
              <p className="text-sm text-muted-foreground">Medium Risk</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.riskDistribution.high}</div>
              <p className="text-sm text-muted-foreground">High Risk</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.riskDistribution.critical}</div>
              <p className="text-sm text-muted-foreground">Critical Risk</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="limits">Risk Limits</TabsTrigger>
              <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
              <TabsTrigger value="positions">Position Risk</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Concentration Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{metrics.concentrationRisk}%</div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Portfolio concentration in top 3 assets
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Liquidity Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{metrics.liquidityRisk}%</div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Positions in low-liquidity markets
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Limit Breaches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">{metrics.limitBreaches}</div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Active limit breaches requiring attention
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="limits" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <Input
                    placeholder="Search limits..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-64"
                  />
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))} className="w-48">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="breach">Breach</SelectItem>
                  </Select>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Limit
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Limit Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Limit Value</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {limits.map((limit) => {
                      const utilization = (limit.currentValue / limit.limitValue) * 100;
                      return (
                        <TableRow key={limit.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{limit.name}</div>
                              <div className="text-sm text-muted-foreground">{limit.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="light" color="info">
                              {limit.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {limit.currency ? `$${limit.currentValue.toLocaleString()}` : limit.currentValue}
                          </TableCell>
                          <TableCell>
                            {limit.currency ? `$${limit.limitValue.toLocaleString()}` : limit.limitValue}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    utilization >= 100 ? 'bg-red-500' :
                                    utilization >= 80 ? 'bg-orange-500' :
                                    utilization >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{utilization.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(limit.status)}</TableCell>
                          <TableCell>{limit.username || 'Global'}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedLimit(limit)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Risk Limit - {limit.name}</DialogTitle>
                                </DialogHeader>
                                {selectedLimit && (
                                  <LimitEditDialog 
                                    limit={selectedLimit} 
                                    onUpdate={handleLimitUpdate}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="alerts" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Triggered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm text-muted-foreground">{alert.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="light" color="warning">
                            {alert.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                        <TableCell>
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(alert.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAlertStatusUpdate(alert.id, 'acknowledged')}
                              disabled={alert.status === 'acknowledged' || alert.status === 'resolved'}
                            >
                              Acknowledge
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAlertStatusUpdate(alert.id, 'resolved')}
                              disabled={alert.status === 'resolved'}
                            >
                              Resolve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="positions" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Market Value</TableHead>
                      <TableHead>Unrealized P&L</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>VaR 95%</TableHead>
                      <TableHead>Leverage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell>{position.username}</TableCell>
                        <TableCell>
                          <Badge variant="solid" color="primary">
                            {position.symbol}
                          </Badge>
                        </TableCell>
                        <TableCell>{position.position}</TableCell>
                        <TableCell>${position.marketValue.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${position.unrealizedPnL.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={getRiskScoreColor(position.riskScore)}>
                            {position.riskScore}
                          </span>
                        </TableCell>
                        <TableCell>${position.var95.toLocaleString()}</TableCell>
                        <TableCell>{position.leverage.toFixed(1)}x</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Limit Edit Dialog Component
interface LimitEditDialogProps {
  limit: RiskLimit;
  onUpdate: (limitId: string, newLimitValue: number, newWarningThreshold: number) => void;
}

const LimitEditDialog: React.FC<LimitEditDialogProps> = ({ limit, onUpdate }) => {
  const [limitValue, setLimitValue] = useState(limit.limitValue);
  const [warningThreshold, setWarningThreshold] = useState(limit.warningThreshold);

  const handleSubmit = () => {
    onUpdate(limit.id, limitValue, warningThreshold);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Limit Name</label>
        <p className="text-sm text-muted-foreground">{limit.name}</p>
      </div>
      
      <div>
        <label className="text-sm font-medium">Current Value</label>
        <p className="text-sm text-muted-foreground">
          {limit.currency ? `$${limit.currentValue.toLocaleString()}` : limit.currentValue}
        </p>
      </div>
      
      <div>
        <label className="text-sm font-medium">Limit Value</label>
        <Input
          type="number"
          value={limitValue}
          onChange={(e) => setLimitValue(Number(e.target.value))}
          className="mt-1"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Warning Threshold</label>
        <Input
          type="number"
          value={warningThreshold}
          onChange={(e) => setWarningThreshold(Number(e.target.value))}
          className="mt-1"
        />
      </div>
      
      <Button onClick={handleSubmit} className="w-full">
        Update Limit
      </Button>
    </div>
  );
};

export default RiskManagement;