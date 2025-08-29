'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Eye, 
  Shield, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Activity,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';

interface AuditLog {
  logId: string;
  timestamp: Date;
  userId: string;
  username: string;
  userRole: string;
  action: string;
  actionType: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'security' | 'system';
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessionId: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

interface AuditSummary {
  totalLogs: number;
  todayLogs: number;
  successfulActions: number;
  failedActions: number;
  uniqueUsers: number;
  criticalActions: number;
  topActions: {
    action: string;
    count: number;
  }[];
  topUsers: {
    username: string;
    count: number;
  }[];
}

interface SecurityEvent {
  eventId: string;
  timestamp: Date;
  eventType: 'failed_login' | 'suspicious_activity' | 'privilege_escalation' | 'data_breach' | 'unauthorized_access';
  userId?: string;
  username?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  status: 'investigating' | 'resolved' | 'false_positive';
  investigatedBy?: string;
  resolvedAt?: Date;
}

const AuditTrail: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary>({
    totalLogs: 0,
    todayLogs: 0,
    successfulActions: 0,
    failedActions: 0,
    uniqueUsers: 0,
    criticalActions: 0,
    topActions: [],
    topUsers: []
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [activeTab, setActiveTab] = useState('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchAuditData();
    const interval = setInterval(fetchAuditData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [dateRange, filterAction, filterStatus, filterSeverity]);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockAuditLogs: AuditLog[] = [
        {
          logId: 'log-001',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          userId: 'admin-001',
          username: 'admin@cex.com',
          userRole: 'Super Admin',
          action: 'User Account Suspended',
          actionType: 'update',
          resource: 'User Management',
          resourceId: 'user-12345',
          details: 'Suspended user account due to suspicious trading activity',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          severity: 'high',
          sessionId: 'sess-abc123',
          location: 'New York, US'
        },
        {
          logId: 'log-002',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          userId: 'admin-002',
          username: 'compliance@cex.com',
          userRole: 'Compliance Officer',
          action: 'KYC Document Approved',
          actionType: 'update',
          resource: 'KYC Management',
          resourceId: 'kyc-67890',
          details: 'Approved KYC documents for user verification',
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'success',
          severity: 'medium',
          sessionId: 'sess-def456',
          location: 'London, UK'
        },
        {
          logId: 'log-003',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          userId: 'admin-003',
          username: 'security@cex.com',
          userRole: 'Security Admin',
          action: 'Failed Login Attempt',
          actionType: 'security',
          resource: 'Authentication',
          details: 'Multiple failed login attempts detected',
          ipAddress: '203.0.113.45',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          status: 'failed',
          severity: 'critical',
          sessionId: 'sess-ghi789',
          location: 'Unknown'
        },
        {
          logId: 'log-004',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          userId: 'admin-001',
          username: 'admin@cex.com',
          userRole: 'Super Admin',
          action: 'Trading Pair Configuration Updated',
          actionType: 'update',
          resource: 'Trading Management',
          resourceId: 'pair-btcusd',
          details: 'Updated trading fees for BTC/USD pair from 0.1% to 0.08%',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          severity: 'medium',
          sessionId: 'sess-abc123',
          location: 'New York, US'
        },
        {
          logId: 'log-005',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          userId: 'admin-004',
          username: 'finance@cex.com',
          userRole: 'Finance Manager',
          action: 'Withdrawal Request Processed',
          actionType: 'update',
          resource: 'Finance Management',
          resourceId: 'withdrawal-98765',
          details: 'Processed withdrawal request of 5.0 BTC for user ID: user-54321',
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          severity: 'high',
          sessionId: 'sess-jkl012',
          location: 'Singapore, SG'
        }
      ];

      const mockSecurityEvents: SecurityEvent[] = [
        {
          eventId: 'sec-001',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          eventType: 'failed_login',
          userId: 'admin-003',
          username: 'security@cex.com',
          description: '5 consecutive failed login attempts from suspicious IP',
          severity: 'high',
          ipAddress: '203.0.113.45',
          status: 'investigating'
        },
        {
          eventId: 'sec-002',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          eventType: 'suspicious_activity',
          userId: 'admin-005',
          username: 'trader@cex.com',
          description: 'Unusual access pattern detected - accessing multiple sensitive resources',
          severity: 'medium',
          ipAddress: '198.51.100.23',
          status: 'resolved',
          investigatedBy: 'security@cex.com',
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          eventId: 'sec-003',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          eventType: 'unauthorized_access',
          description: 'Attempt to access admin panel from blacklisted IP range',
          severity: 'critical',
          ipAddress: '192.0.2.100',
          status: 'resolved',
          investigatedBy: 'admin@cex.com',
          resolvedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
        }
      ];

      const mockAuditSummary: AuditSummary = {
        totalLogs: 1247,
        todayLogs: 89,
        successfulActions: 1198,
        failedActions: 49,
        uniqueUsers: 12,
        criticalActions: 8,
        topActions: [
          { action: 'User Login', count: 156 },
          { action: 'KYC Document Review', count: 89 },
          { action: 'Trading Configuration Update', count: 67 },
          { action: 'Withdrawal Processing', count: 45 },
          { action: 'Security Alert Review', count: 34 }
        ],
        topUsers: [
          { username: 'admin@cex.com', count: 234 },
          { username: 'compliance@cex.com', count: 189 },
          { username: 'security@cex.com', count: 156 },
          { username: 'finance@cex.com', count: 123 },
          { username: 'support@cex.com', count: 98 }
        ]
      };

      setAuditLogs(mockAuditLogs);
      setSecurityEvents(mockSecurityEvents);
      setAuditSummary(mockAuditSummary);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'read':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'update':
        return <Edit className="w-4 h-4 text-yellow-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'login':
        return <Unlock className="w-4 h-4 text-green-500" />;
      case 'logout':
        return <Lock className="w-4 h-4 text-gray-500" />;
      case 'security':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'system':
        return <Settings className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSecurityEventColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'false_positive':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.actionType === filterAction;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    
    return matchesSearch && matchesAction && matchesStatus && matchesSeverity;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const exportAuditLogs = () => {
    // Implementation for exporting audit logs
    console.log('Exporting audit logs...');
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchAuditData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAuditLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{auditSummary.totalLogs.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Logs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{auditSummary.todayLogs}</div>
              <p className="text-sm text-muted-foreground">Today&apos;s Logs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{auditSummary.successfulActions}</div>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{auditSummary.failedActions}</div>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{auditSummary.uniqueUsers}</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{auditSummary.criticalActions}</div>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Audit Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
              <TabsTrigger value="security">Security Events</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Audit Logs Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.logId}>
                        <TableCell>
                          <div className="text-sm">
                            {log.timestamp.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.username}</div>
                            <div className="text-sm text-muted-foreground">{log.userRole}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getActionIcon(log.actionType)}
                            <div>
                              <div className="font-medium">{log.action}</div>
                              <div className="text-sm text-muted-foreground">{log.actionType}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.resource}</div>
                            {log.resourceId && (
                              <div className="text-sm text-muted-foreground">{log.resourceId}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(log.status)}
                            <Badge className={getStatusColor(log.status)}>
                              {log.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{log.ipAddress}</div>
                          {log.location && (
                            <div className="text-xs text-muted-foreground">{log.location}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Audit Log Details</DialogTitle>
                              </DialogHeader>
                              {selectedLog && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Log ID</label>
                                      <p className="text-sm text-muted-foreground">{selectedLog.logId}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Timestamp</label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedLog.timestamp.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">User</label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedLog.username} ({selectedLog.userRole})
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Session ID</label>
                                      <p className="text-sm text-muted-foreground">{selectedLog.sessionId}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">IP Address</label>
                                      <p className="text-sm text-muted-foreground">{selectedLog.ipAddress}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Location</label>
                                      <p className="text-sm text-muted-foreground">{selectedLog.location || 'Unknown'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Action Details</label>
                                    <p className="text-sm text-muted-foreground mt-1">{selectedLog.details}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">User Agent</label>
                                    <p className="text-sm text-muted-foreground mt-1 break-all">{selectedLog.userAgent}</p>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Investigated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityEvents.map((event) => (
                      <TableRow key={event.eventId}>
                        <TableCell>
                          <div className="text-sm">
                            {event.timestamp.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {event.timestamp.toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="light" color="warning">
                            {event.eventType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.username ? (
                            <div className="font-medium">{event.username}</div>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{event.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.ipAddress}</TableCell>
                        <TableCell>
                          <Badge className={getSecurityEventColor(event.status)}>
                            {event.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.investigatedBy ? (
                            <div className="text-sm">{event.investigatedBy}</div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {auditSummary.topActions.map((action, index) => (
                      <div key={action.action} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="solid" color="primary">#{index + 1}</Badge>
                          <span className="text-sm font-medium">{action.action}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{action.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Most Active Users</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {auditSummary.topUsers.map((user, index) => (
                      <div key={user.username} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="solid" color="info">#{index + 1}</Badge>
                          <span className="text-sm font-medium">{user.username}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{user.count} actions</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                    <div className="text-center">
                      <Activity className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-muted-foreground">Activity Timeline Chart</p>
                      <p className="text-xs text-muted-foreground">Visual representation of audit activities over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reports" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate daily audit activity report
                    </p>
                    <Button className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Security Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate security events and incidents report
                    </p>
                    <Button className="w-full">
                      <Shield className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compliance Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate compliance and regulatory report
                    </p>
                    <Button className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
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

export default AuditTrail;