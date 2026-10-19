import React from 'react';
import { format, parseISO } from 'date-fns';
import { Instagram, Facebook, Youtube, Globe, MessageCircle, Store, Megaphone } from 'lucide-react';
import styles from './campaigns.module.css';
import type {
  CampaignObjective, CampaignPhase, CampaignPlatform, CampaignStatus, SpendCategory,
} from '../../utils/supabase/marketing-campaign-service';

export const PLATFORM_LABELS: Record<CampaignPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  meta: 'Meta (FB + IG)',
  google: 'Google Ads',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  offline: 'Offline / Flyers',
  other: 'Other',
};

const PLATFORM_TONES: Record<CampaignPlatform, string> = {
  instagram: 'rose', facebook: 'blue', meta: 'violet', google: 'amber',
  youtube: 'red', whatsapp: 'green', offline: 'gray', other: 'teal',
};

const PLATFORM_ICONS: Record<CampaignPlatform, React.ComponentType<{ className?: string; size?: number }>> = {
  instagram: Instagram, facebook: Facebook, meta: Megaphone, google: Globe,
  youtube: Youtube, whatsapp: MessageCircle, offline: Store, other: Megaphone,
};

export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  leads: 'Generate leads',
  trials: 'Free trials',
  awareness: 'Brand awareness',
  renewals: 'Win back / renewals',
  event: 'Event / challenge',
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft', active: 'Active', paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled',
};

export const PHASE_LABELS: Record<CampaignPhase, string> = {
  draft: 'Draft', active: 'Active', scheduled: 'Scheduled', live: 'Live', ended: 'Ended',
  paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled',
};

const PHASE_TONES: Record<CampaignPhase, string> = {
  draft: 'gray', active: 'green', scheduled: 'blue', live: 'green', ended: 'amber',
  paused: 'amber', completed: 'teal', cancelled: 'red',
};

export const SPEND_CATEGORY_LABELS: Record<SpendCategory, string> = {
  ad_spend: 'Ad spend',
  boosting: 'Post boosting',
  creative: 'Creatives / design',
  influencer: 'Influencer',
  printing: 'Printing / flyers',
  team_time: 'Team time only',
  other: 'Other',
};

export const LEAD_STATUS_TONES: Record<string, string> = {
  new: 'blue', contacted: 'violet', 'follow-up': 'amber', follow_up: 'amber', converted: 'green', lost: 'gray',
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', 'follow-up': 'Follow-up', follow_up: 'Follow-up', converted: 'Converted', lost: 'Lost',
};

export function PlatformPill({ platform }: { platform: CampaignPlatform }) {
  const Icon = PLATFORM_ICONS[platform] ?? Megaphone;
  return (
    <span className={styles.platform} data-tone={PLATFORM_TONES[platform] ?? 'teal'}>
      <Icon size={12} />
      {PLATFORM_LABELS[platform] ?? platform}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: CampaignPhase }) {
  return (
    <span className={styles.phase} data-tone={PHASE_TONES[phase] ?? 'gray'} data-live={phase === 'live'}>
      <span className={styles.phaseDot} />
      {PHASE_LABELS[phase] ?? phase}
    </span>
  );
}

export function LeadStatusPill({ status }: { status?: string }) {
  const s = status || 'new';
  return (
    <span className={styles.statusPill} data-tone={LEAD_STATUS_TONES[s] ?? 'gray'}>
      {LEAD_STATUS_LABELS[s] ?? s}
    </span>
  );
}

/** Bar with a tone; pct is clamped to 0–100 for the fill. */
export function Meter({ pct, tone = 'teal' }: { pct: number | null | undefined; tone?: string }) {
  const width = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className={styles.bar} data-tone={tone}>
      <div className={styles.barFill} style={{ width: `${width}%` }} />
    </div>
  );
}

/** "2026-10-19" -> local date (parseISO keeps it on that calendar day). */
export function fmtDate(d?: string | null, pattern = 'dd MMM yyyy'): string {
  if (!d) return '—';
  try { return format(parseISO(d), pattern); } catch { return d; }
}

export function fmtDateTime(d?: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy, HH:mm'); } catch { return d; }
}

export function fmtNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** Human line for where a campaign is in its run. */
export function timelineText(c: { phase: CampaignPhase; startDate: string; endDate: string; durationDays: number; daysElapsed: number; daysRemaining: number }): string {
  const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseISO(c.startDate);
  const end = parseISO(c.endDate);
  if (today < start) {
    const until = Math.round((start.getTime() - today.getTime()) / 86400000);
    return until === 1 ? `Starts tomorrow · runs ${days(c.durationDays)}` : `Starts in ${days(until)} · runs ${days(c.durationDays)}`;
  }
  if (today > end) {
    const ago = Math.round((today.getTime() - end.getTime()) / 86400000);
    return `Ran ${days(c.durationDays)} · ended ${ago === 1 ? 'yesterday' : `${days(ago)} ago`}`;
  }
  return `Day ${c.daysElapsed} of ${c.durationDays} · ${c.daysRemaining === 1 ? 'last day' : `${days(c.daysRemaining)} left`}`;
}

/** Lowercase, hyphenated tracking code suggestion from a campaign name. */
export function suggestTrackingCode(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
