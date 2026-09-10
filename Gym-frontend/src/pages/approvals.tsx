// Route: /approvals
// Reception/admin queue for mobile self-service purchases paid by Cash, Credit, or
// Mixed payment — these require staff to verify the cash was received (or the
// credit terms are acceptable) before the member gets app access. See
// MobileDiscoveryController.purchaseMembership on the backend for how a member
// lands in this state.
import React, { useCallback, useEffect, useState } from 'react';
import { membersService, type Member } from '../utils/supabase/members-service';
import { useCurrency } from '../utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

type ActionType = 'approve' | 'reject';

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function Approvals() {
  const { formatCurrency } = useCurrency();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [actionDialog, setActionDialog] = useState<{ type: ActionType; member: Member } | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersService.getPendingApprovals({ page: currentPage, limit: PAGE_SIZE });
      setMembers(res.members);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalItems(res.pagination.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const openAction = (type: ActionType, member: Member) => {
    setActionDialog({ type, member });
    setReason('');
  };

  const confirmAction = async () => {
    if (!actionDialog) return;
    const { type, member } = actionDialog;
    if (type === 'reject' && !reason.trim()) {
      toast.error('A rejection reason is required');
      return;
    }
    setProcessing(true);
    try {
      if (type === 'approve') {
        await membersService.approveMemberPayment(member.id);
        toast.success(`${member.name}'s payment approved — app access unlocked`);
      } else {
        await membersService.rejectMemberPayment(member.id, reason.trim());
        toast.success(`${member.name}'s payment rejected`);
      }
      setActionDialog(null);
      await loadMembers();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${type} payment`);
    } finally {
      setProcessing(false);
    }
  };

  const cardShell = 'border-primary/10 shadow-md hover:shadow-lg transition-shadow';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-muted-foreground mt-2">
            Review mobile purchases paid by Cash, Credit, or Mixed payment before the member gets app access
          </p>
        </div>
        <Button variant="outline" onClick={loadMembers}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Awaiting Approval</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Members waiting on reception</p>
          </CardContent>
        </Card>
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
                <TableHead>Amount Paid</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading pending approvals...
                  </TableCell>
                </TableRow>
              )}
              {!loading && members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No payments are waiting on approval.
                  </TableCell>
                </TableRow>
              )}
              {!loading && members.map((member) => {
                const paidAmount = (member.membership_fee ?? 0) - (member.outstanding_balance ?? 0);
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
                    <TableCell>{formatCurrency(paidAmount)}</TableCell>
                    <TableCell className={(member.outstanding_balance ?? 0) > 0 ? 'text-red-600 font-medium' : ''}>
                      {formatCurrency(member.outstanding_balance ?? 0)}
                    </TableCell>
                    <TableCell>{formatDateTime(member.join_date)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => openAction('approve', member)}
                      >
                        <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => openAction('reject', member)}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" /> Reject
                      </Button>
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
            Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} pending
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

      {/* Approve / Reject confirmation dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionDialog?.type === 'approve' ? 'Approve' : 'Reject'} Payment</DialogTitle>
            <DialogDescription>
              {actionDialog && (
                <>
                  {actionDialog.type === 'approve'
                    ? <>Confirm that <strong>{actionDialog.member.name}</strong>'s {actionDialog.member.payment_method_used?.toLowerCase() || 'payment'} was received. This unlocks their app access.</>
                    : <>Reject <strong>{actionDialog.member.name}</strong>'s payment. Their membership will be marked inactive and app access stays locked.</>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="action-reason">
              {actionDialog?.type === 'reject' ? 'Reason (required)' : 'Remarks (optional)'}
            </Label>
            <Textarea
              id="action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={actionDialog?.type === 'reject' ? 'Why is this payment being rejected?' : 'Add a note for the audit trail...'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={processing}
              className={actionDialog?.type === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {processing ? 'Processing...' : `Confirm ${actionDialog?.type === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
