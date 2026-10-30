import React, { useEffect, useState } from 'react';
import { Gift, RotateCcw, Ticket, TrendingUp, UserPlus, type LucideIcon } from 'lucide-react';
import { CurrencyValue } from '../../utils/currency';
import {
  dashboardService,
  type SubscriptionCardKey,
  type SubscriptionSummary,
} from '../../utils/supabase/dashboard-service';
import styles from './SubscriptionCards.module.css';

interface CardDef {
  key: SubscriptionCardKey;
  title: string;
  icon: LucideIcon;
  /** Card gradient, deep → bright (white text stays readable on both ends) */
  colors: [string, string];
  /** Where clicking the card goes, and with what router state */
  section: string;
  params?: Record<string, any>;
  hint: string;
}

// Renewals and upgrades share the Members → Renewals & Upgrades screen
const CARDS: CardDef[] = [
  { key: 'new', title: 'Subscriptions\n(New)', icon: UserPlus, colors: ['#0f766e', '#0d9488'],
    section: 'members', params: { tab: 'new-members' }, hint: 'See the members who joined in this period' },
  { key: 'renew', title: 'Subscriptions\n(Renew)', icon: RotateCcw, colors: ['#1e40af', '#2563eb'],
    section: 'members', params: { tab: 'renewals' }, hint: 'Renew members who are due' },
  { key: 'upgrade', title: 'Subscriptions\n(Upgrades)', icon: TrendingUp, colors: ['#86198f', '#c026d3'],
    section: 'members', params: { tab: 'renewals' }, hint: 'Upgrade a member to a higher plan' },
  { key: 'addons', title: 'Subscriptions\n(Add-Ons)', icon: Gift, colors: ['#be123c', '#ea580c'],
    section: 'members', params: { tab: 'addons' }, hint: 'Sell an add-on' },
  { key: 'dayPass', title: 'Day-Pass', icon: Ticket, colors: ['#3730a3', '#6d28d9'],
    section: 'check-in', params: { tab: 'daily' }, hint: 'Check in a walk-in / daily visitor' },
];

// The New Members tab opens on the same window as the dashboard period.
const JOINED_PRESET: Record<string, string> = { today: 'today', week: 'this-week', month: 'this-month', lastMonth: 'last-month' };

interface SubscriptionCardsProps {
  /** Overview period: today | week | month | lastMonth */
  period: string;
  periodLabel: string;
  /** Bumped by the parent's Refresh button to re-fetch */
  refreshKey?: number;
  onNavigate?: (section: string, params?: Record<string, any>) => void;
}

export function SubscriptionCards({ period, periodLabel, refreshKey = 0, onNavigate }: SubscriptionCardsProps) {
  const [data, setData] = useState<SubscriptionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);
    dashboardService.getSubscriptionSummary(period)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) setData(res.data);
        else setError(true);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [period, refreshKey]);

  const heading = period === 'today' ? "Today's Subscriptions & Passes" : `Subscriptions & Passes · ${periodLabel}`;

  return (
    <section className={styles.panel}>
      <h3 className={styles.heading}>{heading}</h3>
      {error && !isLoading && (
        <p className={styles.error}>Couldn't load subscription figures — use Refresh to try again.</p>
      )}
      <div className={styles.grid}>
        {CARDS.map((card) => {
          const stats = data?.cards.find((c) => c.key === card.key);
          const showValues = !isLoading && !error;
          return (
            <button
              key={card.key}
              type="button"
              className={styles.card}
              style={{ '--c1': card.colors[0], '--c2': card.colors[1] } as React.CSSProperties}
              onClick={() => onNavigate?.(card.section, card.key === 'new'
                ? { ...card.params, joinedPreset: JOINED_PRESET[period] ?? 'today' }
                : card.params)}
              title={card.hint}
            >
              <div className={styles.top}>
                <span className={styles.icon}>
                  <card.icon size={18} />
                </span>
                {showValues ? (
                  // BG_103: the badge is how many were sold in the period — it used to show
                  // only the unpaid ones, so a fully paid sale left it at 0.
                  <span className={styles.count} title={`${stats?.count ?? 0} sold · ${stats?.pendingCount ?? 0} pending payment`}>
                    {stats?.count ?? 0}
                  </span>
                ) : (
                  <span className={`${styles.skeleton} ${styles.skeletonCount}`} />
                )}
              </div>
              <p className={styles.title}>{card.title}</p>
              <p className={styles.label}>Collected</p>
              {showValues ? (
                <p className={styles.amount}>
                  <CurrencyValue amount={Number(stats?.collected ?? 0)} options={{ maximumFractionDigits: 2 }} />
                </p>
              ) : (
                <span className={`${styles.skeleton} ${styles.skeletonAmount}`} />
              )}
              {showValues && (stats?.pendingCount ?? 0) > 0 && (
                <p className={styles.pending}>
                  {stats!.pendingCount} pending ·{' '}
                  <CurrencyValue amount={Number(stats!.pendingAmount)} options={{ maximumFractionDigits: 2 }} /> due
                </p>
              )}
            </button>
          );
        })}
      </div>
      {data && !isLoading && !error && (
        <p className={styles.footer}>
          Other income (settlements, POS, bookings):{' '}
          <strong><CurrencyValue amount={Number(data.otherIncome ?? 0)} options={{ maximumFractionDigits: 2 }} /></strong>
          {' · '}Total collected:{' '}
          <strong><CurrencyValue amount={Number(data.totalCollection ?? 0)} options={{ maximumFractionDigits: 2 }} /></strong>
        </p>
      )}
    </section>
  );
}
