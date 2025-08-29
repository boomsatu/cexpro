import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Download, Eye, Check, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Withdrawal {
  id: string;
  userId: string;
  username: string;
  email: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'rejected';
  txHash?: string;
  toAddress: string;
  fromAddress?: string;
  reason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800'
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(currencyFilter !== 'all' && { currency: currencyFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/v1/admin/finance/withdrawals?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch withdrawals');
      
      const data = await response.json();
      setWithdrawals(data.withdrawals || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Gagal memuat data withdrawal');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, currencyFilter, searchTerm]);

  const handleStatusUpdate = async (withdrawalId: string, newStatus: string, notes?: string) => {
    try {
      const response = await fetch(`/api/v1/admin/finance/withdrawals/${withdrawalId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          adminNotes: notes
        })
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success('Status withdrawal berhasil diperbarui');
      setIsDialogOpen(false);
      setAdminNotes('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast.error('Gagal memperbarui status withdrawal');
    }
  };

  const openActionDialog = (withdrawal: Withdrawal, action: 'approve' | 'reject' | 'view') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setAdminNotes(withdrawal.adminNotes || '');
    setIsDialogOpen(true);
  };

  const exportWithdrawals = async () => {
    try {
      const params = new URLSearchParams({
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(currencyFilter !== 'all' && { currency: currencyFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/v1/admin/finance/withdrawals/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to export');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `withdrawals-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Data withdrawal berhasil diekspor');
    } catch (error) {
      console.error('Error exporting withdrawals:', error);
      toast.error('Gagal mengekspor data withdrawal');
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: currency === 'IDR' ? 0 : 8,
      maximumFractionDigits: currency === 'IDR' ? 0 : 8
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const truncateAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Withdrawal</h1>
          <p className="text-muted-foreground">Kelola dan monitor semua transaksi penarikan</p>
        </div>
        <Button onClick={exportWithdrawals} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Ekspor Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan username, email, atau address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Currency</SelectItem>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                <SelectItem value="USDT">Tether (USDT)</SelectItem>
                <SelectItem value="IDR">Rupiah (IDR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Daftar Withdrawal
            <Badge variant="destructive" className="ml-2">
              {withdrawals.filter(w => w.status === 'pending').length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>To Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id} className={withdrawal.status === 'pending' ? 'bg-yellow-50' : ''}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{withdrawal.username}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatAmount(withdrawal.amount, withdrawal.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-red-600">
                        -{formatAmount(withdrawal.fee, withdrawal.currency)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {formatAmount(withdrawal.netAmount, withdrawal.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{withdrawal.currency}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {truncateAddress(withdrawal.toAddress)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[withdrawal.status]}>
                          {withdrawal.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(withdrawal.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openActionDialog(withdrawal, 'view')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => openActionDialog(withdrawal, 'approve')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => openActionDialog(withdrawal, 'reject')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {withdrawal.txHash && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`https://blockchair.com/${withdrawal.currency.toLowerCase()}/transaction/${withdrawal.txHash}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'view' && 'Detail Withdrawal'}
              {actionType === 'approve' && 'Approve Withdrawal'}
              {actionType === 'reject' && 'Reject Withdrawal'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">User</label>
                  <p className="text-sm text-muted-foreground">{selectedWithdrawal.username} ({selectedWithdrawal.email})</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm font-mono">{formatAmount(selectedWithdrawal.amount, selectedWithdrawal.currency)} {selectedWithdrawal.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Fee</label>
                  <p className="text-sm font-mono text-red-600">-{formatAmount(selectedWithdrawal.fee, selectedWithdrawal.currency)} {selectedWithdrawal.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Net Amount</label>
                  <p className="text-sm font-mono font-semibold">{formatAmount(selectedWithdrawal.netAmount, selectedWithdrawal.currency)} {selectedWithdrawal.currency}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">To Address</label>
                  <p className="text-sm font-mono break-all">{selectedWithdrawal.toAddress}</p>
                </div>
                {selectedWithdrawal.txHash && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Transaction Hash</label>
                    <p className="text-sm font-mono break-all">{selectedWithdrawal.txHash}</p>
                  </div>
                )}
              </div>

              {(actionType === 'approve' || actionType === 'reject') && (
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Tambahkan catatan admin (opsional)..."
                    className="mt-2"
                  />
                </div>
              )}

              {actionType === 'view' && selectedWithdrawal.adminNotes && (
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <p className="text-sm text-muted-foreground mt-2 p-3 bg-gray-50 rounded">{selectedWithdrawal.adminNotes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                {actionType === 'approve' && (
                  <Button 
                    onClick={() => handleStatusUpdate(selectedWithdrawal.id, 'completed', adminNotes)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve Withdrawal
                  </Button>
                )}
                {actionType === 'reject' && (
                  <Button 
                    onClick={() => handleStatusUpdate(selectedWithdrawal.id, 'rejected', adminNotes)}
                    variant="destructive"
                  >
                    Reject Withdrawal
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}