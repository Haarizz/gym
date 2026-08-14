// Route: /reward-rules
import React, { useState, useEffect, useCallback } from 'react';
import {
  rewardRuleService,
  referralCampaignService,
  type RewardRule,
  type RewardRuleRequest,
  type ReferralCampaign,
  type ReferralCampaignRequest,
  type RewardType,
  type RedemptionAction,
} from '../utils/supabase/reward-service';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
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
  FREE_PT: 'Free PT Session',
  FREE_CLASS: 'Free Class',
  COUPON: 'Coupon',
  LOYALTY_POINTS: 'Loyalty Points',
  GIFT: 'Gift',
  CASH: 'Cash',
};

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

const CAMPAIGN_STATUS_OPTIONS = ['scheduled', 'active', 'paused', 'expired'];

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-gray-100 text-gray-600',
};

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatTarget(rule: RewardRule): string {
  const base = rule.eligibility === 'referrer' ? 'Referrer' : rule.eligibility === 'referee' ? 'Referee' : 'Both';
  return rule.targetMembershipPlanId ? `${base} · Plan #${rule.targetMembershipPlanId}` : base;
}

function formatRewardValue(rule: RewardRule): string {
  if (rule.value == null) return '—';
  const suffix = rule.unit || rule.currency || '';
  return suffix ? `${rule.value} ${suffix}` : String(rule.value);
}

function formatTrigger(trigger?: string): string {
  if (!trigger) return 'Any';
  return TRIGGER_LABELS[trigger] ?? trigger;
}

function formatDate(d?: string): string {
  if (!d) return '';
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
}

function formatCampaignCell(rule: RewardRule): string {
  if (rule.campaignName) return rule.campaignName;
  if (rule.campaignStartDate || rule.campaignEndDate) {
    return `${formatDate(rule.campaignStartDate) || '…'} – ${formatDate(rule.campaignEndDate) || '…'}`;
  }
  return 'Always On';
}

function campaignStatusBadge(status: string) {
  const key = (status || '').toLowerCase();
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  return (
    <Badge className={CAMPAIGN_STATUS_STYLES[key] ?? 'bg-muted text-muted-foreground'}>
      {label}
    </Badge>
  );
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
  campaignId: string; // '' = none / evergreen
  campaignStartDate: string;
  campaignEndDate: string;
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
    campaignId: '',
    campaignStartDate: '',
    campaignEndDate: '',
    isActive: true,
  };
}

function ruleToForm(rule: RewardRule): RuleFormState {
  return {
    name: rule.name ?? '',
    eligibility: rule.eligibility ?? 'referrer',
    rewardType: rule.rewardType ?? 'WALLET_CREDIT',
    value: rule.value != null ? String(rule.value) : '',
    unit: rule.unit ?? '',
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
    campaignId: rule.campaignId != null ? String(rule.campaignId) : '',
    campaignStartDate: rule.campaignStartDate ? rule.campaignStartDate.slice(0, 10) : '',
    campaignEndDate: rule.campaignEndDate ? rule.campaignEndDate.slice(0, 10) : '',
    isActive: rule.isActive,
  };
}

interface CampaignFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  stackable: boolean;
}

function defaultCampaignForm(): CampaignFormState {
  return { name: '', description: '', startDate: '', endDate: '', status: 'scheduled', priority: '0', stackable: false };
}

function campaignToForm(c: ReferralCampaign): CampaignFormState {
  return {
    name: c.name ?? '',
    description: c.description ?? '',
    startDate: c.startDate ? c.startDate.slice(0, 10) : '',
    endDate: c.endDate ? c.endDate.slice(0, 10) : '',
    status: c.status ?? 'scheduled',
    priority: c.priority != null ? String(c.priority) : '0',
    stackable: !!c.stackable,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function RewardRules({ autoOpenSignal }: { autoOpenSignal?: number } = {}) {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(defaultRuleForm());

  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(defaultCampaignForm());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesData, campaignsData] = await Promise.all([
        rewardRuleService.getAll(),
        referralCampaignService.getAll(),
      ]);
      setRules(rulesData);
      setCampaigns(campaignsData);
    } catch {
      toast.error('Failed to load reward rules & campaigns');
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
      value: ruleForm.value !== '' ? Number(ruleForm.value) : undefined,
      unit: ruleForm.unit || undefined,
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
      campaignId: ruleForm.campaignId !== '' ? Number(ruleForm.campaignId) : undefined,
      campaignStartDate: !ruleForm.campaignId && ruleForm.campaignStartDate ? ruleForm.campaignStartDate : undefined,
      campaignEndDate: !ruleForm.campaignId && ruleForm.campaignEndDate ? ruleForm.campaignEndDate : undefined,
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

  // ── Campaign handlers ──────────────────────────────────────────────────────

  const openNewCampaign = useCallback(() => {
    setEditingCampaignId(null);
    setCampaignForm(defaultCampaignForm());
    setShowCampaignDialog(true);
  }, []);

  const openEditCampaign = useCallback((campaign: ReferralCampaign) => {
    setEditingCampaignId(campaign.id);
    setCampaignForm(campaignToForm(campaign));
    setShowCampaignDialog(true);
  }, []);

  const handleSaveCampaign = useCallback(async () => {
    if (!campaignForm.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    const payload: ReferralCampaignRequest = {
      name: campaignForm.name.trim(),
      description: campaignForm.description || undefined,
      startDate: campaignForm.startDate || undefined,
      endDate: campaignForm.endDate || undefined,
      status: campaignForm.status,
      priority: campaignForm.priority !== '' ? Number(campaignForm.priority) : 0,
      stackable: campaignForm.stackable,
    };
    try {
      if (editingCampaignId) {
        await referralCampaignService.update(editingCampaignId, payload);
        toast.success('Campaign updated');
      } else {
        await referralCampaignService.create(payload);
        toast.success('Campaign created');
      }
      setShowCampaignDialog(false);
      await loadData();
    } catch {
      toast.error(editingCampaignId ? 'Failed to update campaign' : 'Failed to create campaign');
    }
  }, [campaignForm, editingCampaignId, loadData]);

  const handleDeleteCampaign = useCallback(async (campaign: ReferralCampaign) => {
    if (!window.confirm(`Delete campaign "${campaign.name}"? Rules linked to it will fall back to evergreen.`)) return;
    try {
      await referralCampaignService.delete(campaign.id);
      toast.success('Campaign deleted');
      await loadData();
    } catch {
      toast.error('Failed to delete campaign');
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

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="rules" className="flex-1">Reward Rules</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex-1">Campaigns</TabsTrigger>
        </TabsList>

        {/* ── Rules Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
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
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Loading reward rules...
                      </TableCell>
                    </TableRow>
                  ) : sortedRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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
                        <TableCell className="text-sm text-muted-foreground">{formatCampaignCell(rule)}</TableCell>
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
        </TabsContent>

        {/* ── Campaigns Tab ────────────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Campaigns</h2>
              <p className="text-muted-foreground">Time-boxed wrappers marketing can launch without touching rule schemas</p>
            </div>
            <Button onClick={openNewCampaign}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </div>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Stackable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Loading campaigns...
                      </TableCell>
                    </TableRow>
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No campaigns yet. Create one to time-box a promo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {campaign.description || '—'}
                        </TableCell>
                        <TableCell>{formatDate(campaign.startDate) || '—'}</TableCell>
                        <TableCell>{formatDate(campaign.endDate) || '—'}</TableCell>
                        <TableCell>{campaignStatusBadge(campaign.status)}</TableCell>
                        <TableCell>{campaign.priority ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.stackable ? 'Yes' : 'No'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openEditCampaign(campaign)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteCampaign(campaign)}
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
        </TabsContent>
      </Tabs>

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
                  {(Object.keys(REWARD_TYPE_LABELS) as RewardType[]).map((rt) => (
                    <SelectItem key={rt} value={rt}>{REWARD_TYPE_LABELS[rt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reward Value</Label>
              <Input
                className="mt-1"
                type="number"
                placeholder="e.g., 25 AED / 10%"
                value={ruleForm.value}
                onChange={(e) => setRuleForm((p) => ({ ...p, value: e.target.value }))}
              />
            </div>

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

      {/* ---------------- Campaign Dialog (create / edit) ---------------- */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCampaignId ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
            <DialogDescription>
              A time-boxed wrapper so marketing can launch promos without touching rule schemas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Campaign Name</Label>
              <Input
                className="mt-1"
                placeholder="e.g., New Year Referral Blast"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                placeholder="Optional notes for the team"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={campaignForm.startDate}
                  onChange={(e) => setCampaignForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={campaignForm.endDate}
                  onChange={(e) => setCampaignForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={campaignForm.status}
                  onValueChange={(v) => setCampaignForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={campaignForm.priority}
                  onChange={(e) => setCampaignForm((p) => ({ ...p, priority: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="pr-4">
                <Label>Stackable</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Allow rules under this campaign to combine with other matching rules.
                </p>
              </div>
              <Switch
                checked={campaignForm.stackable}
                onCheckedChange={(v) => setCampaignForm((p) => ({ ...p, stackable: v === true }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCampaign}>{editingCampaignId ? 'Save Changes' : 'Create Campaign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
