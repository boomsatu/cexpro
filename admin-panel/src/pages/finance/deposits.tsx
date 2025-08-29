import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table/Table';
import { Search, Download, Eye, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Deposit {
  id: string;
  userId: string;
  username: string;
  email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  txHash?: string;
  fromAddress?: string;
  toAddress: string;
  confirmations: number;
  requiredConfirmations: number;
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(currencyFilter !== 'all' && { currency: currencyFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/v1/admin/finance/deposits?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch deposits');
      
      const data = await response.json();
      setDeposits(data.deposits || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast.error('Gagal memuat data deposit');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, currencyFilter, searchTerm]);

  const handleStatusUpdate = async (depositId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/v1/admin/finance/deposits/${depositId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success('Status deposit berhasil diperbarui');
      fetchDeposits();
    } catch (error) {
      console.error('Error updating deposit status:', error);
      toast.error('Gagal memperbarui status deposit');
    }
  };

  const exportDeposits = async () => {
    try {
      const params = new URLSearchParams({
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(currencyFilter !== 'all' && { currency: currencyFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/v1/admin/finance/deposits/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to export');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deposits-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Data deposit berhasil diekspor');
    } catch (error) {
      console.error('Error exporting deposits:', error);
      toast.error('Gagal mengekspor data deposit');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Deposit</h1>
          <p className="text-muted-foreground">Kelola dan monitor semua transaksi deposit</p>
        </div>
        <Button onClick={exportDeposits} className="flex items-center gap-2">
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
                  placeholder="Cari berdasarkan username, email, atau TX hash..."
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

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Deposit</CardTitle>
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
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmations</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{deposit.username}</div>
                          <div className="text-sm text-muted-foreground">{deposit.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatAmount(deposit.amount, deposit.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{deposit.currency}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[deposit.status]}>
                          {deposit.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {deposit.currency !== 'IDR' ? (
                          <span className={deposit.confirmations >= deposit.requiredConfirmations ? 'text-green-600' : 'text-yellow-600'}>
                            {deposit.confirmations}/{deposit.requiredConfirmations}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(deposit.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {deposit.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleStatusUpdate(deposit.id, 'completed')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleStatusUpdate(deposit.id, 'failed')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
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
    </div>
  );
}