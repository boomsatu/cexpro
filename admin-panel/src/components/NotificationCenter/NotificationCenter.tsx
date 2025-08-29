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
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellRing, 
  Search, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  Trash2, 
  MailOpen,
  Plus,
  Edit,
  Shield,
  TrendingUp,
  DollarSign,
  Database,
  Zap
} from 'lucide-react';

interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'security' | 'trading' | 'system' | 'finance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  isRead: boolean;
  userId?: string;
  username?: string;
  source: string;
  category: string;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, string | number | boolean>;
  expiresAt?: Date;
}

interface NotificationRule {
  ruleId: string;
  name: string;
  description: string;
  isActive: boolean;
  conditions: {
    eventType: string;
    threshold?: number;
    timeWindow?: number;
    filters?: Record<string, string | number | boolean>;
  };
  actions: {
    sendEmail: boolean;
    sendSMS: boolean;
    sendPush: boolean;
    playSound: boolean;
    showPopup: boolean;
  };
  recipients: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationTemplate {
  templateId: string;
  name: string;
  type: string;
  subject: string;
  emailTemplate: string;
  smsTemplate: string;
  pushTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
}

interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  todayCount: number;
  criticalCount: number;
  byType: {
    type: string;
    count: number;
  }[];
  byPriority: {
    priority: string;
    count: number;
  }[];
  deliveryStats: {
    email: { sent: number; delivered: number; failed: number };
    sms: { sent: number; delivered: number; failed: number };
    push: { sent: number; delivered: number; failed: number };
  };
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    totalNotifications: 0,
    unreadCount: 0,
    todayCount: 0,
    criticalCount: 0,
    byType: [],
    byPriority: [],
    deliveryStats: {
      email: { sent: 0, delivered: 0, failed: 0 },
      sms: { sent: 0, delivered: 0, failed: 0 },
      push: { sent: 0, delivered: 0, failed: 0 }
    }
  });
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState('notifications');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchNotificationData();
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchNotificationData();
      }
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchNotificationData = async () => {
    try {
      // Loading state removed
      
      // Mock data - replace with actual API calls
      const mockNotifications: Notification[] = [
        {
          notificationId: 'notif-001',
          title: 'Suspicious Trading Activity Detected',
          message: 'Multiple large trades detected from user ID: user-12345 within 5 minutes. Potential market manipulation.',
          type: 'security',
          priority: 'critical',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          isRead: false,
          userId: 'user-12345',
          username: 'trader@example.com',
          source: 'Trading Monitor',
          category: 'Security Alert',
          actionRequired: true,
          actionUrl: '/security/alerts/trading-001'
        },
        {
          notificationId: 'notif-002',
          title: 'System Performance Alert',
          message: 'Database response time exceeded 2 seconds. Current average: 3.2s',
          type: 'system',
          priority: 'high',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          isRead: false,
          source: 'System Monitor',
          category: 'Performance',
          actionRequired: true,
          actionUrl: '/system/monitoring'
        },
        {
          notificationId: 'notif-003',
          title: 'Large Withdrawal Request',
          message: 'Withdrawal request of 50 BTC submitted by verified user. Requires manual approval.',
          type: 'finance',
          priority: 'high',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          isRead: true,
          userId: 'user-67890',
          username: 'whale@example.com',
          source: 'Finance System',
          category: 'Withdrawal',
          actionRequired: true,
          actionUrl: '/finance/withdrawals/pending'
        },
        {
          notificationId: 'notif-004',
          title: 'KYC Document Submitted',
          message: 'New KYC documents submitted for review. User: john.doe@example.com',
          type: 'info',
          priority: 'medium',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          isRead: true,
          userId: 'user-11111',
          username: 'john.doe@example.com',
          source: 'KYC System',
          category: 'Compliance',
          actionRequired: true,
          actionUrl: '/compliance/kyc/pending'
        },
        {
          notificationId: 'notif-005',
          title: 'Trading Volume Milestone',
          message: 'Daily trading volume exceeded $10M. Current volume: $12.5M',
          type: 'success',
          priority: 'low',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          isRead: true,
          source: 'Trading Analytics',
          category: 'Milestone',
          actionRequired: false
        }
      ];

      const mockRules: NotificationRule[] = [
        {
          ruleId: 'rule-001',
          name: 'High Value Transaction Alert',
          description: 'Alert when single transaction exceeds $100,000',
          isActive: true,
          conditions: {
            eventType: 'transaction',
            threshold: 100000,
            timeWindow: 300
          },
          actions: {
            sendEmail: true,
            sendSMS: true,
            sendPush: true,
            playSound: true,
            showPopup: true
          },
          recipients: ['admin@cex.com', 'compliance@cex.com'],
          priority: 'critical',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          ruleId: 'rule-002',
          name: 'System Performance Degradation',
          description: 'Alert when system response time exceeds 2 seconds',
          isActive: true,
          conditions: {
            eventType: 'performance',
            threshold: 2000,
            timeWindow: 60
          },
          actions: {
            sendEmail: true,
            sendSMS: false,
            sendPush: true,
            playSound: true,
            showPopup: true
          },
          recipients: ['devops@cex.com', 'admin@cex.com'],
          priority: 'high',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          ruleId: 'rule-003',
          name: 'Failed Login Attempts',
          description: 'Alert when 5 or more failed login attempts from same IP',
          isActive: true,
          conditions: {
            eventType: 'security',
            threshold: 5,
            timeWindow: 300
          },
          actions: {
            sendEmail: true,
            sendSMS: true,
            sendPush: true,
            playSound: true,
            showPopup: true
          },
          recipients: ['security@cex.com', 'admin@cex.com'],
          priority: 'high',
          createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ];

      const mockTemplates: NotificationTemplate[] = [
        {
          templateId: 'template-001',
          name: 'Security Alert Template',
          type: 'security',
          subject: 'Security Alert: {{alertType}}',
          emailTemplate: 'A security alert has been triggered: {{message}}. Please review immediately.',
          smsTemplate: 'SECURITY ALERT: {{message}}',
          pushTemplate: '🔒 Security Alert: {{message}}',
          variables: ['alertType', 'message', 'timestamp', 'userId'],
          isActive: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          templateId: 'template-002',
          name: 'System Alert Template',
          type: 'system',
          subject: 'System Alert: {{alertType}}',
          emailTemplate: 'System alert: {{message}}. Current status: {{status}}',
          smsTemplate: 'SYSTEM: {{message}}',
          pushTemplate: '⚠️ System: {{message}}',
          variables: ['alertType', 'message', 'status', 'timestamp'],
          isActive: true,
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        }
      ];

      const mockStats: NotificationStats = {
        totalNotifications: 1247,
        unreadCount: 23,
        todayCount: 89,
        criticalCount: 5,
        byType: [
          { type: 'security', count: 45 },
          { type: 'system', count: 67 },
          { type: 'finance', count: 123 },
          { type: 'trading', count: 234 },
          { type: 'info', count: 345 }
        ],
        byPriority: [
          { priority: 'critical', count: 12 },
          { priority: 'high', count: 89 },
          { priority: 'medium', count: 234 },
          { priority: 'low', count: 456 }
        ],
        deliveryStats: {
          email: { sent: 1200, delivered: 1156, failed: 44 },
          sms: { sent: 567, delivered: 543, failed: 24 },
          push: { sent: 2345, delivered: 2298, failed: 47 }
        }
      };

      setNotifications(mockNotifications);
      setNotificationRules(mockRules);
      setNotificationTemplates(mockTemplates);
      setNotificationStats(mockStats);
    } catch (error) {
      console.error('Error fetching notification data:', error);
    } finally {
      // Loading state removed
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'system':
        return <Database className="w-4 h-4 text-blue-500" />;
      case 'finance':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'trading':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'security':
        return 'bg-red-100 text-red-800';
      case 'system':
        return 'bg-blue-100 text-blue-800';
      case 'finance':
        return 'bg-green-100 text-green-800';
      case 'trading':
        return 'bg-purple-100 text-purple-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.notificationId === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notif => notif.notificationId !== notificationId)
    );
  };

  const toggleRule = (ruleId: string) => {
    setNotificationRules(prev => 
      prev.map(rule => 
        rule.ruleId === ruleId 
          ? { ...rule, isActive: !rule.isActive }
          : rule
      )
    );
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = searchTerm === '' || 
      notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (notif.username && notif.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || notif.type === filterType;
    const matchesPriority = filterPriority === 'all' || notif.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'read' && notif.isRead) ||
      (filterStatus === 'unread' && !notif.isRead);
    
    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh" className="text-sm">Auto Refresh</label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={soundEnabled} 
              onCheckedChange={setSoundEnabled}
              id="sound-enabled"
            />
            <label htmlFor="sound-enabled" className="text-sm">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </label>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchNotificationData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <MailOpen className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{notificationStats.totalNotifications.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
              </div>
              <Bell className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{notificationStats.unreadCount}</div>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
              <BellRing className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{notificationStats.todayCount}</div>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{notificationStats.criticalCount}</div>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Notification Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Center</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="rules">Alert Rules</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Notifications List */}
              <div className="space-y-2">
                {paginatedNotifications.map((notification) => (
                  <Card key={notification.notificationId} className={`${!notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-1">
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </h4>
                              <Badge className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                              <Badge className={getTypeColor(notification.type)}>
                                {notification.type}
                              </Badge>
                              {!notification.isRead && (
                                <Badge variant="solid" color="success">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>{notification.timestamp.toLocaleString()}</span>
                              <span>Source: {notification.source}</span>
                              {notification.username && (
                                <span>User: {notification.username}</span>
                              )}
                              {notification.actionRequired && (
                                <Badge variant="solid" color="warning" className="text-xs">
                                  Action Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {notification.actionRequired && notification.actionUrl && (
                            <Button variant="outline" size="sm">
                              <Zap className="w-4 h-4 mr-1" />
                              Action
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedNotification(notification)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Notification Details</DialogTitle>
                              </DialogHeader>
                              {selectedNotification && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Title</label>
                                      <p className="text-sm text-muted-foreground">{selectedNotification.title}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Type</label>
                                      <p className="text-sm text-muted-foreground">{selectedNotification.type}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Priority</label>
                                      <p className="text-sm text-muted-foreground">{selectedNotification.priority}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Timestamp</label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedNotification.timestamp.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Source</label>
                                      <p className="text-sm text-muted-foreground">{selectedNotification.source}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Category</label>
                                      <p className="text-sm text-muted-foreground">{selectedNotification.category}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Message</label>
                                    <p className="text-sm text-muted-foreground mt-1">{selectedNotification.message}</p>
                                  </div>
                                  {selectedNotification.username && (
                                    <div>
                                      <label className="text-sm font-medium">Related User</label>
                                      <p className="text-sm text-muted-foreground">{selectedNotification.username}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {!notification.isRead && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => markAsRead(notification.notificationId)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteNotification(notification.notificationId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} of {filteredNotifications.length} notifications
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
            
            <TabsContent value="rules" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Notification Rules</h3>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationRules.map((rule) => (
                      <TableRow key={rule.ruleId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-muted-foreground">{rule.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="light" color="info">{rule.conditions.eventType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(rule.priority)}>
                            {rule.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {rule.recipients.length} recipient(s)
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={rule.isActive}
                            onCheckedChange={() => toggleRule(rule.ruleId)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Notification Templates</h3>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Template
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notificationTemplates.map((template) => (
                  <Card key={template.templateId}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge className={getTypeColor(template.type)}>
                          {template.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Subject</label>
                        <p className="text-sm text-muted-foreground">{template.subject}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email Template</label>
                        <p className="text-sm text-muted-foreground truncate">{template.emailTemplate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Variables</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="light" color="dark" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <Switch checked={template.isActive} />
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notifications by Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notificationStats.byType.map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(item.type)}
                          <span className="text-sm font-medium capitalize">{item.type}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notifications by Priority</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notificationStats.byPriority.map((item) => (
                      <div key={item.priority} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Mail className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <h4 className="font-medium">Email</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Sent: {notificationStats.deliveryStats.email.sent}</div>
                        <div>Delivered: {notificationStats.deliveryStats.email.delivered}</div>
                        <div>Failed: {notificationStats.deliveryStats.email.failed}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <h4 className="font-medium">SMS</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Sent: {notificationStats.deliveryStats.sms.sent}</div>
                        <div>Delivered: {notificationStats.deliveryStats.sms.delivered}</div>
                        <div>Failed: {notificationStats.deliveryStats.sms.failed}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <Smartphone className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <h4 className="font-medium">Push</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Sent: {notificationStats.deliveryStats.push.sent}</div>
                        <div>Delivered: {notificationStats.deliveryStats.push.delivered}</div>
                        <div>Failed: {notificationStats.deliveryStats.push.failed}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter;