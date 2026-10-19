// Route: /reward-rules
import React, { useState, useEffect, useCallback } from 'react';
import {
  rewardRuleService,
  type RewardRule,
  type RewardRuleRequest,
  type RewardType,
  type RedemptionAction,
} from '../utils/supabase/reward-service';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Copy, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from "sonner";

// ── Labels & lookups ─────────────────────────────────────────────────────────

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  WALLET_CREDIT: 'Wallet Credit',
  MEMBERSHIP_EXTENSION: 'Membership Extension',
  MEMBERSHIP_DISCOUNT: 'Membership Discount',
  FREE_PT: 'Free PT / Class',
  FREE_CLASS: 'Free Class',
  COUPON: 'Coupon',
  LOYALTY_POINTS: 'Loyalty Points',
  GIFT: 'Gift',
  CASH: 'Cash',
};

// Reward types selectable when creating/editing a rule. FREE_CLASS is folded into
// the combined "Free PT / Class" option (stored as FREE_PT); CASH, GIFT, and
// LOYALTY_POINTS are hidden here but remain valid values for existing rules/data.
const SELECTABLE_REWARD_TYPES: RewardType[] = [
  'WALLET_CREDIT',
  'MEMBERSHIP_EXTENSION',
  'MEMBERSHIP_DISCOUNT',
  'FREE_PT',
  'COUPON',
];

const REDEMPTION_ACTION_LABELS: Record<RedemptionAction, string> = {
  AUTO_WALLET: 'Auto-credit to Wallet',
  USE_DURING_PAYMENT: 'Use During Payment',
  EXTEND_MEMBERSHIP: 'Extend Membership',
  BOOK_PT: 'Book PT Session',
  BOOK_CLASS: 'Book Class',
  COPY_COUPON: 'Copy Coupon Code',
  COLLECT_GIFT: 'Collect Gift In-Person',
  REQUEST_CASH: 'Request Cash Payout',
};

// Reward types whose value can be a percentage or a fixed amount (rule.unit "%" vs empty).
const HAS_UNIT_CHOICE: RewardType[] = ['MEMBERSHIP_DISCOUNT', 'COUPON'];

// Sensible default redemption action suggestion when a reward type is chosen.
const DEFAULT_REDEMPTION_ACTION: Record<RewardType, RedemptionAction> = {
  WALLET_CREDIT: 'AUTO_WALLET',
  MEMBERSHIP_EXTENSION: 'EXTEND_MEMBERSHIP',
  MEMBERSHIP_DISCOUNT: 'USE_DURING_PAYMENT',
  FREE_PT: 'BOOK_PT',
  FREE_CLASS: 'BOOK_CLASS',
  COUPON: 'COPY_COUPON',
  LOYALTY_POINTS: 'AUTO_WALLET',
  GIFT: 'COLLECT_GIFT',
  CASH: 'REQUEST_CASH',
};

const TRIGGER_LABELS: Record<string, string> = {
  signup: 'On Signup',
  payment: 'On Payment',
  both: 'Both Signup & Payment',
};

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatTarget(rule: RewardRule): string {
  const base = rule.eligibility === 'referrer' ? 'Referrer' : rule.eligibility === 'referee' ? 'Referee' : 'Both';
  return rule.targetMembershipPlanId ? `${base} · Plan #${rule.targetMembershipPlanId}` : base;
}

function formatRewardValue(rule: RewardRule): string {
  if (rule.value == null) return '—';
  const suffix = (rule.unit && rule.unit !== 'AMOUNT' ? rule.unit : '') || rule.currency || '';
  return suffix ? `${rule.value} ${suffix}` : String(rule.value);
}

function formatTrigger(trigger?: string): string {
  if (!trigger) return 'Any';
  return TRIGGER_LABELS[trigger] ?? trigger;
}

// ── Form state ───────────────────────────────────────────────────────────────

interface RuleFormState {
  name: string;
  eligibility: 'referrer' | 'referee' | 'both';
  rewardType: RewardType;
  value: string;
  unit: string;
  currency: string;
  redemptionAction: RedemptionAction;
  conditionTrigger: string;
  priority: string;
  stackable: boolean;
  requiresApproval: boolean;
  expiryDays: string;
  minPurchaseAmount: string;
  minReferralCount: string;
  maxRewardsPerMember: string;
  targetMembershipPlanId: string;
  isActive: boolean;
}

function defaultRuleForm(): RuleFormState {
  return {
    name: '',
    eligibility: 'referrer',
    rewardType: 'WALLET_CREDIT',
    value: '',
    unit: '',
    currency: '',
    redemptionAction: 'AUTO_WALLET',
    conditionTrigger: 'payment',
    priority: '0',
    stackable: false,
    requiresApproval: false,
    expiryDays: '',
    minPurchaseAmount: '',
    minReferralCount: '',
    maxRewardsPerMember: '',
    targetMembershipPlanId: '',
    isActive: true,
  };
}

function ruleToForm(rule: RewardRule): RuleFormState {
  return {
    name: rule.name ?? '',
    eligibility: rule.eligibility ?? 'referrer',
    rewardType: rule.rewardType ?? 'WALLET_CREDIT',
    value: rule.value != null ? String(rule.value) : '',
    unit: rule.unit && rule.unit.toLowerCase().startsWith('percent') ? '%' : (rule.unit ?? ''),
    currency: rule.currency ?? '',
    redemptionAction: rule.redemptionAction ?? 'AUTO_WALLET',
    conditionTrigger: rule.conditionTrigger ?? 'payment',
    priority: rule.priority != null ? String(rule.priority) : '0',
    stackable: !!rule.stackable,
    requiresApproval: !!rule.requiresApproval,
    expiryDays: rule.expiryDays != null ? String(rule.expiryDays) : '',
    minPurchaseAmount: rule.minPurchaseAmount != null ? String(rule.minPurchaseAmount) : '',
    minReferralCount: rule.minReferralCount != null ? String(rule.minReferralCount) : '',
    maxRewardsPerMember: rule.maxRewardsPerMember != null ? String(rule.maxRewardsPerMember) : '',
    targetMembershipPlanId: rule.targetMembershipPlanId != null ? String(rule.targetMembershipPlanId) : '',
    isActive: rule.isActive,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function RewardRules({ autoOpenSignal }: { autoOpenSignal?: number } = {}) {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(defaultRuleForm());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setRules(await rewardRuleService.getAll());
    } catch {
      toast.error('Failed to load reward rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Rule handlers ──────────────────────────────────────────────────────────

  const openNewRule = useCallback(() => {
    setEditingRuleId(null);
    setRuleForm(defaultRuleForm());
    setShowRuleDialog(true);
  }, []);

  // Lets the parent Referrals page's "Add Reward Rule" header button open this
  // dialog directly, without duplicating the create-rule form elsewhere.
  useEffect(() => {
    if (autoOpenSignal) openNewRule();
  }, [autoOpenSignal, openNewRule]);

  const openEditRule = useCallback((rule: RewardRule) => {
    setEditingRuleId(rule.id);
    setRuleForm(ruleToForm(rule));
    setShowRuleDialog(true);
  }, []);

  const handleSaveRule = useCallback(async () => {
    if (!ruleForm.name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    const payload: RewardRuleRequest = {
      name: ruleForm.name.trim(),
      eligibility: ruleForm.eligibility,
      rewardType: ruleForm.rewardType,
      // A Free PT / Class pass is always exactly one session.
      value: ruleForm.rewardType === 'FREE_PT' ? 1
        : ruleForm.value !== '' ? Number(ruleForm.value) : undefined,
      unit: ruleForm.rewardType === 'FREE_PT' ? 'session'
        : ruleForm.rewardType === 'MEMBERSHIP_EXTENSION' ? 'days'
        // Explicit AMOUNT (not undefined) — the backend keeps the old unit when it's omitted.
        : HAS_UNIT_CHOICE.includes(ruleForm.rewardType) ? (ruleForm.unit === '%' ? '%' : 'AMOUNT')
        : ruleForm.unit || undefined,
      currency: ruleForm.currency || undefined,
      redemptionAction: ruleForm.redemptionAction,
      conditionTrigger: ruleForm.conditionTrigger || undefined,
      priority: ruleForm.priority !== '' ? Number(ruleForm.priority) : 0,
      stackable: ruleForm.stackable,
      requiresApproval: ruleForm.requiresApproval,
      expiryDays: ruleForm.expiryDays !== '' ? Number(ruleForm.expiryDays) : undefined,
      minPurchaseAmount: ruleForm.minPurchaseAmount !== '' ? Number(ruleForm.minPurchaseAmount) : undefined,
      minReferralCount: ruleForm.minReferralCount !== '' ? Number(ruleForm.minReferralCount) : undefined,
      maxRewardsPerMember: ruleForm.maxRewardsPerMember !== '' ? Number(ruleForm.maxRewardsPerMember) : undefined,
      targetMembershipPlanId: ruleForm.targetMembershipPlanId !== '' ? Number(ruleForm.targetMembershipPlanId) : undefined,
      isActive: ruleForm.isActive,
    };
    try {
      if (editingRuleId) {
        await rewardRuleService.update(editingRuleId, payload);
        toast.success('Reward rule updated');
      } else {
        await rewardRuleService.create(payload);
        toast.success('Reward rule created');
      }
      setShowRuleDialog(false);
      await loadData();
    } catch {
      toast.error(editingRuleId ? 'Failed to update reward rule' : 'Failed to create reward rule');
    }
  }, [ruleForm, editingRuleId, loadData]);

  const handleDuplicateRule = useCallback(async (rule: RewardRule) => {
    try {
      await rewardRuleService.duplicate(rule.id);
      toast.success(`Duplicated "${rule.name}"`);
      await loadData();
    } catch {
      toast.error('Failed to duplicate reward rule');
    }
  }, [loadData]);

  const handleDeleteRule = useCallback(async (rule: RewardRule) => {
    if (!window.confirm(`Delete reward rule "${rule.name}"? This cannot be undone.`)) return;
    try {
      await rewardRuleService.delete(rule.id);
      toast.success('Reward rule deleted');
      await loadData();
    } catch {
      toast.error('Failed to delete reward rule');
    }
  }, [loadData]);

  const handleToggleRule = useCallback(async (rule: RewardRule) => {
    try {
      await rewardRuleService.toggle(rule.id);
      toast.success(rule.isActive ? 'Reward rule disabled' : 'Reward rule enabled');
      await loadData();
    } catch {
      toast.error('Failed to update reward rule status');
    }
  }, [loadData]);

  const sortedRules = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Reward Rules</h1>
          <p className="text-muted-foreground mt-2">
            Configure what reward a referral generates, who qualifies, and when it applies.
          </p>
        </div>
      </div>

      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Reward Rules</h2>
              <p className="text-muted-foreground">Highest priority matching rule wins unless marked stackable</p>
            </div>
            <Button onClick={openNewRule}>
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          </div>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reward Type</TableHead>
                    <TableHead>Reward Value</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Loading reward rules...
                      </TableCell>
                    </TableRow>
                  ) : sortedRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No reward rules yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRules.map((rule) => (
                      <TableRow key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{formatTarget(rule)}</TableCell>
                        <TableCell>{rule.rewardType ? REWARD_TYPE_LABELS[rule.rewardType] : '—'}</TableCell>
                        <TableCell>{formatRewardValue(rule)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatTrigger(rule.conditionTrigger)}</Badge>
                        </TableCell>
                        <TableCell>{rule.priority ?? 0}</TableCell>
                        <TableCell>
                          <Badge className={rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEditRule(rule)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateRule(rule)}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleRule(rule)}>
                                {rule.isActive ? (
                                  <PowerOff className="mr-2 h-4 w-4" />
                                ) : (
                                  <Power className="mr-2 h-4 w-4" />
                                )}
                                {rule.isActive ? 'Disable' : 'Enable'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteRule(rule)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>

      {/* ---------------- Reward Rule Dialog (create / edit) ---------------- */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#2B7A78]">{editingRuleId ? 'Edit Reward Rule' : 'Add Reward Rule'}</DialogTitle>
            <DialogDescription>
              Define a new reward policy for referrals or achievements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Rule Name</Label>
              <Input
                className="mt-1"
                placeholder="e.g., 10% discount on next month"
                value={ruleForm.name}
                onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Reward Type</Label>
              <Select
                value={ruleForm.rewardType}
                onValueChange={(v) => setRuleForm((p) => ({
                  ...p,
                  rewardType: v as RewardType,
                  redemptionAction: DEFAULT_REDEMPTION_ACTION[v as RewardType] ?? p.redemptionAction,
                }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SELECTABLE_REWARD_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>{REWARD_TYPE_LABELS[rt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ruleForm.rewardType === 'FREE_PT' ? (
              <p className="text-sm text-muted-foreground">
                Gives the member a Reward Pass for one free PT or class session, picked when booking.
              </p>
            ) : (
              <div className={HAS_UNIT_CHOICE.includes(ruleForm.rewardType) ? 'grid grid-cols-2 gap-4' : undefined}>
                <div>
                  <Label>{ruleForm.rewardType === 'MEMBERSHIP_EXTENSION' ? 'Extension (days)' : 'Reward Value'}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    placeholder={ruleForm.rewardType === 'MEMBERSHIP_EXTENSION' ? 'e.g., 30' : 'e.g., 25 / 10'}
                    value={ruleForm.value}
                    onChange={(e) => setRuleForm((p) => ({ ...p, value: e.target.value }))}
                  />
                </div>
                {HAS_UNIT_CHOICE.includes(ruleForm.rewardType) && (
                  <div>
                    <Label>Unit</Label>
                    <Select
                      value={ruleForm.unit === '%' ? 'percent' : 'amount'}
                      onValueChange={(v) => setRuleForm((p) => ({ ...p, unit: v === 'percent' ? '%' : '' }))}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">% off</SelectItem>
                        <SelectItem value="amount">Fixed amount off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Eligibility</Label>
              <Select
                value={ruleForm.eligibility}
                onValueChange={(v) => setRuleForm((p) => ({ ...p, eligibility: v as RuleFormState['eligibility'] }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="referrer">Referrer Only</SelectItem>
                  <SelectItem value="referee">Referee Only</SelectItem>
                  <SelectItem value="both">Both Parties</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Condition</Label>
              <Select
                value={ruleForm.conditionTrigger}
                onValueChange={(v) => setRuleForm((p) => ({ ...p, conditionTrigger: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup">On Signup</SelectItem>
                  <SelectItem value="payment">On Payment</SelectItem>
                  <SelectItem value="both">Both Signup & Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expiry Days</Label>
              <Input
                className="mt-1"
                type="number"
                placeholder="Optional"
                value={ruleForm.expiryDays}
                onChange={(e) => setRuleForm((p) => ({ ...p, expiryDays: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRuleDialog(false)} className="border-red-600 text-red-600 hover:bg-red-50">Cancel</Button>
            <Button onClick={handleSaveRule} className="bg-red-600 hover:bg-red-700 text-white">{editingRuleId ? 'Save Changes' : 'Save Rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
