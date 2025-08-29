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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Shield, 
  Key, 
  Search, 

  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  UserPlus, 
  Settings, 
 
  CheckCircle, 
  XCircle, 
 
  User, 
  Crown, 
  Star, 

} from 'lucide-react';

interface Permission {
  permissionId: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  isSystemPermission: boolean;
  createdAt: Date;
}

interface Role {
  roleId: string;
  name: string;
  description: string;
  level: number;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: string[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface User {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  department?: string;
  position?: string;
  phone?: string;
  location?: string;
}



interface AccessLog {
  logId: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  permission: string;
  result: 'granted' | 'denied';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details?: string;
}

interface RBACStats {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  activeUsers: number;
  systemRoles: number;
  customRoles: number;
  recentAccessAttempts: number;
  deniedAccess: number;
  roleDistribution: {
    roleName: string;
    userCount: number;
  }[];
  permissionUsage: {
    permission: string;
    usageCount: number;
  }[];
}

const RoleBasedAccessControl: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [rbacStats, setRbacStats] = useState<RBACStats>({
    totalUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
    activeUsers: 0,
    systemRoles: 0,
    customRoles: 0,
    recentAccessAttempts: 0,
    deniedAccess: 0,
    roleDistribution: [],
    permissionUsage: []
  });
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');



  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    level: 1,
    permissions: [] as string[]
  });

  useEffect(() => {
    fetchRBACData();
  }, []);

  const fetchRBACData = async () => {
    try {

      
      // Mock data - replace with actual API calls
      const mockPermissions: Permission[] = [
        {
          permissionId: 'perm-001',
          name: 'user.read',
          description: 'View user information',
          category: 'User Management',
          resource: 'users',
          action: 'read',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-002',
          name: 'user.write',
          description: 'Create and update user information',
          category: 'User Management',
          resource: 'users',
          action: 'write',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-003',
          name: 'user.delete',
          description: 'Delete user accounts',
          category: 'User Management',
          resource: 'users',
          action: 'delete',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-004',
          name: 'trading.read',
          description: 'View trading data and orders',
          category: 'Trading',
          resource: 'trading',
          action: 'read',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-005',
          name: 'trading.manage',
          description: 'Manage trading operations and halt trading',
          category: 'Trading',
          resource: 'trading',
          action: 'manage',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-006',
          name: 'finance.read',
          description: 'View financial data and transactions',
          category: 'Finance',
          resource: 'finance',
          action: 'read',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-007',
          name: 'finance.approve',
          description: 'Approve withdrawals and deposits',
          category: 'Finance',
          resource: 'finance',
          action: 'approve',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-008',
          name: 'system.admin',
          description: 'Full system administration access',
          category: 'System',
          resource: 'system',
          action: 'admin',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-009',
          name: 'compliance.read',
          description: 'View compliance and KYC data',
          category: 'Compliance',
          resource: 'compliance',
          action: 'read',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          permissionId: 'perm-010',
          name: 'compliance.manage',
          description: 'Manage KYC approvals and compliance settings',
          category: 'Compliance',
          resource: 'compliance',
          action: 'manage',
          isSystemPermission: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      ];

      const mockRoles: Role[] = [
        {
          roleId: 'role-001',
          name: 'Super Admin',
          description: 'Full system access with all permissions',
          level: 10,
          isSystemRole: true,
          isActive: true,
          permissions: mockPermissions.map(p => p.permissionId),
          userCount: 2,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          createdBy: 'system'
        },
        {
          roleId: 'role-002',
          name: 'Admin',
          description: 'Administrative access with most permissions',
          level: 8,
          isSystemRole: true,
          isActive: true,
          permissions: ['perm-001', 'perm-002', 'perm-004', 'perm-006', 'perm-009'],
          userCount: 5,
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@cex.com'
        },
        {
          roleId: 'role-003',
          name: 'Trading Manager',
          description: 'Manage trading operations and view trading data',
          level: 6,
          isSystemRole: false,
          isActive: true,
          permissions: ['perm-001', 'perm-004', 'perm-005'],
          userCount: 8,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@cex.com'
        },
        {
          roleId: 'role-004',
          name: 'Finance Manager',
          description: 'Manage financial operations and approvals',
          level: 6,
          isSystemRole: false,
          isActive: true,
          permissions: ['perm-001', 'perm-006', 'perm-007'],
          userCount: 4,
          createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@cex.com'
        },
        {
          roleId: 'role-005',
          name: 'Compliance Officer',
          description: 'Manage compliance, KYC, and AML operations',
          level: 5,
          isSystemRole: false,
          isActive: true,
          permissions: ['perm-001', 'perm-009', 'perm-010'],
          userCount: 3,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@cex.com'
        },
        {
          roleId: 'role-006',
          name: 'Support Agent',
          description: 'Basic user support and read-only access',
          level: 2,
          isSystemRole: false,
          isActive: true,
          permissions: ['perm-001', 'perm-004', 'perm-006', 'perm-009'],
          userCount: 12,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          createdBy: 'admin@cex.com'
        }
      ];

      const mockUsers: User[] = [
        {
          userId: 'user-001',
          username: 'superadmin',
          email: 'superadmin@cex.com',
          firstName: 'Super',
          lastName: 'Admin',
          roles: ['role-001'],
          isActive: true,
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          department: 'IT',
          position: 'System Administrator',
          phone: '+1-555-0001',
          location: 'New York'
        },
        {
          userId: 'user-002',
          username: 'admin1',
          email: 'admin1@cex.com',
          firstName: 'John',
          lastName: 'Smith',
          roles: ['role-002'],
          isActive: true,
          lastLogin: new Date(Date.now() - 30 * 60 * 1000),
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          department: 'Operations',
          position: 'Operations Manager',
          phone: '+1-555-0002',
          location: 'London'
        },
        {
          userId: 'user-003',
          username: 'trading_mgr',
          email: 'trading@cex.com',
          firstName: 'Alice',
          lastName: 'Johnson',
          roles: ['role-003'],
          isActive: true,
          lastLogin: new Date(Date.now() - 45 * 60 * 1000),
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          department: 'Trading',
          position: 'Trading Manager',
          phone: '+1-555-0003',
          location: 'Singapore'
        },
        {
          userId: 'user-004',
          username: 'finance_mgr',
          email: 'finance@cex.com',
          firstName: 'Bob',
          lastName: 'Wilson',
          roles: ['role-004'],
          isActive: true,
          lastLogin: new Date(Date.now() - 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
          department: 'Finance',
          position: 'Finance Manager',
          phone: '+1-555-0004',
          location: 'Tokyo'
        },
        {
          userId: 'user-005',
          username: 'compliance1',
          email: 'compliance@cex.com',
          firstName: 'Carol',
          lastName: 'Davis',
          roles: ['role-005'],
          isActive: true,
          lastLogin: new Date(Date.now() - 90 * 60 * 1000),
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          department: 'Compliance',
          position: 'Compliance Officer',
          phone: '+1-555-0005',
          location: 'Frankfurt'
        }
      ];

      const mockAccessLogs: AccessLog[] = [
        {
          logId: 'log-001',
          userId: 'user-001',
          username: 'superadmin',
          action: 'read',
          resource: 'users',
          permission: 'user.read',
          result: 'granted',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          logId: 'log-002',
          userId: 'user-003',
          username: 'trading_mgr',
          action: 'manage',
          resource: 'trading',
          permission: 'trading.manage',
          result: 'granted',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          ipAddress: '192.168.1.103',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        {
          logId: 'log-003',
          userId: 'user-005',
          username: 'compliance1',
          action: 'delete',
          resource: 'users',
          permission: 'user.delete',
          result: 'denied',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          details: 'Insufficient permissions for user deletion'
        }
      ];

      const mockStats: RBACStats = {
        totalUsers: 34,
        totalRoles: 6,
        totalPermissions: 10,
        activeUsers: 32,
        systemRoles: 2,
        customRoles: 4,
        recentAccessAttempts: 1247,
        deniedAccess: 23,
        roleDistribution: [
          { roleName: 'Support Agent', userCount: 12 },
          { roleName: 'Trading Manager', userCount: 8 },
          { roleName: 'Admin', userCount: 5 },
          { roleName: 'Finance Manager', userCount: 4 },
          { roleName: 'Compliance Officer', userCount: 3 },
          { roleName: 'Super Admin', userCount: 2 }
        ],
        permissionUsage: [
          { permission: 'user.read', usageCount: 456 },
          { permission: 'trading.read', usageCount: 234 },
          { permission: 'finance.read', usageCount: 189 },
          { permission: 'compliance.read', usageCount: 123 },
          { permission: 'user.write', usageCount: 89 }
        ]
      };

      setPermissions(mockPermissions);
      setRoles(mockRoles);
      setUsers(mockUsers);
      setAccessLogs(mockAccessLogs);
      setRbacStats(mockStats);
    } catch (error) {
      console.error('Error fetching RBAC data:', error);
    } finally {
      // Loading state removed
    }
  };

  const getRoleIcon = (role: Role) => {
    if (role.level >= 9) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role.level >= 7) return <Star className="w-4 h-4 text-purple-500" />;
    if (role.level >= 5) return <Shield className="w-4 h-4 text-blue-500" />;
    return <User className="w-4 h-4 text-gray-500" />;
  };

  const getRoleLevelColor = (level: number) => {
    if (level >= 9) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (level >= 7) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (level >= 5) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPermissionCategoryColor = (category: string) => {
    switch (category) {
      case 'User Management':
        return 'bg-blue-100 text-blue-800';
      case 'Trading':
        return 'bg-green-100 text-green-800';
      case 'Finance':
        return 'bg-yellow-100 text-yellow-800';
      case 'Compliance':
        return 'bg-purple-100 text-purple-800';
      case 'System':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleRoleStatus = (roleId: string) => {
    setRoles(prev => 
      prev.map(role => 
        role.roleId === roleId 
          ? { ...role, isActive: !role.isActive }
          : role
      )
    );
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(prev => 
      prev.map(user => 
        user.userId === userId 
          ? { ...user, isActive: !user.isActive }
          : user
      )
    );
  };

  const createRole = () => {
    const role: Role = {
      roleId: `role-${Date.now()}`,
      name: newRole.name,
      description: newRole.description,
      level: newRole.level,
      isSystemRole: false,
      isActive: true,
      permissions: newRole.permissions,
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user@cex.com'
    };
    
    setRoles(prev => [...prev, role]);
    setNewRole({ name: '', description: '', level: 1, permissions: [] });
    setShowCreateRoleDialog(false);
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = searchTerm === '' || 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && role.isActive) ||
      (filterStatus === 'inactive' && !role.isActive) ||
      (filterStatus === 'system' && role.isSystemRole) ||
      (filterStatus === 'custom' && !role.isSystemRole);
    
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = searchTerm === '' || 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || permission.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{rbacStats.totalUsers}</div>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{rbacStats.totalRoles}</div>
                <p className="text-sm text-muted-foreground">Total Roles</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{rbacStats.totalPermissions}</div>
                <p className="text-sm text-muted-foreground">Permissions</p>
              </div>
              <Key className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{rbacStats.deniedAccess}</div>
                <p className="text-sm text-muted-foreground">Access Denied</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main RBAC Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Role-Based Access Control</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="audit">Access Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="roles" className="space-y-4">
              {/* Role Management Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="system">System Roles</SelectItem>
                      <SelectItem value="custom">Custom Roles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={fetchRBACData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Dialog open={showCreateRoleDialog} onOpenChange={setShowCreateRoleDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Role Name</label>
                            <Input
                              value={newRole.name}
                              onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter role name"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Level (1-10)</label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={newRole.level}
                              onChange={(e) => setNewRole(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            value={newRole.description}
                            onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter role description"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Permissions</label>
                          <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                            {permissions.map((permission) => (
                              <div key={permission.permissionId} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={newRole.permissions.includes(permission.permissionId)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setNewRole(prev => ({
                                        ...prev,
                                        permissions: [...prev.permissions, permission.permissionId]
                                      }));
                                    } else {
                                      setNewRole(prev => ({
                                        ...prev,
                                        permissions: prev.permissions.filter(p => p !== permission.permissionId)
                                      }));
                                    }
                                  }}
                                />
                                <label className="text-sm">{permission.name}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowCreateRoleDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createRole} disabled={!newRole.name || !newRole.description}>
                            Create Role
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Roles Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.roleId}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(role)}
                            <div>
                              <div className="font-medium">{role.name}</div>
                              <div className="text-sm text-muted-foreground">{role.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleLevelColor(role.level)}>
                            Level {role.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{role.permissions.length} permissions</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{role.userCount} users</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.isSystemRole ? 'solid' : 'light'} color={role.isSystemRole ? 'primary' : 'info'}>
                            {role.isSystemRole ? 'System' : 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={role.isActive}
                            onCheckedChange={() => toggleRoleStatus(role.roleId)}
                            disabled={role.isSystemRole}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedRole(role)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Role Details: {selectedRole?.name}</DialogTitle>
                                </DialogHeader>
                                {selectedRole && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">Role Name</label>
                                        <p className="text-sm text-muted-foreground">{selectedRole.name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Level</label>
                                        <p className="text-sm text-muted-foreground">Level {selectedRole.level}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Type</label>
                                        <p className="text-sm text-muted-foreground">
                                          {selectedRole.isSystemRole ? 'System Role' : 'Custom Role'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Users</label>
                                        <p className="text-sm text-muted-foreground">{selectedRole.userCount} users</p>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Description</label>
                                      <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Permissions</label>
                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                        {selectedRole.permissions.map((permId) => {
                                          const permission = permissions.find(p => p.permissionId === permId);
                                          return permission ? (
                                            <Badge key={permId} variant="outline" className="text-xs">
                                              {permission.name}
                                            </Badge>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm" disabled={role.isSystemRole}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={role.isSystemRole}>
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
            
            <TabsContent value="users" className="space-y-4">
              {/* User Management Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={fetchRBACData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>
              
              {/* Users Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((roleId) => {
                              const role = roles.find(r => r.roleId === roleId);
                              return role ? (
                                <Badge key={roleId} variant="outline" className="text-xs">
                                  {role.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{user.department}</div>
                            <div className="text-muted-foreground">{user.position}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {user.lastLogin.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={user.isActive}
                            onCheckedChange={() => toggleUserStatus(user.userId)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>User Details: {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
                                </DialogHeader>
                                {selectedUser && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">Username</label>
                                        <p className="text-sm text-muted-foreground">{selectedUser.username}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Email</label>
                                        <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Department</label>
                                        <p className="text-sm text-muted-foreground">{selectedUser.department}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Position</label>
                                        <p className="text-sm text-muted-foreground">{selectedUser.position}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Phone</label>
                                        <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Location</label>
                                        <p className="text-sm text-muted-foreground">{selectedUser.location}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Assigned Roles</label>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedUser.roles.map((roleId) => {
                                          const role = roles.find(r => r.roleId === roleId);
                                          return role ? (
                                            <Badge key={roleId} className={getRoleLevelColor(role.level)}>
                                              {role.name}
                                            </Badge>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4">
              {/* Permission Management Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search permissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="User Management">User Management</SelectItem>
                      <SelectItem value="Trading">Trading</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="System">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={fetchRBACData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Permission
                  </Button>
                </div>
              </div>
              
              {/* Permissions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissions.map((permission) => (
                      <TableRow key={permission.permissionId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{permission.name}</div>
                            <div className="text-sm text-muted-foreground">{permission.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPermissionCategoryColor(permission.category)}>
                            {permission.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{permission.resource}</code>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{permission.action}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={permission.isSystemPermission ? 'solid' : 'light'} color={permission.isSystemPermission ? 'primary' : 'info'}>
                            {permission.isSystemPermission ? 'System' : 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" disabled={permission.isSystemPermission}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={permission.isSystemPermission}>
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
            
            <TabsContent value="assignments" className="space-y-4">
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Role Assignments</h3>
                <p className="text-muted-foreground mb-4">
                  Manage user role assignments and permissions
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Role
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="audit" className="space-y-4">
              {/* Access Logs */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Permission</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs.map((log) => (
                      <TableRow key={log.logId}>
                        <TableCell>
                          <div className="font-medium">{log.username}</div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.action}</code>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.resource}</code>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.permission}</code>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={log.result === 'granted' ? 'default' : 'destructive'}
                            className={log.result === 'granted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {log.result === 'granted' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {log.result}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {log.timestamp.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{log.ipAddress}</code>
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

      {/* Role Distribution Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rbacStats.roleDistribution.map((item) => (
              <div key={item.roleName} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">{item.roleName}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.userCount} users</span>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Permission Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rbacStats.permissionUsage.map((item) => (
              <div key={item.permission} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="w-3 h-3 text-purple-500" />
                  <span className="text-sm font-medium">{item.permission}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.usageCount} uses</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleBasedAccessControl;