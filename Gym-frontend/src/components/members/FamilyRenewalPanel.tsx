// BG_75: who is in a Couple/Family membership at renewal time. Staff keep or remove
// current family members, add new people, or link existing members; the backend
// (FamilyPlanChangeService) validates the plan's rules and prices everything, and
// the quote shown here is computed by the same code that later applies it.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CurrencyGlyph } from '../../utils/currency';
import { Plus, Search, Trash2, Users, AlertCircle, Loader2 } from 'lucide-react';
import {
  membersService,
  type Member,
  type FamilyPlanChangeQuote,
  type FamilyPlanChangeRequest,
} from '../../utils/supabase/members-service';

export interface FamilyComposition {
  keep_member_ids: number[];
  link_members: NonNullable<FamilyPlanChangeRequest['link_members']>;
  new_members: NonNullable<FamilyPlanChangeRequest['new_members']>;
}

export interface FamilyPanelState {
  composition: FamilyComposition;
  quote: FamilyPlanChangeQuote | null;
  error: string | null;
  loading: boolean;
}

interface NewRow {
  key: number;
  name: string;
  relationship: string;
  is_minor: boolean;
  date_of_birth: string;
  phone: string;
  email: string;
}

interface LinkRow {
  member: Member;
  relationship: string;
  is_minor: boolean;
}

interface Props {
  head: Member;
  planName: string;
  planType: string;
  discountAmount: number;
  reward: { reward_pass_id?: number; coupon_code?: string };
  onStateChange: (state: FamilyPanelState) => void;
}

const RELATIONSHIPS = ['Spouse', 'Partner', 'Child', 'Parent', 'Sibling', 'Other'];

const ACTION_LABEL: Record<string, { text: string; style: React.CSSProperties }> = {
  HEAD: { text: 'Head', style: { background: '#dbeafe', color: '#1e40af' } },
  KEEP: { text: 'Staying', style: { background: '#dcfce7', color: '#166534' } },
  NEW: { text: 'New', style: { background: '#e0e7ff', color: '#3730a3' } },
  LINK: { text: 'Joining', style: { background: '#fef3c7', color: '#92400e' } },
  DETACH: { text: 'Leaving', style: { background: '#fee2e2', color: '#991b1b' } },
};

const BILLING_LABEL: Record<string, string> = {
  HEAD: 'On family invoice',
  OWN: 'Own receipt',
  NONE: 'Not charged now',
};

export function FamilyRenewalPanel({ head, planName, planType, discountAmount, reward, onStateChange }: Props) {
  const isGroupPlan = /^(couple|family)$/i.test(planType || '');
  const isCouple = /^couple$/i.test(planType || '');

  const [current, setCurrent] = useState<Member[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [newRows, setNewRows] = useState<NewRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const nextKey = useRef(1);

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Member[]>([]);

  const [quote, setQuote] = useState<FamilyPlanChangeQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const quoteSeq = useRef(0);

  // Current family for this head.
  useEffect(() => {
    setNewRows([]);
    setLinks([]);
    setKeep({});
    setCurrent([]);
    if (!head.is_family_head) return;
    setLoadingFamily(true);
    membersService.getFamilyGroup(String(head.id))
      .then(group => {
        setCurrent(group.members);
        setKeep(Object.fromEntries(group.members.map(m => [String(m.id), true])));
      })
      .catch(() => setCurrent([]))
      .finally(() => setLoadingFamily(false));
  }, [head.id, head.is_family_head]);

  // Search existing members to link.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      membersService.searchMembers(q)
        .then(results => {
          const taken = new Set<string>([String(head.id), ...current.map(m => String(m.id)), ...links.map(l => String(l.member.id))]);
          setSuggestions(results.filter(m => !taken.has(String(m.id)) && !m.family_head_id).slice(0, 6));
        })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search, head.id, current, links]);

  const composition: FamilyComposition = useMemo(() => ({
    keep_member_ids: isGroupPlan ? current.filter(m => keep[String(m.id)]).map(m => Number(m.id)) : [],
    link_members: isGroupPlan ? links.map(l => ({ member_id: Number(l.member.id), relationship: l.relationship, is_minor: l.is_minor })) : [],
    new_members: isGroupPlan ? newRows.map(r => ({
      name: r.name.trim(),
      relationship: r.relationship,
      is_minor: r.is_minor,
      ...(r.date_of_birth ? { date_of_birth: r.date_of_birth } : {}),
      ...(r.phone.trim() ? { phone: r.phone.trim() } : {}),
      ...(r.email.trim() ? { email: r.email.trim() } : {}),
    })) : [],
  }), [isGroupPlan, current, keep, links, newRows]);

  const incomplete = newRows.some(r => !r.name.trim() || !r.relationship) || links.some(l => !l.relationship);

  // Live quote from the server (debounced; stale responses ignored).
  useEffect(() => {
    if (incomplete) {
      setQuote(null);
      setError('Fill in the name and relationship for everyone you are adding.');
      return;
    }
    const seq = ++quoteSeq.current;
    setLoadingQuote(true);
    const t = setTimeout(() => {
      membersService.quoteFamilyPlanChange(String(head.id), {
        plan_name: planName,
        ...composition,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        ...reward,
      })
        .then(q => { if (seq === quoteSeq.current) { setQuote(q); setError(null); } })
        .catch(e => { if (seq === quoteSeq.current) { setQuote(null); setError(e?.message || 'Could not price this change.'); } })
        .finally(() => { if (seq === quoteSeq.current) setLoadingQuote(false); });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head.id, planName, JSON.stringify(composition), discountAmount, reward.reward_pass_id, reward.coupon_code, incomplete]);

  useEffect(() => {
    onStateChange({ composition, quote, error, loading: loadingQuote || loadingFamily });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composition, quote, error, loadingQuote, loadingFamily]);

  const addNewRow = () => setNewRows(rows => [...rows, {
    key: nextKey.current++, name: '', relationship: isCouple ? 'Spouse' : '', is_minor: false,
    date_of_birth: '', phone: '', email: '',
  }]);
  const updateRow = (key: number, patch: Partial<NewRow>) =>
    setNewRows(rows => rows.map(r => r.key === key ? { ...r, ...patch } : r));

  return (
    <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="border-b bg-slate-50/50 py-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{isGroupPlan ? `${planType} Members` : 'Family Members'}</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {isGroupPlan
                ? isCouple
                  ? `${head.name} plus exactly one adult partner`
                  : `${head.name} plus the family members on this plan`
                : `"${planName}" is an individual plan — current family members will leave the family`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Current family */}
        {loadingFamily && <p className="text-sm text-muted-foreground">Loading family…</p>}
        {current.length > 0 && (
          <div className="space-y-2">
            <Label>Current family</Label>
            {current.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isGroupPlan && !!keep[String(m.id)]}
                    disabled={!isGroupPlan}
                    onCheckedChange={(v) => setKeep(k => ({ ...k, [String(m.id)]: v === true }))}
                    aria-label={`Keep ${m.name} in the family`}
                  />
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.relationship_to_head || 'Family member'}{m.is_minor ? ' · Minor' : ' · Adult'}
                    </p>
                  </div>
                </div>
                {!(isGroupPlan && keep[String(m.id)]) && (
                  <Badge style={ACTION_LABEL.DETACH.style}>Leaving</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {isGroupPlan && (
          <>
            {/* New people */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Add new people</Label>
                <Button type="button" variant="outline" size="sm" onClick={addNewRow}>
                  <Plus className="mr-2 h-4 w-4" /> Add person
                </Button>
              </div>
              {newRows.map(r => (
                <div key={r.key} className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Full name *</Label>
                      <Input value={r.name} onChange={e => updateRow(r.key, { name: e.target.value })} placeholder="Full name" />
                    </div>
                    <div>
                      <Label className="text-xs">Relationship *</Label>
                      <Select value={r.relationship} onValueChange={v => updateRow(r.key, { relationship: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIPS.map(rel => <SelectItem key={rel} value={rel}>{rel}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Age group</Label>
                      <Select
                        value={r.is_minor ? 'child' : 'adult'}
                        onValueChange={v => updateRow(r.key, { is_minor: v === 'child' })}
                        disabled={isCouple}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adult">Adult</SelectItem>
                          <SelectItem value="child">Child (minor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Date of birth</Label>
                      <Input type="date" value={r.date_of_birth} onChange={e => updateRow(r.key, { date_of_birth: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Phone (optional)</Label>
                      <Input value={r.phone} onChange={e => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) updateRow(r.key, { phone: v }); }} />
                    </div>
                    <div>
                      <Label className="text-xs">Email (optional)</Label>
                      <Input type="email" value={r.email} onChange={e => updateRow(r.key, { email: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setNewRows(rows => rows.filter(x => x.key !== r.key))}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Existing members */}
            <div className="space-y-3">
              <Label>Add an existing member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by name, phone or member ID"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {suggestions.length > 0 && (
                <div className="rounded-lg border">
                  {suggestions.map((m, i) => (
                    <button
                      type="button"
                      key={m.id}
                      className={`w-full text-left p-3 hover:bg-gray-50 flex items-center justify-between ${i > 0 ? 'border-t' : ''}`}
                      onClick={() => {
                        setLinks(ls => [...ls, { member: m, relationship: isCouple ? 'Spouse' : '', is_minor: isCouple ? false : !!m.is_minor }]);
                        setSearch('');
                        setSuggestions([]);
                      }}
                    >
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.membership_plan || '—'} · {m.phone || m.email || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {links.map(l => (
                <div key={l.member.id} className="rounded-lg border p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <p className="text-sm font-medium">{l.member.name}</p>
                    <p className="text-xs text-muted-foreground">Current plan: {l.member.membership_plan || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Relationship *</Label>
                    <Select
                      value={l.relationship}
                      onValueChange={v => setLinks(ls => ls.map(x => x.member.id === l.member.id ? { ...x, relationship: v } : x))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map(rel => <SelectItem key={rel} value={rel}>{rel}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={l.is_minor ? 'child' : 'adult'}
                      onValueChange={v => setLinks(ls => ls.map(x => x.member.id === l.member.id ? { ...x, is_minor: v === 'child' } : x))}
                      disabled={isCouple}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">Adult</SelectItem>
                        <SelectItem value="child">Child (minor)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${l.member.name}`}
                      onClick={() => setLinks(ls => ls.filter(x => x.member.id !== l.member.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* What will happen */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>What will happen</Label>
            {loadingQuote && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {quote && !error && (
            <div className="rounded-lg border">
              {quote.lines.map((l, i) => (
                <div key={`${l.member_id ?? 'new'}-${i}`} className={`p-3 flex items-start justify-between gap-3 ${i > 0 ? 'border-t' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{l.name}</span>
                      <Badge style={ACTION_LABEL[l.action]?.style}>{ACTION_LABEL[l.action]?.text ?? l.action}</Badge>
                      {l.minor && <span className="text-xs text-muted-foreground">Minor</span>}
                    </div>
                    {l.note && <p className="text-xs text-muted-foreground mt-1">{l.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{l.action === 'DETACH' ? '—' : <><CurrencyGlyph /> {Number(l.fee).toFixed(2)}</>}</p>
                    {l.action !== 'DETACH' && <p className="text-xs text-muted-foreground">{BILLING_LABEL[l.billing] ?? l.billing}</p>}
                  </div>
                </div>
              ))}
              <div className="p-3 space-y-1 border-t">
                {quote.reward_discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reward / coupon</span>
                    <span className="text-green-600">- <CurrencyGlyph /> {Number(quote.reward_discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold">Total to collect now</span>
                  <span className="font-bold text-primary"><CurrencyGlyph /> {Number(quote.total_due).toFixed(2)}</span>
                </div>
              </div>
              {quote.notes.length > 0 && (
                <div className="p-3 space-y-1 border-t">
                  {quote.notes.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
