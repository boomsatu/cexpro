'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  FileText, 
  Download, 
  Calendar, 
  Search, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Clock, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Database, 
  FileSpreadsheet, 
  FilePdf, 
  Share, 
  Archive, 
  Timer, 
  PlayCircle, 
  PauseCircle,
  Shield
} from 'lucide-react';

interface ReportTemplate {
  templateId: string;
  name: string;
  description: string;
  category: string;
  type: 'trading' | 'financial' | 'user' | 'compliance' | 'system' | 'custom';
  fields: string[];
  filters: ReportFilter[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  usageCount: number;
}

interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: string | number | boolean | Date;
  label: string;
}

interface ScheduledReport {
  scheduleId: string;
  templateId: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: {
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone: string;
  };
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'error' | 'completed';
  createdAt: Date;
  createdBy: string;
}

interface GeneratedReport {
  reportId: string;
  templateId: string;
  scheduledId?: string;
  name: string;
  type: string;
  format: string;
  status: 'generating' | 'completed' | 'failed' | 'expired';
  fileSize?: number;
  downloadUrl?: string;
  generatedAt: Date;
  expiresAt: Date;
  generatedBy: string;
  parameters: Record<string, string | number | boolean>;
  executionTime?: number;
}

interface ReportStats {
  totalReports: number;
  scheduledReports: number;
  activeSchedules: number;
  reportsToday: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  avgGenerationTime: number;
  totalDownloads: number;
  popularTemplates: {
    templateName: string;
    usageCount: number;
  }[];
  recentActivity: {
    action: string;
    reportName: string;
    timestamp: Date;
    user: string;
  }[];
}

const EnhancedReporting: React.FC = () => {
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats>({
    totalReports: 0,
    scheduledReports: 0,
    activeSchedules: 0,
    reportsToday: 0,
    reportsThisWeek: 0,
    reportsThisMonth: 0,
    avgGenerationTime: 0,
    totalDownloads: 0,
    popularTemplates: [],
    recentActivity: []
  });
  const [activeTab, setActiveTab] = useState('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');


  useEffect(() => {
    fetchReportingData();
  }, []);

  const fetchReportingData = async () => {
    try {
      // Loading state removed
      
      // TODO: Replace with actual API calls to fetch report templates
      // const templatesResponse = await fetch('/api/reports/templates');
      // const templates = await templatesResponse.json();
      
      // For now, initialize with empty array until API is implemented
      const templates: ReportTemplate[] = [];

      // TODO: Replace with actual API calls to fetch scheduled reports
      // const scheduledResponse = await fetch('/api/reports/scheduled');
      // const scheduledReports = await scheduledResponse.json();
      
      // For now, initialize with empty array until API is implemented
      const scheduledReports: ScheduledReport[] = [];

      // TODO: Replace with actual API calls to fetch generated reports
      // const generatedResponse = await fetch('/api/reports/generated');
      // const generatedReports = await generatedResponse.json();
      
      // TODO: Replace with actual API calls to fetch report stats
      // const statsResponse = await fetch('/api/reports/stats');
      // const stats = await statsResponse.json();
      
      // For now, initialize with empty arrays and zero stats until API is implemented
      const generatedReports: GeneratedReport[] = [];
      const stats: ReportStats = {
        totalReports: 0,
        scheduledReports: 0,
        activeSchedules: 0,
        reportsToday: 0,
        reportsThisWeek: 0,
        reportsThisMonth: 0,
        avgGenerationTime: 0,
        totalDownloads: 0,
        popularTemplates: [],
        recentActivity: []
      };

      setReportTemplates(templates);
      setScheduledReports(scheduledReports);
      setGeneratedReports(generatedReports);
      setReportStats(stats);
    } catch (error) {
      console.error('Error fetching reporting data:', error);
    } finally {
      // Loading state removed
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'trading':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'financial':
        return <DollarSign className="w-4 h-4 text-yellow-500" />;
      case 'user':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'compliance':
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'system':
        return <Activity className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FilePdf className="w-4 h-4 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'csv':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'json':
        return <Database className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateReport = (templateId: string) => {
    const template = reportTemplates.find(t => t.templateId === templateId);
    if (!template) return;

    const newReport: GeneratedReport = {
      reportId: `rpt-${Date.now()}`,
      templateId,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      type: template.category,
      format: 'pdf',
      status: 'generating',
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      generatedBy: 'current-user@cex.com',
      parameters: {}
    };

    setGeneratedReports(prev => [newReport, ...prev]);

    // Simulate report generation
    setTimeout(() => {
      setGeneratedReports(prev => 
        prev.map(report => 
          report.reportId === newReport.reportId
            ? {
                ...report,
                status: 'completed',
                fileSize: Math.floor(Math.random() * 5000000) + 500000,
                downloadUrl: `/api/reports/download/${newReport.reportId}`,
                executionTime: Math.floor(Math.random() * 20000) + 5000
              }
            : report
        )
      );
    }, 3000);
  };

  const toggleScheduleStatus = (scheduleId: string) => {
    setScheduledReports(prev => 
      prev.map(schedule => 
        schedule.scheduleId === scheduleId 
          ? { 
              ...schedule, 
              isActive: !schedule.isActive,
              status: !schedule.isActive ? 'active' : 'paused'
            }
          : schedule
      )
    );
  };

  const filteredTemplates = reportTemplates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && template.isActive) ||
      (filterStatus === 'inactive' && !template.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredSchedules = scheduledReports.filter(schedule => {
    const template = reportTemplates.find(t => t.templateId === schedule.templateId);
    const matchesSearch = searchTerm === '' || 
      schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template && template.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredReports = generatedReports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{reportStats.totalReports}</div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{reportStats.activeSchedules}</div>
                <p className="text-sm text-muted-foreground">Active Schedules</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{reportStats.reportsToday}</div>
                <p className="text-sm text-muted-foreground">Reports Today</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{reportStats.avgGenerationTime}s</div>
                <p className="text-sm text-muted-foreground">Avg Generation Time</p>
              </div>
              <Timer className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Reporting Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Reporting System</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
              <TabsTrigger value="generated">Generated Reports</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="space-y-4">
              {/* Template Management Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
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
                      <SelectItem value="Trading">Trading</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Users">Users</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="System">System</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Button variant="outline" size="sm" onClick={fetchReportingData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={() => {}}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              </div>
              
              {/* Templates Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.templateId}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getReportTypeIcon(template.type)}
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">{template.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="light" color="info">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.isSystem ? 'solid' : 'light'} color={template.isSystem ? 'primary' : 'info'}>
                            {template.isSystem ? 'System' : 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{template.usageCount} times</div>
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={template.isActive}
                            disabled={template.isSystem}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => generateReport(template.templateId)}
                            >
                              <PlayCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={template.isSystem}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={template.isSystem}>
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
            
            <TabsContent value="scheduled" className="space-y-4">
              {/* Scheduled Reports Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search schedules..."
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
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={fetchReportingData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={() => {}}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Report
                  </Button>
                </div>
              </div>
              
              {/* Scheduled Reports Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((schedule) => {
                      const template = reportTemplates.find(t => t.templateId === schedule.templateId);
                      return (
                        <TableRow key={schedule.scheduleId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{schedule.name}</div>
                              <div className="text-sm text-muted-foreground">{schedule.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {template && getReportTypeIcon(template.type)}
                              <span className="text-sm">{template?.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="light" color="warning">
                              {schedule.frequency} at {schedule.schedule.time}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {schedule.nextRun.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{schedule.recipients.length} recipients</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(schedule.status)}>
                              {schedule.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => toggleScheduleStatus(schedule.scheduleId)}
                              >
                                {schedule.isActive ? (
                                  <PauseCircle className="w-4 h-4" />
                                ) : (
                                  <PlayCircle className="w-4 h-4" />
                                )}
                              </Button>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="generated" className="space-y-4">
              {/* Generated Reports Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
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
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="generating">Generating</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={fetchReportingData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Old
                  </Button>
                </div>
              </div>
              
              {/* Generated Reports Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.reportId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.name}</div>
                            <div className="text-sm text-muted-foreground">{report.type}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getFormatIcon(report.format)}
                            <span className="text-sm uppercase">{report.format}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {report.fileSize ? formatFileSize(report.fileSize) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {report.generatedAt.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {report.expiresAt.toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={report.status !== 'completed'}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Share className="w-4 h-4" />
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
            
            <TabsContent value="analytics" className="space-y-4">
              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Popular Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reportStats.popularTemplates.map((item, index) => (
                      <div key={item.templateName} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{item.templateName}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.usageCount} uses</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reportStats.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="text-sm font-medium">{activity.action} {activity.reportName}</div>
                            <div className="text-xs text-muted-foreground">by {activity.user}</div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              {/* Usage Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{reportStats.reportsThisWeek}</div>
                        <p className="text-sm text-muted-foreground">Reports This Week</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{reportStats.reportsThisMonth}</div>
                        <p className="text-sm text-muted-foreground">Reports This Month</p>
                      </div>
                      <PieChart className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{reportStats.totalDownloads}</div>
                        <p className="text-sm text-muted-foreground">Total Downloads</p>
                      </div>
                      <Download className="w-8 h-8 text-purple-500" />
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

export default EnhancedReporting;