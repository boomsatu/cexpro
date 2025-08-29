'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Eye, Flag, TrendingUp, Activity, CheckCircle } from 'lucide-react';

interface SuspiciousTransaction {
  id: string;
  userId: string;
  username: string;
  transactionType: 'deposit' | 'withdrawal' | 'trade';
  amount: number;
  currency: string;
  timestamp: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  status: 'pending' | 'investigating' | 'cleared' | 'flagged' | 'reported';
  investigatedBy?: string;
  investigatedAt?: string;
  notes?: string;
}

interface AMLAlert {
  id: string;
  type: 'velocity' | 'amount_threshold' | 'pattern_detection' | 'blacklist' | 'geographic' | 'behavioral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  username: string;
  description: string;
  triggeredAt: string;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
}

interface AMLStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  falsePositives: number;
  suspiciousTransactions: number;
  reportedCases: number;
  averageResolutionTime: number;
  riskScoreDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

const AMLMonitoring: React.FC = () => {
  const [transactions, setTransactions] = useState<SuspiciousTransaction[]>([]);
  const [alerts, setAlerts] = useState<AMLAlert[]>([]);
  const [stats, setStats] = useState<AMLStats>({
    totalAlerts: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
    falsePositives: 0,
    suspiciousTransactions: 0,
    reportedCases: 0,
    averageResolutionTime: 0,
    riskScoreDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
  });
  const [selectedTransaction, setSelectedTransaction] = useState<SuspiciousTransaction | null>(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [filters, setFilters] = useState({
    status: 'all',
    riskLevel: 'all',
    type: 'all',
    search: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAMLData();
  }, [filters]);

  const fetchAMLData = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API calls to fetch AML data
      // const response = await fetch('/api/aml/transactions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(filters)
      // });
      // const data = await response.json();
      
      // For now, initialize with empty arrays until API is implemented
      const transactions: SuspiciousTransaction[] = [];
      const alerts: AMLAlert[] = [];
      const stats: AMLStats = {
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        falsePositives: 0,
        suspiciousTransactions: 0,
        reportedCases: 0,
        averageResolutionTime: 0,
        riskScoreDistribution: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        }
      };

      setTransactions(transactions);
      setAlerts(alerts);
      setStats(stats);
    } catch (error) {
      console.error('Error fetching AML data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionStatusUpdate = async (transactionId: string, newStatus: SuspiciousTransaction['status'], notes?: string) => {
    try {
      console.log('Updating transaction status:', { transactionId, newStatus, notes });
      
      setTransactions(prev => prev.map(transaction => 
        transaction.id === transactionId 
          ? { 
              ...transaction, 
              status: newStatus,
              investigatedAt: new Date().toISOString(),
              investigatedBy: 'current_admin',
              notes: notes || transaction.notes
            }
          : transaction
      ));
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  };

  const handleAlertStatusUpdate = async (alertId: string, newStatus: AMLAlert['status']) => {
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

  const getRiskLevelBadge = (riskLevel: string) => {
    const riskConfig = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={riskConfig[riskLevel as keyof typeof riskConfig]}>
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-blue-100 text-blue-800',
      cleared: 'bg-green-100 text-green-800',
      flagged: 'bg-red-100 text-red-800',
      reported: 'bg-purple-100 text-purple-800',
      active: 'bg-red-100 text-red-800',
      resolved: 'bg-green-100 text-green-800',
      false_positive: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={statusConfig[status as keyof typeof statusConfig]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesStatus = filters.status === 'all' || transaction.status === filters.status;
    const matchesRiskLevel = filters.riskLevel === 'all' || transaction.riskLevel === filters.riskLevel;
    const matchesType = filters.type === 'all' || transaction.transactionType === filters.type;
    const matchesSearch = !filters.search || 
      transaction.username.toLowerCase().includes(filters.search.toLowerCase()) ||
      transaction.id.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesRiskLevel && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.activeAlerts}</div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flag className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.suspiciousTransactions}</div>
                <p className="text-sm text-muted-foreground">Suspicious Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.reportedCases}</div>
                <p className="text-sm text-muted-foreground">Reported Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.averageResolutionTime}h</div>
                <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.riskScoreDistribution.low}</div>
              <p className="text-sm text-muted-foreground">Low Risk</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.riskScoreDistribution.medium}</div>
              <p className="text-sm text-muted-foreground">Medium Risk</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.riskScoreDistribution.high}</div>
              <p className="text-sm text-muted-foreground">High Risk</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.riskScoreDistribution.critical}</div>
              <p className="text-sm text-muted-foreground">Critical Risk</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>AML Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Suspicious Transactions</TabsTrigger>
              <TabsTrigger value="alerts">AML Alerts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Search by username or transaction ID..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="md:w-1/3"
                />
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Filter by risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="critical">Critical Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transactions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          Loading suspicious transactions...
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No suspicious transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                          <TableCell>{transaction.username}</TableCell>
                          <TableCell>
                            <Badge variant="light" color="info">
                              {transaction.transactionType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.amount.toLocaleString()} {transaction.currency}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    transaction.riskScore >= 80 ? 'bg-red-500' :
                                    transaction.riskScore >= 60 ? 'bg-orange-500' :
                                    transaction.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${transaction.riskScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{transaction.riskScore}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getRiskLevelBadge(transaction.riskLevel)}</TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {transaction.flags.slice(0, 2).map((flag, index) => (
                                <Badge key={index} variant="light" color="warning" className="text-xs">
                                  {flag}
                                </Badge>
                              ))}
                              {transaction.flags.length > 2 && (
                                <Badge variant="light" color="warning" className="text-xs">
                                  +{transaction.flags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedTransaction(transaction)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Transaction Review - {transaction.id}</DialogTitle>
                                </DialogHeader>
                                {selectedTransaction && (
                                  <TransactionReviewDialog 
                                    transaction={selectedTransaction} 
                                    onStatusUpdate={handleTransactionStatusUpdate}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="alerts" className="space-y-4">
              {/* Alerts Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Triggered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-mono text-sm">{alert.id}</TableCell>
                        <TableCell>
                          <Badge variant="light" color="info">
                            {alert.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{getRiskLevelBadge(alert.severity)}</TableCell>
                        <TableCell>{alert.username}</TableCell>
                        <TableCell className="max-w-xs truncate">{alert.description}</TableCell>
                        <TableCell>
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(alert.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAlertStatusUpdate(alert.id, 'investigating')}
                              disabled={alert.status === 'investigating'}
                            >
                              Investigate
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAlertStatusUpdate(alert.id, 'resolved')}
                              disabled={alert.status === 'resolved'}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </div>
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

// Transaction Review Dialog Component
interface TransactionReviewDialogProps {
  transaction: SuspiciousTransaction;
  onStatusUpdate: (transactionId: string, newStatus: SuspiciousTransaction['status'], notes?: string) => void;
}

const TransactionReviewDialog: React.FC<TransactionReviewDialogProps> = ({ transaction, onStatusUpdate }) => {
  const [notes, setNotes] = useState(transaction.notes || '');
  const [selectedStatus, setSelectedStatus] = useState<SuspiciousTransaction['status']>(transaction.status);

  const handleSubmit = () => {
    onStatusUpdate(transaction.id, selectedStatus, notes);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Transaction ID</label>
          <p className="text-sm text-muted-foreground font-mono">{transaction.id}</p>
        </div>
        <div>
          <label className="text-sm font-medium">User</label>
          <p className="text-sm text-muted-foreground">{transaction.username}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Type</label>
          <p className="text-sm text-muted-foreground">{transaction.transactionType}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Amount</label>
          <p className="text-sm text-muted-foreground">
            {transaction.amount.toLocaleString()} {transaction.currency}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Risk Score</label>
          <p className="text-sm text-muted-foreground">{transaction.riskScore}/100</p>
        </div>
        <div>
          <label className="text-sm font-medium">Timestamp</label>
          <p className="text-sm text-muted-foreground">
            {new Date(transaction.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">Risk Flags</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {transaction.flags.map((flag, index) => (
            <Badge key={index} variant="light" color="warning" className="text-xs">
              {flag}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={selectedStatus} onValueChange={(value: string) => setSelectedStatus(value as SuspiciousTransaction['status'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium">Investigation Notes</label>
        <textarea
          className="w-full mt-1 p-2 border rounded-md"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add investigation notes..."
        />
      </div>
      
      <Button onClick={handleSubmit} className="w-full">
        Update Transaction Status
      </Button>
    </div>
  );
};

export default AMLMonitoring;