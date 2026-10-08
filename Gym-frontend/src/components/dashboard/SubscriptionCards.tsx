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
  /** Gradient shades (Tailwind 500 / 600 / 700) — the old Quick Actions palette */
  shades: [string, string, string];
  /** Where clicking the card goes, and with what router state */
  section: string;
  params?: Record<string, any>;
  hint: string;
}

// Renewals and upgrades share the Members → Renewals & Upgrades screen
const CARDS: CardDef[] = [
  { key: 'new', title: 'Subscriptions\n(New)', icon: UserPlus, shades: ['#3b82f6', '#2563eb', '#1d4ed8'],
    section: 'members/add', hint: 'Add a new member' },
  { key: 'renew', title: 'Subscriptions\n(Renew)', icon: RotateCcw, shades: ['#22c55e', '#16a34a', '#15803d'],
    section: 'members', params: { tab: 'renewals' }, hint: 'Renew members who are due' },
  { key: 'upgrade', title: 'Subscriptions\n(Upgrades)', icon: TrendingUp, shades: ['#a855f7', '#9333ea', '#7e22ce'],
    section: 'members', params: { tab: 'renewals' }, hint: 'Upgrade a member to a higher plan' },
  { key: 'addons', title: 'Subscriptions\n(Add-Ons)', icon: Gift, shades: ['#f97316', '#ea580c', '#c2410c'],
    section: 'members', params: { tab: 'addons' }, hint: 'Sell an add-on' },
  { key: 'dayPass', title: 'Day-Pass', icon: Ticket, shades: ['#6366f1', '#4f46e5', '#4338ca'],
    section: 'check-in', params: { tab: 'daily' }, hint: 'Check in a walk-in / daily visitor' },
];

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
              style={{
                '--shade-500': card.shades[0],
                '--shade-600': card.shades[1],
                '--shade-700': card.shades[2],
              } as React.CSSProperties}
              onClick={() => onNavigate?.(card.section, card.params)}
              title={card.hint}
            >
              <div className={styles.top}>
                <span className={styles.icon}>
                  <card.icon size={18} />
                </span>
                {showValues ? (
                  <span className={styles.count} title={`${stats?.pendingCount ?? 0} pending of ${stats?.count ?? 0} sold`}>
                    {stats?.pendingCount ?? 0}
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
            </button>
          );
        })}
      </div>
    </section>
  );
}
