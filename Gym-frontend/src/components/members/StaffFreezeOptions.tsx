import { useEffect, useState } from 'react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { AlertTriangle, Info } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { CurrencyGlyph } from '../../utils/currency';
import { membersService, type FreezeAllowance } from '../../utils/supabase/members-service';

/** The member's freeze allowance, reloaded whenever the member changes. */
export function useFreezeAllowance(memberId: string | number | null | undefined) {
  const [allowance, setAllowance] = useState<FreezeAllowance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (memberId == null || memberId === '') { setAllowance(null); return; }
    let cancelled = false;
    setLoading(true);
    membersService.getFreezeAllowance(memberId)
      .then((a) => { if (!cancelled) setAllowance(a); })
      .catch(() => { if (!cancelled) setAllowance(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  return { allowance, loading };
}

/** Days a staff freeze covers: the start date through the last frozen day, inclusive. */
export function staffFreezeDays(start: Date | undefined, lastDay: Date | undefined): number {
  return start && lastDay ? Math.max(0, differenceInCalendarDays(lastDay, start) + 1) : 0;
}

/** Whether a freeze of this length goes past the plan's limits. */
export function exceedsFreezeLimits(allowance: FreezeAllowance | null, days: number): boolean {
  return !!allowance && (!allowance.canFreeze || days > allowance.remainingDays);
}

/** Whether staff can submit this freeze: within the limits, or a manager overriding them. */
export function canSubmitStaffFreeze(allowance: FreezeAllowance | null, days: number, overrideLimits: boolean): boolean {
  return !exceedsFreezeLimits(allowance, days) || (overrideLimits && !!allowance?.canOverrideLimits);
}

interface StaffFreezeOptionsProps {
  allowance: FreezeAllowance | null;
  startDate: Date | undefined;
  /** The last day frozen. */
  endDate: Date | undefined;
  waiveCharge: boolean;
  onWaiveChargeChange: (waive: boolean) => void;
  overrideLimits: boolean;
  onOverrideLimitsChange: (override: boolean) => void;
}

/**
 * What a staff freeze will cost and whether the plan allows it: free vs extra days,
 * the charge billed when it ends (or waived), the plan's auto-unfreeze setting, and
 * — when it's over the plan's limits — a manager override.
 */
export function StaffFreezeOptions({
  allowance,
  startDate,
  endDate,
  waiveCharge,
  onWaiveChargeChange,
  overrideLimits,
  onOverrideLimitsChange,
}: StaffFreezeOptionsProps) {
  if (!allowance) return null;

  const days = staffFreezeDays(startDate, endDate);
  const freeDays = Math.min(days, allowance.freeDaysRemaining);
  const rate = Number(allowance.chargePerExtraDay || 0);
  const extraDays = rate > 0 ? days - freeDays : 0;
  const charge = extraDays * rate;
  const overLimits = days > 0 && exceedsFreezeLimits(allowance, days);
  const limitMessage = !allowance.canFreeze
    ? allowance.unavailableMessage
    : `This plan has ${allowance.remainingDays} freeze day${allowance.remainingDays === 1 ? '' : 's'} left — this freeze is ${days} days.`;

  return (
    <div className="space-y-3">
      {days > 0 && (
        <div className="rounded-lg border p-4 space-y-2 text-sm" style={{ borderColor: 'rgba(43, 122, 120, 0.3)' }}>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Days</span>
            <span className="font-bold text-gray-900">{days} days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Free Days</span>
            <span className="font-semibold text-green-600">{freeDays} of {allowance.freeDaysRemaining} left</span>
          </div>
          {extraDays > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Extra Days</span>
                <span className="font-semibold text-orange-600">{extraDays} days × <CurrencyGlyph /> {rate.toLocaleString()}</span>
              </div>
              <div className="flex items-start justify-between pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Charge for Extra Days</span>
                <div className="text-right">
                  <p className="font-bold" style={{ color: waiveCharge ? '#6B7280' : '#E63946', textDecoration: waiveCharge ? 'line-through' : undefined }}>
                    <CurrencyGlyph /> {charge.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {waiveCharge ? 'Waived' : 'Added to their balance when the freeze ends, for the days actually frozen'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="waive-freeze-charge" checked={waiveCharge} onCheckedChange={(v) => onWaiveChargeChange(v === true)} />
                <Label htmlFor="waive-freeze-charge" className="text-sm font-normal cursor-pointer">Waive the extra-day charge</Label>
              </div>
            </>
          )}
        </div>
      )}

      {overLimits && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{limitMessage}</span>
          </div>
          {allowance.canOverrideLimits ? (
            <div className="flex items-center gap-2">
              <Checkbox id="override-freeze-limits" checked={overrideLimits} onCheckedChange={(v) => onOverrideLimitsChange(v === true)} />
              <Label htmlFor="override-freeze-limits" className="text-sm font-normal cursor-pointer">Override the plan's freeze limits (manager)</Label>
            </div>
          ) : (
            <p className="text-xs">Only a manager can freeze past the plan's limits.</p>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg p-3 text-xs text-gray-600" style={{ border: '1px solid rgba(43, 122, 120, 0.2)' }}>
        <Info className="h-4 w-4 shrink-0" style={{ color: '#2B7A78' }} />
        <span>
          {allowance.autoUnfreeze
            ? <>This plan unfreezes automatically — the membership reactivates on {endDate ? format(addDays(endDate, 1), 'dd MMM yyyy') : 'the day after the end date'}.</>
            : <>This plan doesn't unfreeze automatically — unfreeze the membership when the member is back.</>}
          {' '}Change this in Manage Plans.
        </span>
      </div>
    </div>
  );
}
