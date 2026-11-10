import { useEffect, useState } from 'react';
import { Check, Loader2, User, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { referralService, type ReferralResponse } from '../../utils/supabase/referral-service';

/** A validated referral code and the referee discount its reward rule gives (none if no rule). */
export interface AppliedReferral {
  referral: ReferralResponse;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number;
}

/** The discount an applied referral gives on `gross` — same maths as Add Member. */
export function referralDiscount(applied: AppliedReferral | null, gross: number): number {
  if (!applied || !applied.discountType || gross <= 0) return 0;
  const d = applied.discountType === 'percentage'
    ? (gross * applied.discountValue) / 100
    : applied.discountValue;
  return Math.round(Math.max(0, Math.min(d, gross)) * 100) / 100;
}

interface Props {
  value: AppliedReferral | null;
  onChange: (applied: AppliedReferral | null) => void;
  /** Blocks applying a code, e.g. while another single-use discount is picked. */
  disabled?: boolean;
  disabledHint?: string;
  currency?: string;
}

/**
 * "Have a referral code?" input plus a search of pending referrals by the referred
 * person's name/phone — the same flow the Add Member payment step uses.
 */
export function ReferralCodeField({ value, onChange, disabled, disabledHint, currency = '' }: Props) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ReferralResponse[]>([]);
  const [searching, setSearching] = useState(false);

  // Clear the typed code when the parent drops the referral (member changed, form reset).
  useEffect(() => { if (!value) setCode(''); }, [value]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2 || value || disabled) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { referrals } = await referralService.getReferrals({ status: 'pending', search: q, size: 5 });
        setResults(referrals);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, value, disabled]);

  const apply = async (raw: string) => {
    const c = raw.trim();
    if (!c) return;
    setChecking(true);
    try {
      const { referral, applicableRewardRules } = await referralService.validateCode(c);
      // Same rule preference as Add Member: a discount rule, then credit, then anything.
      const rule = applicableRewardRules.find(r => r.type === 'discount')
        || applicableRewardRules.find(r => r.type === 'credit')
        || applicableRewardRules[0];
      const applied: AppliedReferral = rule
        ? { referral, discountType: rule.unit === '%' ? 'percentage' : 'fixed', discountValue: Number(rule.value) || 0 }
        : { referral, discountType: null, discountValue: 0 };
      onChange(applied);
      setCode(referral.referralCode);
      setSearch('');
      setResults([]);
      toast.success(applied.discountType
        ? `Referral code applied! ${applied.discountType === 'percentage' ? `${applied.discountValue}% Off` : `${currency}${applied.discountValue} Off`} — Referred by ${referral.referrerName}`
        : `Referral from ${referral.referrerName} applied! (No discount for the referred member)`);
    } catch (e: any) {
      toast.error(e?.message || 'Invalid referral code');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Have a referral code?</Label>
        <div className="mt-1 flex gap-2">
          <Input
            value={value ? value.referral.referralCode : code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter referral code"
            className="font-mono tracking-wider uppercase"
            disabled={!!value || disabled}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(code); } }}
          />
          {value ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => { onChange(null); setCode(''); }}
            >
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          ) : (
            <Button
              type="button"
              className="shrink-0 bg-purple-600 hover:bg-purple-700"
              onClick={() => apply(code)}
              disabled={checking || !code.trim() || disabled}
            >
              {checking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Apply
            </Button>
          )}
        </div>
        {disabled && !value && disabledHint && (
          <p className="mt-1 text-xs text-muted-foreground">{disabledHint}</p>
        )}
      </div>

      {/* Who the referral was logged for — lets staff match the person against the captured photo. */}
      {value && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
          {value.referral.refereePhoto ? (
            <img src={value.referral.refereePhoto} alt={value.referral.refereeName} className="w-12 h-12 rounded-lg object-cover border border-purple-200 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-purple-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-purple-900 truncate">{value.referral.refereeName}</p>
            <p className="text-xs text-purple-700">Referred by {value.referral.referrerName}</p>
            {!value.referral.refereePhoto && (
              <p className="text-xs text-purple-500">No photo was captured for this referral.</p>
            )}
          </div>
        </div>
      )}

      {/* Find a pending referral when staff logged it but never handed out a code. */}
      {!value && !disabled && (
        <div>
          <Label>Or find by referred person's name/phone</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending referrals..."
            className="mt-1"
          />
          {searching && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching...
            </p>
          )}
          {!searching && search.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">No pending referrals match.</p>
          )}
          {results.length > 0 && (
            <div className="mt-1.5 border rounded-lg divide-y overflow-hidden">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => apply(r.referralCode)}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2.5"
                >
                  {r.refereePhoto ? (
                    <img src={r.refereePhoto} alt={r.refereeName} className="w-9 h-9 rounded-md object-cover border shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.refereeName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.refereePhone || r.refereeEmail || 'No contact info'} · Referred by {r.referrerName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
