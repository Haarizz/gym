import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { AlertCircle, Calendar, Loader2, Snowflake } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { CurrencyGlyph } from '../../utils/currency';
import { membersService, type FreezeAllowance, type Member } from '../../utils/supabase/members-service';
import {
  StaffFreezeOptions, canSubmitStaffFreeze, freezeAddonRuleText, staffFreezeDays, freezeUntilForApi, useFreezeAllowance,
} from './StaffFreezeOptions';
import s from './MemberFreezeDialog.module.css';

type Tone = 'green' | 'blue' | 'red' | 'amber' | 'gray';

interface MemberFreezeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  /** The member's database id (what the freeze endpoints take). */
  memberDbId: string | number;
  /** The status shown on the profile (e.g. "expired" derived from the expiry date). */
  statusLabel: string;
  statusTone: Tone;
  /** Called after a successful freeze or unfreeze, to reload the profile. */
  onChanged: () => void;
}

const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const fmtDay = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy');
};

/**
 * Member 360 › Freeze / Unfreeze: the member, the plan's freeze limits and what's left,
 * the freeze dates, auto-unfreeze for this freeze, the charge preview and notes.
 */
export function MemberFreezeDialog({
  open, onOpenChange, member, memberDbId, statusLabel, statusTone, onChanged,
}: MemberFreezeDialogProps) {
  const isFrozen = member.membership_status === 'frozen';
  // Reloaded each time the dialog opens — the allowance changes with every freeze.
  const { allowance, loading } = useFreezeAllowance(open ? memberDbId : null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [waiveCharge, setWaiveCharge] = useState(false);
  const [overrideLimits, setOverrideLimits] = useState(false);
  const [autoUnfreeze, setAutoUnfreeze] = useState(true);
  const [saving, setSaving] = useState(false);

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return;
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
    setWaiveCharge(false);
    setOverrideLimits(false);
  }, [open]);

  // Auto-unfreeze starts at the plan's setting once the allowance arrives.
  useEffect(() => {
    if (open && allowance) setAutoUnfreeze(allowance.autoUnfreeze);
  }, [open, allowance]);

  const today = startOfDay(new Date());
  const membershipStart = (() => {
    const raw = member.membership_start_date || member.join_date;
    const d = raw ? new Date(raw) : null;
    return d && !isNaN(d.getTime()) ? startOfDay(d) : null;
  })();
  const effectiveStart = startDate ?? new Date();
  const earliestEnd = startDate ? startOfDay(startDate) : today;
  const days = staffFreezeDays(effectiveStart, endDate);
  const canSubmit = !!endDate && canSubmitStaffFreeze(allowance, days, overrideLimits) && !saving;

  const handleFreeze = async () => {
    if (!endDate) { toast.error('Please select a freeze end date'); return; }
    if (startDate) {
      const fStart = startOfDay(startDate);
      if (membershipStart && fStart < membershipStart) {
        toast.error('Freeze start date cannot be before the membership start date');
        return;
      }
      if (fStart < today) { toast.error('Freeze start date cannot be in the past'); return; }
      if (startOfDay(endDate) <= fStart) { toast.error('Freeze end date must be after the start date'); return; }
    }
    setSaving(true);
    try {
      await membersService.freezeMember(String(memberDbId), {
        freezeUntil: freezeUntilForApi(endDate),
        freezeStartDate: startDate ? format(startDate, 'yyyy-MM-dd') + 'T00:00:00Z' : undefined,
        reason: reason.trim() || undefined,
        overrideLimits: overrideLimits || undefined,
        waiveCharge: waiveCharge || undefined,
        autoUnfreeze,
      });
      toast.success('Membership frozen successfully', {
        description: autoUnfreeze
          ? `Reactivates automatically on ${format(addDays(endDate, 1), 'dd MMM yyyy')}`
          : 'Unfreeze the membership when the member is back',
      });
      onOpenChange(false);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to freeze membership');
    } finally {
      setSaving(false);
    }
  };

  const handleUnfreeze = async () => {
    setSaving(true);
    try {
      await membersService.unfreezeMember(String(memberDbId));
      toast.success('Membership unfrozen successfully');
      onOpenChange(false);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to unfreeze membership');
    } finally {
      setSaving(false);
    }
  };

  const planName = member.membership_plan || member.membership_type || '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={s.title}>
            <Snowflake />
            <span>Freeze / Unfreeze Membership</span>
          </DialogTitle>
          <DialogDescription>
            {isFrozen
              ? 'This membership is frozen. Unfreeze it to reactivate it now.'
              : "Temporarily pause this member's membership with plan-based limits"}
          </DialogDescription>
        </DialogHeader>

        <div className={s.body}>
          {/* Member */}
          <div className={s.memberCard}>
            <div>
              <p className={s.fieldLabel}>Member Name</p>
              <p className={s.fieldValue}>{member.name}</p>
            </div>
            <div>
              <p className={s.fieldLabel}>Member ID</p>
              <p className={`${s.fieldValue} ${s.mono}`}>{member.member_id || member.id}</p>
            </div>
            <div>
              <p className={s.fieldLabel}>Current Plan</p>
              <p className={`${s.fieldValue} ${s.accent}`}>{planName}</p>
            </div>
            <div>
              <p className={s.fieldLabel}>Status</p>
              <span className={s.badge} data-tone={statusTone}>{statusLabel.replace(/_/g, ' ') || '—'}</span>
            </div>
          </div>

          {/* Plan limits and what's left this period */}
          <FreezeLimits allowance={allowance} loading={loading} />

          {isFrozen ? (
            <div className={s.frozen}>
              <div>
                <p className={s.fieldLabel}>Frozen since</p>
                <p className={s.fieldValue}>{fmtDay(member.freeze_start_date)}</p>
              </div>
              <div>
                <p className={s.fieldLabel}>Frozen until</p>
                <p className={s.fieldValue}>
                  {member.freeze_end_date
                    ? fmtDay(member.freeze_end_date)
                    : 'Until unfrozen'}
                </p>
              </div>
              {member.freeze_reason && (
                <div className={s.full}>
                  <p className={s.fieldLabel}>Reason</p>
                  <p className={s.fieldValue}>{member.freeze_reason}</p>
                </div>
              )}
              <p className={s.full}>
                {freezeAddonRuleText(member.freeze_pauses_addons !== false, member.freeze_pauses_facilities !== false)}
                {' '}Unfreezing now moves the expiry out by the days actually frozen; extra days beyond the free
                allowance are billed then.
              </p>
            </div>
          ) : (
            <>
              <div className={s.dates}>
                <div className={s.field}>
                  <Label>Freeze Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={s.dateButton}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd MMM yyyy') : <span className={s.placeholder}>Today</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          setStartDate(d);
                          if (d && endDate && startOfDay(endDate) < startOfDay(d)) setEndDate(undefined);
                        }}
                        disabled={(date) => date < today || (membershipStart != null && date < membershipStart)}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className={s.hint}>Leave empty to start today</span>
                </div>

                <div className={s.field}>
                  <Label>Freeze End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={s.dateButton}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd MMM yyyy') : <span className={s.placeholder}>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        defaultMonth={endDate ?? earliestEnd}
                        disabled={(date) => date <= earliestEnd}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className={s.hint}>The day the membership is active again (e.g. 3 → 13 Nov = 10 days)</span>
                </div>
              </div>

              {/* Days, free vs extra, the charge, and the manager override when over the limits */}
              <StaffFreezeOptions
                allowance={allowance}
                startDate={effectiveStart}
                endDate={endDate}
                waiveCharge={waiveCharge}
                onWaiveChargeChange={setWaiveCharge}
                overrideLimits={overrideLimits}
                onOverrideLimitsChange={setOverrideLimits}
                showNotes={false}
              />

              <div className={s.toggleRow}>
                <div>
                  <Label htmlFor="freeze-auto-unfreeze" className={s.toggleTitle}>Auto Unfreeze on End Date</Label>
                  <p className={s.toggleText}>
                    {autoUnfreeze
                      ? <>Automatically reactivate membership when the freeze period ends{endDate ? ` — on ${format(addDays(endDate, 1), 'dd MMM yyyy')}` : ''}.</>
                      : 'Stays frozen after the end date until someone unfreezes it.'}
                    {allowance && autoUnfreeze !== allowance.autoUnfreeze && ' (Plan default is '
                      + (allowance.autoUnfreeze ? 'on' : 'off') + '.)'}
                  </p>
                </div>
                <Switch id="freeze-auto-unfreeze" checked={autoUnfreeze} onCheckedChange={setAutoUnfreeze} />
              </div>

              <div className={s.field}>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add reason or notes for this freeze..."
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {allowance && <FreezePolicyInfo allowance={allowance} />}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          {isFrozen ? (
            <Button className="btn-primary" disabled={saving} onClick={handleUnfreeze}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Snowflake className="h-4 w-4 mr-2" />}
              Unfreeze Membership
            </Button>
          ) : (
            <Button className={s.danger} disabled={!canSubmit} onClick={handleFreeze}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Snowflake className="h-4 w-4 mr-2" />}
              Freeze Membership
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FreezeLimits({ allowance, loading }: { allowance: FreezeAllowance | null; loading: boolean }) {
  return (
    <div className={s.limits}>
      <p className={s.limitsTitle}>Freeze Policy Limits</p>
      {!allowance ? (
        <p className={s.loading}>
          {loading ? <><Loader2 /> Loading the plan's freeze limits…</> : "Couldn't load this plan's freeze limits."}
        </p>
      ) : (
        <>
          <div className={s.limitsGrid}>
            <div>
              <p className={s.fieldLabel}>Maximum Freeze Days</p>
              <p className={s.limitValue}>{plural(allowance.maxDays, 'day')}</p>
            </div>
            <div>
              <p className={s.fieldLabel}>Days Used</p>
              <p className={s.limitValue} data-tone="orange">{plural(allowance.usedDays, 'day')}</p>
            </div>
            <div>
              <p className={s.fieldLabel}>Freeze Occurrences Allowed</p>
              <p className={s.limitValue}>
                {allowance.maxOccurrences != null ? plural(allowance.maxOccurrences, 'time') : 'No limit'}
              </p>
            </div>
            <div>
              <p className={s.fieldLabel}>Freezes Used</p>
              <p className={s.limitValue} data-tone="orange">{plural(allowance.usedOccurrences, 'time')}</p>
            </div>
          </div>
          <div className={s.limitsFoot}>
            <p className={s.fieldLabel}>Balance Days Remaining</p>
            <p className={s.balance} data-tone={allowance.remainingDays > 0 ? 'green' : 'red'}>
              {plural(allowance.remainingDays, 'day')}
              {allowance.remainingOccurrences != null && ` · ${plural(allowance.remainingOccurrences, 'freeze')} left`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function FreezePolicyInfo({ allowance }: { allowance: FreezeAllowance }) {
  const rate = Number(allowance.chargePerExtraDay || 0);
  return (
    <div className={s.info}>
      <AlertCircle />
      <div>
        <p className={s.infoTitle}>Freeze Policy Information</p>
        <ul className={s.infoList}>
          <li>
            {allowance.maxDays > 0
              ? `This plan allows up to ${plural(allowance.maxDays, 'day')} of freeze in each membership period`
              : "This plan doesn't allow freezing — only a manager can override it"}
          </li>
          {rate > 0 ? (
            <>
              <li>
                {allowance.freeDays > 0
                  ? `The first ${plural(allowance.freeDays, 'day')} are free (${allowance.freeDaysRemaining} left this period)`
                  : 'No free freeze days on this plan'}
              </li>
              <li>
                Additional days are charged at <CurrencyGlyph /> {rate.toLocaleString()}/day, billed when the freeze ends
              </li>
            </>
          ) : (
            <li>No charges for freeze days within the limit</li>
          )}
          <li>
            {allowance.maxOccurrences != null
              ? `Member can freeze the membership up to ${plural(allowance.maxOccurrences, 'time')} during the plan period`
              : 'No limit on how many times the member can freeze during the plan period'}
          </li>
          <li>{freezeAddonRuleText(allowance.pausesAddons !== false, allowance.pausesFacilities !== false)}</li>
        </ul>
        <p style={{ marginTop: '0.375rem', opacity: 0.8 }}>
          Limits and charges are set in Manage Plans; the add-on rule in Branch Settings.
        </p>
      </div>
    </div>
  );
}
