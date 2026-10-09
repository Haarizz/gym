// Route: /approval-history
// Audit trail for the Approvals queue: mobile Cash/Credit/Mixed purchases that
// reception has already approved or rejected, newest decision first. Backed by
// MemberService.getApprovalHistory on the backend (approval_status, approved_by,
// approved_at and rejection_reason on the member).
import React, { useCallback, useEffect, useState } from 'react';
import { membersService, type Member } from '../utils/supabase/members-service';
import { useCurrency } from '../utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  History,
  Search,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'APPROVED' | 'REJECTED';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ApprovalHistory() {
  const { formatCurrency } = useCurrency();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ approved: 0, rejected: 0 });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersService.getApprovalHistory(
        { status: statusFilter === 'all' ? undefined : statusFilter, search: search || undefined },
        { page: currentPage, limit: PAGE_SIZE }
      );
      setMembers(res.members);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalItems(res.pagination.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load approval history');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, currentPage]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await membersService.getApprovalHistorySummary());
    } catch (err: any) {
      toast.error(err.message || 'Failed to load approval summary');
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const refreshAll = () => {
    loadHistory();
    loadSummary();
  };

  const applyStatus = (value: StatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const cardShell = 'border-primary/10 shadow-md hover:shadow-lg transition-shadow';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Approval History</h1>
          <p className="text-muted-foreground mt-2">
            Mobile purchases paid by Cash, Credit, or Mixed payment that have been approved or rejected
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary — clicking a card filters the table to that outcome */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className={`${cardShell} cursor-pointer ${statusFilter === 'APPROVED' ? 'ring-2 ring-green-500/40' : ''}`}
          onClick={() => applyStatus(statusFilter === 'APPROVED' ? 'all' : 'APPROVED')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Approved</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.approved}</div>
            <p className="text-xs text-muted-foreground">Payments confirmed, app access unlocked</p>
          </CardContent>
        </Card>
        <Card
          className={`${cardShell} cursor-pointer ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-500/40' : ''}`}
          onClick={() => applyStatus(statusFilter === 'REJECTED' ? 'all' : 'REJECTED')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Rejected</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.rejected}</div>
            <p className="text-xs text-muted-foreground">Payments declined, membership set inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => applyStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All decisions</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className={cardShell}>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decided By</TableHead>
                <TableHead>Decided On</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading approval history...
                  </TableCell>
                </TableRow>
              )}
              {!loading && members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {search || statusFilter !== 'all'
                      ? 'No decisions match these filters.'
                      : 'No payments have been approved or rejected yet.'}
                  </TableCell>
                </TableRow>
              )}
              {!loading && members.map((member) => {
                const approved = member.approval_status === 'APPROVED';
                return (
                  <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.phone || member.email}</div>
                    </TableCell>
                    <TableCell>{member.membership_plan || member.membership_type || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 gap-1">
                        <Wallet className="h-3 w-3" />
                        {member.payment_method_used || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(member.membership_fee ?? 0)}</TableCell>
                    <TableCell>
                      {approved ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                          <CheckCircle className="h-3 w-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                          <XCircle className="h-3 w-3" /> Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{member.approved_by || '—'}</TableCell>
                    <TableCell>{formatDateTime(member.approved_at)}</TableCell>
                    <TableCell className="max-w-xs">
                      {member.rejection_reason ? (
                        <span className="text-sm text-muted-foreground line-clamp-2" title={member.rejection_reason}>
                          {member.rejection_reason}
                        </span>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} decisions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-sm">Page {currentPage} of {totalPages}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
