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
import { Eye, Download, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface KYCDocument {
  id: string;
  type: 'passport' | 'id_card' | 'driver_license' | 'utility_bill' | 'bank_statement';
  filename: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface KYCSubmission {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  phoneNumber: string;
  submittedAt: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_additional_info';
  riskLevel: 'low' | 'medium' | 'high';
  documents: KYCDocument[];
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

interface KYCStats {
  totalSubmissions: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  requiresAdditionalInfo: number;
}

const KYCManagement: React.FC = () => {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [stats, setStats] = useState<KYCStats>({
    totalSubmissions: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    requiresAdditionalInfo: 0
  });
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    riskLevel: 'all',
    search: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKYCSubmissions();
    fetchKYCStats();
  }, [filters]);

  const fetchKYCSubmissions = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockSubmissions: KYCSubmission[] = [
        {
          id: '1',
          userId: 'user_001',
          username: 'john_doe',
          email: 'john@example.com',
          fullName: 'John Doe',
          dateOfBirth: '1990-05-15',
          nationality: 'US',
          address: '123 Main St, New York, NY 10001',
          phoneNumber: '+1-555-0123',
          submittedAt: '2024-01-15T10:30:00Z',
          status: 'pending',
          riskLevel: 'low',
          documents: [
            {
              id: 'doc_1',
              type: 'passport',
              filename: 'passport_john_doe.pdf',
              uploadedAt: '2024-01-15T10:30:00Z',
              status: 'pending'
            },
            {
              id: 'doc_2',
              type: 'utility_bill',
              filename: 'utility_bill_john_doe.pdf',
              uploadedAt: '2024-01-15T10:32:00Z',
              status: 'pending'
            }
          ]
        },
        {
          id: '2',
          userId: 'user_002',
          username: 'jane_smith',
          email: 'jane@example.com',
          fullName: 'Jane Smith',
          dateOfBirth: '1985-08-22',
          nationality: 'UK',
          address: '456 Oak Ave, London, UK',
          phoneNumber: '+44-20-7946-0958',
          submittedAt: '2024-01-14T14:20:00Z',
          status: 'under_review',
          riskLevel: 'medium',
          documents: [
            {
              id: 'doc_3',
              type: 'id_card',
              filename: 'id_card_jane_smith.pdf',
              uploadedAt: '2024-01-14T14:20:00Z',
              status: 'approved'
            }
          ],
          reviewedBy: 'admin_001',
          notes: 'Additional verification required for address proof'
        }
      ];
      
      setSubmissions(mockSubmissions);
    } catch (error) {
      console.error('Error fetching KYC submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKYCStats = async () => {
    try {
      // Mock data - replace with actual API call
      const mockStats: KYCStats = {
        totalSubmissions: 156,
        pendingReview: 23,
        approved: 98,
        rejected: 15,
        requiresAdditionalInfo: 20
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching KYC stats:', error);
    }
  };

  const handleStatusUpdate = async (submissionId: string, newStatus: KYCSubmission['status'], notes?: string) => {
    try {
      // Mock API call - replace with actual implementation
      console.log('Updating KYC status:', { submissionId, newStatus, notes });
      
      setSubmissions(prev => prev.map(submission => 
        submission.id === submissionId 
          ? { 
              ...submission, 
              status: newStatus, 
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'current_admin',
              notes: notes || submission.notes
            }
          : submission
      ));
      
      // Refresh stats
      fetchKYCStats();
    } catch (error) {
      console.error('Error updating KYC status:', error);
    }
  };

  const getStatusBadge = (status: KYCSubmission['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      requires_additional_info: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getRiskLevelBadge = (riskLevel: KYCSubmission['riskLevel']) => {
    const riskConfig = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={riskConfig[riskLevel]}>
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = filters.status === 'all' || submission.status === filters.status;
    const matchesRiskLevel = filters.riskLevel === 'all' || submission.riskLevel === filters.riskLevel;
    const matchesSearch = !filters.search || 
      submission.username.toLowerCase().includes(filters.search.toLowerCase()) ||
      submission.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      submission.fullName.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesRiskLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.requiresAdditionalInfo}</div>
            <p className="text-sm text-muted-foreground">Needs Info</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by username, email, or name..."
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
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="requires_additional_info">Needs Info</SelectItem>
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
              </SelectContent>
            </Select>
          </div>

          {/* Submissions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading KYC submissions...
                    </TableCell>
                  </TableRow>
                ) : filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No KYC submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{submission.username}</div>
                          <div className="text-sm text-muted-foreground">{submission.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{submission.fullName}</TableCell>
                      <TableCell>
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>{getRiskLevelBadge(submission.riskLevel)}</TableCell>
                      <TableCell>
                        <Badge variant="light" color="info">
                          {submission.documents.length} docs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>KYC Review - {submission.fullName}</DialogTitle>
                            </DialogHeader>
                            {selectedSubmission && (
                              <KYCReviewDialog 
                                submission={selectedSubmission} 
                                onStatusUpdate={handleStatusUpdate}
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
        </CardContent>
      </Card>
    </div>
  );
};

// KYC Review Dialog Component
interface KYCReviewDialogProps {
  submission: KYCSubmission;
  onStatusUpdate: (submissionId: string, newStatus: KYCSubmission['status'], notes?: string) => void;
}

const KYCReviewDialog: React.FC<KYCReviewDialogProps> = ({ submission, onStatusUpdate }) => {
  const [notes, setNotes] = useState(submission.notes || '');
  const [selectedStatus, setSelectedStatus] = useState<KYCSubmission['status']>(submission.status);

  const handleSubmit = () => {
    onStatusUpdate(submission.id, selectedStatus, notes);
  };

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="personal">Personal Info</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="review">Review</TabsTrigger>
      </TabsList>
      
      <TabsContent value="personal" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <p className="text-sm text-muted-foreground">{submission.fullName}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Date of Birth</label>
            <p className="text-sm text-muted-foreground">{submission.dateOfBirth}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Nationality</label>
            <p className="text-sm text-muted-foreground">{submission.nationality}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            <p className="text-sm text-muted-foreground">{submission.phoneNumber}</p>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">Address</label>
            <p className="text-sm text-muted-foreground">{submission.address}</p>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="documents" className="space-y-4">
        <div className="space-y-3">
          {submission.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{doc.type.replace('_', ' ').toUpperCase()}</div>
                <div className="text-sm text-muted-foreground">{doc.filename}</div>
                <div className="text-xs text-muted-foreground">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={doc.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                doc.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}>
                  {doc.status}
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
      
      <TabsContent value="review" className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={selectedStatus} onValueChange={(value: KYCSubmission['status']) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="requires_additional_info">Requires Additional Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Review Notes</label>
            <textarea
              className="w-full mt-1 p-2 border rounded-md"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add review notes..."
            />
          </div>
          
          <Button onClick={handleSubmit} className="w-full">
            Update KYC Status
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default KYCManagement;