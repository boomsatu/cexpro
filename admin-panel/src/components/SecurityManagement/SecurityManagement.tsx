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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { 
  Shield, 
  Key, 
  Smartphone, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 

  Globe,
  Wifi,
  Monitor
} from 'lucide-react';

interface User2FA {
  id: string;
  username: string;
  email: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'app' | 'sms' | 'email' | null;
  backupCodesGenerated: boolean;
  lastLogin: string;
  loginAttempts: number;
  accountLocked: boolean;
  securityScore: number;
  ipWhitelist: string[];
  deviceTrust: {
    deviceId: string;
    deviceName: string;
    trusted: boolean;
    lastUsed: string;
  }[];
}

interface SecurityEvent {
  id: string;
  userId: string;
  username: string;
  eventType: 'login_success' | 'login_failed' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'suspicious_activity' | 'account_locked' | 'device_added';
  description: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'resolved' | 'investigating' | 'blocked';
}

interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    passwordExpiry: number; // days
  };
  loginSecurity: {
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    sessionTimeout: number; // minutes
    requireTwoFactor: boolean;
    allowedCountries: string[];
  };
  deviceSecurity: {
    requireDeviceVerification: boolean;
    maxTrustedDevices: number;
    deviceSessionTimeout: number; // days
  };
  ipSecurity: {
    enableIpWhitelist: boolean;
    blockSuspiciousIps: boolean;
    maxIpsPerUser: number;
  };
}

interface SecurityMetrics {
  totalUsers: number;
  users2FAEnabled: number;
  suspiciousActivities: number;
  blockedAttempts: number;
  averageSecurityScore: number;
  activeThreats: number;
  securityIncidents: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

const SecurityManagement: React.FC = () => {
  const [users, setUsers] = useState<User2FA[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiry: 90
    },
    loginSecurity: {
      maxLoginAttempts: 5,
      lockoutDuration: 30,
      sessionTimeout: 60,
      requireTwoFactor: false,
      allowedCountries: ['US', 'CA', 'GB', 'DE', 'FR']
    },
    deviceSecurity: {
      requireDeviceVerification: true,
      maxTrustedDevices: 5,
      deviceSessionTimeout: 30
    },
    ipSecurity: {
      enableIpWhitelist: false,
      blockSuspiciousIps: true,
      maxIpsPerUser: 10
    }
  });
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalUsers: 0,
    users2FAEnabled: 0,
    suspiciousActivities: 0,
    blockedAttempts: 0,
    averageSecurityScore: 0,
    activeThreats: 0,
    securityIncidents: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    }
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState<User2FA | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    twoFactorStatus: 'all',
    securityScore: 'all',
    accountStatus: 'all'
  });


  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {

      
      // Mock data - replace with actual API calls
      const mockUsers: User2FA[] = [
        {
          id: 'user_001',
          username: 'john_doe',
          email: 'john@example.com',
          twoFactorEnabled: true,
          twoFactorMethod: 'app',
          backupCodesGenerated: true,
          lastLogin: '2024-01-15T14:30:00Z',
          loginAttempts: 0,
          accountLocked: false,
          securityScore: 85,
          ipWhitelist: ['192.168.1.100', '10.0.0.50'],
          deviceTrust: [
            {
              deviceId: 'device_001',
              deviceName: 'iPhone 15 Pro',
              trusted: true,
              lastUsed: '2024-01-15T14:30:00Z'
            },
            {
              deviceId: 'device_002',
              deviceName: 'MacBook Pro',
              trusted: true,
              lastUsed: '2024-01-14T09:15:00Z'
            }
          ]
        },
        {
          id: 'user_002',
          username: 'jane_smith',
          email: 'jane@example.com',
          twoFactorEnabled: false,
          twoFactorMethod: null,
          backupCodesGenerated: false,
          lastLogin: '2024-01-15T12:45:00Z',
          loginAttempts: 2,
          accountLocked: false,
          securityScore: 45,
          ipWhitelist: [],
          deviceTrust: [
            {
              deviceId: 'device_003',
              deviceName: 'Windows PC',
              trusted: false,
              lastUsed: '2024-01-15T12:45:00Z'
            }
          ]
        },
        {
          id: 'user_003',
          username: 'bob_wilson',
          email: 'bob@example.com',
          twoFactorEnabled: true,
          twoFactorMethod: 'sms',
          backupCodesGenerated: false,
          lastLogin: '2024-01-14T18:20:00Z',
          loginAttempts: 5,
          accountLocked: true,
          securityScore: 30,
          ipWhitelist: ['203.0.113.45'],
          deviceTrust: []
        }
      ];

      const mockSecurityEvents: SecurityEvent[] = [
        {
          id: 'event_001',
          userId: 'user_001',
          username: 'john_doe',
          eventType: 'login_success',
          description: 'Successful login from trusted device',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          location: 'New York, US',
          timestamp: '2024-01-15T14:30:00Z',
          riskLevel: 'low',
          status: 'resolved'
        },
        {
          id: 'event_002',
          userId: 'user_002',
          username: 'jane_smith',
          eventType: 'login_failed',
          description: 'Failed login attempt - incorrect password',
          ipAddress: '198.51.100.25',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          location: 'Unknown',
          timestamp: '2024-01-15T13:15:00Z',
          riskLevel: 'medium',
          status: 'investigating'
        },
        {
          id: 'event_003',
          userId: 'user_003',
          username: 'bob_wilson',
          eventType: 'account_locked',
          description: 'Account locked due to multiple failed login attempts',
          ipAddress: '203.0.113.45',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
          location: 'London, GB',
          timestamp: '2024-01-15T11:45:00Z',
          riskLevel: 'high',
          status: 'blocked'
        },
        {
          id: 'event_004',
          userId: 'user_001',
          username: 'john_doe',
          eventType: 'suspicious_activity',
          description: 'Login attempt from new location',
          ipAddress: '185.199.108.153',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          location: 'Berlin, DE',
          timestamp: '2024-01-15T08:20:00Z',
          riskLevel: 'critical',
          status: 'investigating'
        }
      ];

      const mockMetrics: SecurityMetrics = {
        totalUsers: mockUsers.length,
        users2FAEnabled: mockUsers.filter(u => u.twoFactorEnabled).length,
        suspiciousActivities: mockSecurityEvents.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical').length,
        blockedAttempts: mockSecurityEvents.filter(e => e.status === 'blocked').length,
        averageSecurityScore: Math.round(mockUsers.reduce((sum, u) => sum + u.securityScore, 0) / mockUsers.length),
        activeThreats: mockSecurityEvents.filter(e => e.status === 'investigating' && (e.riskLevel === 'high' || e.riskLevel === 'critical')).length,
        securityIncidents: {
          today: 5,
          thisWeek: 23,
          thisMonth: 87
        }
      };

      setUsers(mockUsers);
      setSecurityEvents(mockSecurityEvents);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      // Loading state removed
    }
  };

  const handleToggle2FA = async (userId: string, enabled: boolean) => {
    try {
      console.log('Toggling 2FA for user:', { userId, enabled });
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              twoFactorEnabled: enabled,
              twoFactorMethod: enabled ? 'app' : null,
              securityScore: enabled ? Math.min(user.securityScore + 20, 100) : Math.max(user.securityScore - 20, 0)
            }
          : user
      ));
    } catch (error) {
      console.error('Error toggling 2FA:', error);
    }
  };

  const handleUnlockAccount = async (userId: string) => {
    try {
      console.log('Unlocking account for user:', userId);
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, accountLocked: false, loginAttempts: 0 }
          : user
      ));
    } catch (error) {
      console.error('Error unlocking account:', error);
    }
  };

  const handleUpdateSecuritySettings = async (newSettings: SecuritySettings) => {
    try {
      console.log('Updating security settings:', newSettings);
      setSecuritySettings(newSettings);
    } catch (error) {
      console.error('Error updating security settings:', error);
    }
  };

  const getSecurityScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">EXCELLENT</Badge>;
    if (score >= 60) return <Badge className="bg-blue-100 text-blue-800">GOOD</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-100 text-yellow-800">FAIR</Badge>;
    return <Badge className="bg-red-100 text-red-800">POOR</Badge>;
  };

  const getRiskLevelBadge = (level: string) => {
    const config = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={config[level as keyof typeof config]}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      resolved: 'bg-green-100 text-green-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      blocked: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={config[status as keyof typeof config]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.users2FAEnabled}/{metrics.totalUsers}</div>
                <p className="text-sm text-muted-foreground">2FA Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{metrics.activeThreats}</div>
                <p className="text-sm text-muted-foreground">Active Threats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{metrics.blockedAttempts}</div>
                <p className="text-sm text-muted-foreground">Blocked Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.averageSecurityScore}%</div>
                <p className="text-sm text-muted-foreground">Avg Security Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Incidents Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Security Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.securityIncidents.today}</div>
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.securityIncidents.thisWeek}</div>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{metrics.securityIncidents.thisMonth}</div>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Security Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">User Security</TabsTrigger>
              <TabsTrigger value="events">Security Events</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">2FA Adoption Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold">
                          {Math.round((metrics.users2FAEnabled / metrics.totalUsers) * 100)}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {metrics.users2FAEnabled} of {metrics.totalUsers} users
                        </p>
                      </div>
                      <Smartphone className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Security Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Password Policy</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex justify-between">
                        <span>2FA Enforcement</span>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="flex justify-between">
                        <span>IP Restrictions</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex justify-between">
                        <span>Device Management</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <Input
                    placeholder="Search users..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-64"
                  />
                  <Select value={filters.twoFactorStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, twoFactorStatus: value }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="2FA Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="enabled">2FA Enabled</SelectItem>
                      <SelectItem value="disabled">2FA Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>2FA Status</TableHead>
                      <TableHead>Security Score</TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Trusted Devices</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {user.twoFactorEnabled ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Key className="w-3 h-3 mr-1" />
                                {user.twoFactorMethod?.toUpperCase()}
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                DISABLED
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{user.securityScore}%</span>
                            {getSecurityScoreBadge(user.securityScore)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.accountLocked ? (
                            <Badge className="bg-red-100 text-red-800">
                              <Lock className="w-3 h-3 mr-1" />
                              LOCKED
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              ACTIVE
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.lastLogin).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Monitor className="w-4 h-4" />
                            <span>{user.deviceTrust.length}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>User Security Details - {user.username}</DialogTitle>
                                </DialogHeader>
                                {selectedUser && (
                                  <UserSecurityDialog 
                                    user={selectedUser} 
                                    onToggle2FA={handleToggle2FA}
                                    onUnlockAccount={handleUnlockAccount}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                            {user.accountLocked && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUnlockAccount(user.id)}
                              >
                                Unlock
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="events" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.eventType.replace('_', ' ').toUpperCase()}</div>
                            <div className="text-sm text-muted-foreground">{event.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>{event.username}</TableCell>
                        <TableCell>{getRiskLevelBadge(event.riskLevel)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Globe className="w-4 h-4" />
                            <span className="font-mono text-sm">{event.ipAddress}</span>
                          </div>
                        </TableCell>
                        <TableCell>{event.location || 'Unknown'}</TableCell>
                        <TableCell>
                          {new Date(event.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(event.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <SecuritySettingsPanel 
                settings={securitySettings}
                onUpdate={handleUpdateSecuritySettings}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// User Security Dialog Component
interface UserSecurityDialogProps {
  user: User2FA;
  onToggle2FA: (userId: string, enabled: boolean) => void;
  onUnlockAccount: (userId: string) => void;
}

const UserSecurityDialog: React.FC<UserSecurityDialogProps> = ({ user, onToggle2FA, onUnlockAccount }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Username</Label>
          <p className="text-sm font-medium">{user.username}</p>
        </div>
        <div>
          <Label>Email</Label>
          <p className="text-sm font-medium">{user.email}</p>
        </div>
        <div>
          <Label>Security Score</Label>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{user.securityScore}%</span>
            {user.securityScore >= 80 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            )}
          </div>
        </div>
        <div>
          <Label>Account Status</Label>
          <p className={`text-sm font-medium ${
            user.accountLocked ? 'text-red-600' : 'text-green-600'
          }`}>
            {user.accountLocked ? 'LOCKED' : 'ACTIVE'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">
              {user.twoFactorEnabled ? `Enabled via ${user.twoFactorMethod}` : 'Disabled'}
            </p>
          </div>
          <Switch
            checked={user.twoFactorEnabled}
            onCheckedChange={(checked) => onToggle2FA(user.id, checked)}
          />
        </div>

        <div>
          <Label>Trusted Devices ({user.deviceTrust.length})</Label>
          <div className="mt-2 space-y-2">
            {user.deviceTrust.map((device) => (
              <div key={device.deviceId} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm font-medium">{device.deviceName}</span>
                  {device.trusted && (
                    <Badge className="bg-green-100 text-green-800">TRUSTED</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(device.lastUsed).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>IP Whitelist ({user.ipWhitelist.length})</Label>
          <div className="mt-2 space-y-1">
            {user.ipWhitelist.map((ip, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-mono">{ip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {user.accountLocked && (
        <div className="pt-4 border-t">
          <Button 
            onClick={() => onUnlockAccount(user.id)}
            className="w-full"
          >
            Unlock Account
          </Button>
        </div>
      )}
    </div>
  );
};

// Security Settings Panel Component
interface SecuritySettingsPanelProps {
  settings: SecuritySettings;
  onUpdate: (settings: SecuritySettings) => void;
}

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onUpdate(localSettings);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Length</Label>
              <Input
                type="number"
                value={localSettings.passwordPolicy.minLength}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  passwordPolicy: {
                    ...prev.passwordPolicy,
                    minLength: Number(e.target.value)
                  }
                }))}
              />
            </div>
            <div>
              <Label>Password Expiry (days)</Label>
              <Input
                type="number"
                value={localSettings.passwordPolicy.passwordExpiry}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  passwordPolicy: {
                    ...prev.passwordPolicy,
                    passwordExpiry: Number(e.target.value)
                  }
                }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={localSettings.passwordPolicy.requireUppercase}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  passwordPolicy: {
                    ...prev.passwordPolicy,
                    requireUppercase: checked
                  }
                }))}
              />
              <Label>Require Uppercase Letters</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={localSettings.passwordPolicy.requireNumbers}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  passwordPolicy: {
                    ...prev.passwordPolicy,
                    requireNumbers: checked
                  }
                }))}
              />
              <Label>Require Numbers</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={localSettings.passwordPolicy.requireSpecialChars}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  passwordPolicy: {
                    ...prev.passwordPolicy,
                    requireSpecialChars: checked
                  }
                }))}
              />
              <Label>Require Special Characters</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Max Login Attempts</Label>
              <Input
                type="number"
                value={localSettings.loginSecurity.maxLoginAttempts}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  loginSecurity: {
                    ...prev.loginSecurity,
                    maxLoginAttempts: Number(e.target.value)
                  }
                }))}
              />
            </div>
            <div>
              <Label>Lockout Duration (min)</Label>
              <Input
                type="number"
                value={localSettings.loginSecurity.lockoutDuration}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  loginSecurity: {
                    ...prev.loginSecurity,
                    lockoutDuration: Number(e.target.value)
                  }
                }))}
              />
            </div>
            <div>
              <Label>Session Timeout (min)</Label>
              <Input
                type="number"
                value={localSettings.loginSecurity.sessionTimeout}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  loginSecurity: {
                    ...prev.loginSecurity,
                    sessionTimeout: Number(e.target.value)
                  }
                }))}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={localSettings.loginSecurity.requireTwoFactor}
              onCheckedChange={(checked) => setLocalSettings(prev => ({
                ...prev,
                loginSecurity: {
                  ...prev.loginSecurity,
                  requireTwoFactor: checked
                }
              }))}
            />
            <Label>Require Two-Factor Authentication</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device & IP Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Trusted Devices</Label>
              <Input
                type="number"
                value={localSettings.deviceSecurity.maxTrustedDevices}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  deviceSecurity: {
                    ...prev.deviceSecurity,
                    maxTrustedDevices: Number(e.target.value)
                  }
                }))}
              />
            </div>
            <div>
              <Label>Max IPs per User</Label>
              <Input
                type="number"
                value={localSettings.ipSecurity.maxIpsPerUser}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  ipSecurity: {
                    ...prev.ipSecurity,
                    maxIpsPerUser: Number(e.target.value)
                  }
                }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={localSettings.deviceSecurity.requireDeviceVerification}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  deviceSecurity: {
                    ...prev.deviceSecurity,
                    requireDeviceVerification: checked
                  }
                }))}
              />
              <Label>Require Device Verification</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={localSettings.ipSecurity.enableIpWhitelist}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  ipSecurity: {
                    ...prev.ipSecurity,
                    enableIpWhitelist: checked
                  }
                }))}
              />
              <Label>Enable IP Whitelist</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={localSettings.ipSecurity.blockSuspiciousIps}
                onCheckedChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  ipSecurity: {
                    ...prev.ipSecurity,
                    blockSuspiciousIps: checked
                  }
                }))}
              />
              <Label>Block Suspicious IPs</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save Security Settings
      </Button>
    </div>
  );
};

export default SecurityManagement;