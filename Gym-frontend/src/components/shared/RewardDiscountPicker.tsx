import { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  rewardService, discountCodeService, rewardDiscount, passLabel,
  type ReferralReward, type DiscountCode,
} from '../../utils/supabase/reward-service';

/** A picked Reward Pass or an applied coupon code — at most one per renewal. */
export type RewardDiscountSelection =
  | { kind: 'pass'; pass: ReferralReward }
  | { kind: 'coupon'; coupon: DiscountCode }
  | null;

/** The discount a selection gives on `gross` — mirrors the backend's calculation. */
export function selectionDiscount(sel: RewardDiscountSelection, gross: number): number {
  if (!sel) return 0;
  if (sel.kind === 'pass') return rewardDiscount(sel.pass.rewardUnit, sel.pass.rewardValue, gross);
  return sel.coupon.source === 'PROMOTION'
    ? promotionDiscount(sel.coupon, gross)
    : rewardDiscount(sel.coupon.discountType, sel.coupon.discountValue, gross);
}

/** DiscountCodeService.promotionDiscount: percentage (capped), free = all of it, else flat; 0 under the minimum. */
function promotionDiscount(promo: DiscountCode, gross: number): number {
  const base = Math.max(gross, 0);
  if (promo.minimumPurchase != null && base < promo.minimumPurchase) return 0;
  let d = promo.discountType === 'free' ? base
    : promo.discountType === 'fixed' ? promo.discountValue
    : (base * promo.discountValue) / 100;
  if (promo.maximumDiscount != null && promo.maximumDiscount > 0) d = Math.min(d, promo.maximumDiscount);
  return Math.round(Math.max(0, Math.min(d, base)) * 100) / 100;
}

/** The renewal request fields for a selection (the fee sent alongside must be the pre-discount fee). */
export function selectionRequestFields(sel: RewardDiscountSelection): { reward_pass_id?: number; coupon_code?: string } {
  if (!sel) return {};
  return sel.kind === 'pass' ? { reward_pass_id: sel.pass.id } : { coupon_code: sel.coupon.code };
}

interface Props {
  /** Member's MBR-... id or numeric db id. */
  memberId: string | number | null | undefined;
  value: RewardDiscountSelection;
  onChange: (sel: RewardDiscountSelection) => void;
  currency?: string;
}

/**
 * Renewal-time picker for a MEMBERSHIP_DISCOUNT Reward Pass, or a promotion / shareable
 * referral coupon code (a promotion's target audience is checked for this member).
 */
export function RewardDiscountPicker({ memberId, value, onChange, currency = '' }: Props) {
  const [passes, setPasses] = useState<ReferralReward[]>([]);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPasses([]);
    if (memberId == null || memberId === '') return;
    rewardService.getPasses(memberId, 'MEMBERSHIP')
      .then(setPasses)
      .catch(() => setPasses([])); // no passes to offer — never blocks the renewal
  }, [memberId]);

  const applyCode = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      // Only a numeric (database) id can be checked against a promotion's audience; redemption checks it anyway.
      const dbId = Number(memberId);
      const resolved = await discountCodeService.validate(code.trim(), Number.isInteger(dbId) && dbId > 0 ? { memberId: dbId } : {});
      onChange({ kind: 'coupon', coupon: resolved });
    } catch (e: any) {
      setError(e.message || 'Invalid code');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3">
      {passes.length > 0 && (
        <div>
          <Label>Reward Pass</Label>
          <Select
            value={value?.kind === 'pass' ? String(value.pass.id) : 'none'}
            onValueChange={(v) => {
              const pass = passes.find((p) => String(p.id) === v);
              onChange(pass ? { kind: 'pass', pass } : null);
              setError(null);
            }}
          >
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Don't use a Reward Pass</SelectItem>
              {passes.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{passLabel(p, currency)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Promo or Coupon Code</Label>
        {value?.kind === 'coupon' ? (
          <div className="mt-1 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>{value.coupon.code} applied</span>
            <Button variant="ghost" size="sm" onClick={() => { onChange(null); setCode(''); }}>Remove</Button>
          </div>
        ) : (
          <div className="mt-1 flex gap-2">
            <Input
              placeholder="Promotion or referral coupon code"
              value={code}
              disabled={value?.kind === 'pass'}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button variant="outline" onClick={applyCode} disabled={checking || !code.trim() || value?.kind === 'pass'}>
              {checking ? 'Checking…' : 'Apply'}
            </Button>
          </div>
        )}
        {value?.kind === 'pass' && (
          <p className="mt-1 text-xs text-muted-foreground">A Reward Pass is selected — only one discount can be used.</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
