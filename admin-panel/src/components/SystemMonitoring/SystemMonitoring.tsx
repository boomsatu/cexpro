'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
 
  RefreshCw,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,

} from 'lucide-react';

interface ServerHealth {
  serverId: string;
  serverName: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  lastChecked: Date;
  location: string;
  version: string;
}

interface DatabaseMetrics {
  databaseId: string;
  databaseName: string;
  status: 'healthy' | 'warning' | 'critical';
  connectionCount: number;
  maxConnections: number;
  queryResponseTime: number;
  transactionsPerSecond: number;
  cacheHitRatio: number;
  diskUsage: number;
  replicationLag: number;
  lastBackup: Date;
}

interface SystemAlert {
  alertId: string;
  type: 'server' | 'database' | 'network' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  affectedService: string;
  resolvedBy?: string;
  resolvedAt?: Date;
}



interface NetworkStatus {
  endpoint: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastChecked: Date;
  uptime: number;
}

const SystemMonitoring: React.FC = () => {
  const [servers, setServers] = useState<ServerHealth[]>([]);
  const [databases, setDatabases] = useState<DatabaseMetrics[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1h');

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchSystemData = async () => {
    try {
  
      
      // Mock data - replace with actual API calls
      const mockServers: ServerHealth[] = [
        {
          serverId: 'srv-001',
          serverName: 'API Server 1',
          status: 'healthy',
          uptime: 99.98,
          cpuUsage: 45,
          memoryUsage: 68,
          diskUsage: 32,
          networkLatency: 12,
          lastChecked: new Date(),
          location: 'US-East',
          version: '2.1.4'
        },
        {
          serverId: 'srv-002',
          serverName: 'API Server 2',
          status: 'warning',
          uptime: 99.85,
          cpuUsage: 78,
          memoryUsage: 85,
          diskUsage: 45,
          networkLatency: 18,
          lastChecked: new Date(),
          location: 'US-West',
          version: '2.1.4'
        },
        {
          serverId: 'srv-003',
          serverName: 'Trading Engine',
          status: 'healthy',
          uptime: 99.99,
          cpuUsage: 52,
          memoryUsage: 72,
          diskUsage: 28,
          networkLatency: 8,
          lastChecked: new Date(),
          location: 'EU-Central',
          version: '3.0.1'
        },
        {
          serverId: 'srv-004',
          serverName: 'WebSocket Server',
          status: 'critical',
          uptime: 98.45,
          cpuUsage: 92,
          memoryUsage: 95,
          diskUsage: 78,
          networkLatency: 45,
          lastChecked: new Date(),
          location: 'Asia-Pacific',
          version: '1.8.2'
        }
      ];

      const mockDatabases: DatabaseMetrics[] = [
        {
          databaseId: 'db-001',
          databaseName: 'Primary Database',
          status: 'healthy',
          connectionCount: 145,
          maxConnections: 500,
          queryResponseTime: 25,
          transactionsPerSecond: 1250,
          cacheHitRatio: 94.5,
          diskUsage: 68,
          replicationLag: 0.2,
          lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          databaseId: 'db-002',
          databaseName: 'Analytics Database',
          status: 'warning',
          connectionCount: 89,
          maxConnections: 200,
          queryResponseTime: 45,
          transactionsPerSecond: 680,
          cacheHitRatio: 87.2,
          diskUsage: 82,
          replicationLag: 1.5,
          lastBackup: new Date(Date.now() - 4 * 60 * 60 * 1000)
        },
        {
          databaseId: 'db-003',
          databaseName: 'Cache Database',
          status: 'healthy',
          connectionCount: 234,
          maxConnections: 1000,
          queryResponseTime: 8,
          transactionsPerSecond: 3200,
          cacheHitRatio: 98.7,
          diskUsage: 45,
          replicationLag: 0.1,
          lastBackup: new Date(Date.now() - 1 * 60 * 60 * 1000)
        }
      ];

      const mockAlerts: SystemAlert[] = [
        {
          alertId: 'alert-001',
          type: 'server',
          severity: 'critical',
          title: 'High CPU Usage on WebSocket Server',
          description: 'CPU usage has exceeded 90% for more than 5 minutes',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          status: 'active',
          affectedService: 'WebSocket Server'
        },
        {
          alertId: 'alert-002',
          type: 'database',
          severity: 'medium',
          title: 'High Disk Usage on Analytics Database',
          description: 'Disk usage has reached 82% capacity',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          status: 'acknowledged',
          affectedService: 'Analytics Database'
        },
        {
          alertId: 'alert-003',
          type: 'performance',
          severity: 'high',
          title: 'Increased Response Time',
          description: 'API response time has increased by 40% in the last hour',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'active',
          affectedService: 'API Server 2'
        },
        {
          alertId: 'alert-004',
          type: 'network',
          severity: 'low',
          title: 'Network Latency Spike',
          description: 'Network latency increased to 45ms',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          status: 'resolved',
          affectedService: 'WebSocket Server',
          resolvedBy: 'admin@cex.com',
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000)
        }
      ];



      const mockNetworkStatus: NetworkStatus[] = [
        {
          endpoint: 'api.cex.com',
          status: 'online',
          responseTime: 45,
          lastChecked: new Date(),
          uptime: 99.98
        },
        {
          endpoint: 'ws.cex.com',
          status: 'degraded',
          responseTime: 120,
          lastChecked: new Date(),
          uptime: 98.45
        },
        {
          endpoint: 'admin.cex.com',
          status: 'online',
          responseTime: 32,
          lastChecked: new Date(),
          uptime: 99.95
        }
      ];

      setServers(mockServers);
      setDatabases(mockDatabases);
      setAlerts(mockAlerts);
  
      setNetworkStatus(mockNetworkStatus);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching system data:', error);
    } finally {
      // Loading state removed
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'offline':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
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

  const getAlertStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatResponseTime = (time: number) => {
    return `${time.toFixed(0)}ms`;
  };



  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.alertId === alertId 
        ? { ...alert, status: 'acknowledged' as const }
        : alert
    ));
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.alertId === alertId 
        ? { 
            ...alert, 
            status: 'resolved' as const,
            resolvedBy: 'admin@cex.com',
            resolvedAt: new Date()
          }
        : alert
    ));
  };

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && alert.status === 'active');

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
              <SelectItem value="6h">6 Hours</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchSystemData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {servers.filter(s => s.status === 'healthy').length}/{servers.length}
                </div>
                <p className="text-sm text-muted-foreground">Healthy Servers</p>
              </div>
              <Server className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {databases.filter(d => d.status === 'healthy').length}/{databases.length}
                </div>
                <p className="text-sm text-muted-foreground">Healthy Databases</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{criticalAlerts.length}</div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
              </div>
              <XCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Monitoring Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>System Monitoring Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="servers">Servers</TabsTrigger>
              <TabsTrigger value="databases">Databases</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Health Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall System Health</span>
                        <span className="font-medium">Good</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average CPU Usage</span>
                        <span className="font-medium">67%</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Memory Usage</span>
                        <span className="font-medium">80%</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Network Performance</span>
                        <span className="font-medium">Good</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Network Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {networkStatus.map((endpoint) => (
                      <div key={endpoint.endpoint} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(endpoint.status)}
                          <span className="text-sm font-medium">{endpoint.endpoint}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(endpoint.status)}>
                            {endpoint.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatResponseTime(endpoint.responseTime)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Critical Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  {criticalAlerts.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No critical alerts at this time
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {criticalAlerts.slice(0, 3).map((alert) => (
                        <div key={alert.alertId} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <div>
                              <div className="font-medium">{alert.title}</div>
                              <div className="text-sm text-muted-foreground">{alert.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {alert.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="servers" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uptime</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>Memory</TableHead>
                      <TableHead>Disk</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.serverId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{server.serverName}</div>
                            <div className="text-sm text-muted-foreground">{server.version}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(server.status)}
                            <Badge className={getStatusColor(server.status)}>
                              {server.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{formatUptime(server.uptime)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{server.cpuUsage}%</div>
                            <Progress value={server.cpuUsage} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{server.memoryUsage}%</div>
                            <Progress value={server.memoryUsage} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{server.diskUsage}%</div>
                            <Progress value={server.diskUsage} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell>{formatResponseTime(server.networkLatency)}</TableCell>
                        <TableCell>{server.location}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="outline" size="sm">
                              <Activity className="w-4 h-4" />
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
            
            <TabsContent value="databases" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Database</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Connections</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>TPS</TableHead>
                      <TableHead>Cache Hit</TableHead>
                      <TableHead>Disk Usage</TableHead>
                      <TableHead>Replication</TableHead>
                      <TableHead>Last Backup</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {databases.map((db) => (
                      <TableRow key={db.databaseId}>
                        <TableCell>
                          <div className="font-medium">{db.databaseName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(db.status)}
                            <Badge className={getStatusColor(db.status)}>
                              {db.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {db.connectionCount}/{db.maxConnections}
                          </div>
                          <Progress 
                            value={(db.connectionCount / db.maxConnections) * 100} 
                            className="h-1 mt-1" 
                          />
                        </TableCell>
                        <TableCell>{formatResponseTime(db.queryResponseTime)}</TableCell>
                        <TableCell>{db.transactionsPerSecond.toLocaleString()}</TableCell>
                        <TableCell>{db.cacheHitRatio.toFixed(1)}%</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{db.diskUsage}%</div>
                            <Progress value={db.diskUsage} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell>{db.replicationLag.toFixed(1)}s</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {db.lastBackup.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {db.lastBackup.toLocaleTimeString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="alerts" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <Badge className="bg-red-100 text-red-800">
                    {alerts.filter(a => a.status === 'active').length} Active
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {alerts.filter(a => a.status === 'acknowledged').length} Acknowledged
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">
                    {alerts.filter(a => a.status === 'resolved').length} Resolved
                  </Badge>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Affected Service</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.alertId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm text-muted-foreground">{alert.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="light" color="info">{alert.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAlertStatusColor(alert.status)}>
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{alert.affectedService}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {alert.timestamp.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {alert.timestamp.toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {alert.status === 'active' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => acknowledgeAlert(alert.alertId)}
                                >
                                  Acknowledge
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => resolveAlert(alert.alertId)}
                                >
                                  Resolve
                                </Button>
                              </>
                            )}
                            {alert.status === 'acknowledged' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => resolveAlert(alert.alertId)}
                              >
                                Resolve
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
            
            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Time Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-muted-foreground">Response Time Chart</p>
                        <p className="text-xs text-muted-foreground">Real-time performance monitoring</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Throughput Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                      <div className="text-center">
                        <Activity className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-muted-foreground">Throughput Chart</p>
                        <p className="text-xs text-muted-foreground">System throughput visualization</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">45ms</div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <div className="flex items-center justify-center mt-2">
                        <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">-12%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">1,250</div>
                      <p className="text-sm text-muted-foreground">Requests/sec</p>
                      <div className="flex items-center justify-center mt-2">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">+8%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">0.03%</div>
                      <p className="text-sm text-muted-foreground">Error Rate</p>
                      <div className="flex items-center justify-center mt-2">
                        <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">-0.01%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">342</div>
                      <p className="text-sm text-muted-foreground">Active Connections</p>
                      <div className="flex items-center justify-center mt-2">
                        <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                        <span className="text-sm text-blue-600">+15</span>
                      </div>
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

export default SystemMonitoring;