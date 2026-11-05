import React from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator, Share } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CurrencyValue, formatCurrency } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts';
import { toast } from '@/shared/components/Toasts/toastStore';
import type { createUseRestoreSession } from '@/domains/auth/presentation/hooks/useAuthFlow';
import { usePromotions, usePromotionImpact } from '@/domains/promotions/hooks/usePromotions';
import type { PromotionCampaignResponse } from '@/domains/promotions/domain/PromotionCampaign';
import { useReferrals } from '@/domains/referrals/hooks/useReferrals';
import { useMembershipPlans } from '@/domains/membershipPlans';
import type { MembershipPlan } from '@/domains/membershipPlans';
import { formatCompactCurrency, formatCount } from '@/domains/dashboard/utils/adminDashboardFormat';
import { getIntlLocale, translateValue } from '@/core/i18n/format';

// Local yyyy-MM-dd, matching the date-only format the backend sends.
function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

// The backend refreshes date-driven statuses on read, but a cached list can
// still outlive an end date (e.g. the app left open past midnight), so the
// badge is derived from the dates rather than trusted blindly.
function getEffectiveStatus(deal: PromotionCampaignResponse, today: string): string {
  const status = (deal.status || '').toLowerCase();
  if (status === 'draft' || status === 'paused') return status;
  if (deal.endDate && deal.endDate.slice(0, 10) < today) return 'expired';
  if (deal.startDate && deal.startDate.slice(0, 10) > today) return 'scheduled';
  return status;
}

// A plan's offer is live when the server says so for today and the plan itself
// is sellable. The end-date check covers a cached list that outlived midnight.
function isPlanOfferRunning(plan: MembershipPlan, today: string): boolean {
  if ((plan.status || '').toUpperCase() !== 'ACTIVE') return false;
  if (!plan.offerActive || !(plan.offerDiscountAmount > 0)) return false;
  return !plan.offerEndDate || plan.offerEndDate.slice(0, 10) >= today;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; fg: string }> = {
  active: { bg: '#dcfce7', border: '#bbf7d0', fg: '#15803d' },
  scheduled: { bg: '#dbeafe', border: '#bfdbfe', fg: '#1d4ed8' },
  paused: { bg: '#fef3c7', border: '#fde68a', fg: '#b45309' },
  expired: { bg: '#fee2e2', border: '#fecaca', fg: '#b91c1c' },
  draft: { bg: '#f3f4f6', border: '#e5e7eb', fg: '#4b5563' },
};

export function createAdminDealsScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminDealsScreen() {
    useRestoreSession();
    const router = useRouter();
    const { t } = useTranslation();

    const { data: activePromotions, isLoading: isLoadingActive, error: activeError } = usePromotions('active');
    const { data: allPromotions, isLoading: isLoadingAll } = usePromotions();
    const { data: referralPage, isLoading: isLoadingReferrals, error: referralsError } = useReferrals();
    const { data: impact, isLoading: isLoadingImpact, error: impactError } = usePromotionImpact();
    const { plans, loading: isLoadingPlans, error: plansError } = useMembershipPlans();

    const handleCreateOffer = () => {
      router.push('/(admin)/promotions/create');
    };

    const today = todayIso();
    const activeDeals = (activePromotions || []).filter(
      (deal) => getEffectiveStatus(deal, today) === 'active',
    );
    const planOffers = plans.filter((plan) => isPlanOfferRunning(plan, today));
    const isLoadingOffers = isLoadingActive || (isLoadingPlans && plans.length === 0);
    const activeOfferCount = activeDeals.length + planOffers.length;

    const handleCopy = async (code: string) => {
      try {
        await Clipboard.setStringAsync(code);
        toast.success(t('crm.copiedPromoCode', { code }));
      } catch {
        toast.error(t('crm.failedCopyPromoCode'));
      }
    };

    const handleShare = (deal: PromotionCampaignResponse, discountText: string) => {
      if (!deal.code) return;
      Share.share({
        message: t('crm.shareMessage', { name: deal.name, code: deal.code, discount: discountText }),
      }).catch(() => {});
    };
    const totalRedemptions = (allPromotions || []).reduce((sum, deal) => sum + (deal.usageCount || 0), 0);
    const referralsList = (referralPage?.referrals || []).slice(0, REFERRAL_PREVIEW_COUNT);

    return (
      <ScreenLayout scrollable>
        <View style={styles.container}>
          {/* ── Primary action ──────────────────────────────────── */}
          <View style={styles.heroBanner}>
            <View style={styles.heroTextGroup}>
              <Text style={styles.heroTitle}>{t('crm.title')}</Text>
              <Text style={styles.heroSubtitle}>{t('crm.subtitle')}</Text>
            </View>
            <Pressable
              onPress={handleCreateOffer}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Feather name="plus-circle" size={16} color={BrandColors.teal} />
              <Text style={styles.heroButtonText}>{t('crm.createNewOffer')}</Text>
            </Pressable>
          </View>

          {/* ── Offer stats ─────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <StatTile
              icon="tag"
              color={BrandColors.teal}
              label={t('crm.activeOffers')}
              value={isLoadingOffers ? '–' : String(activeOfferCount)}
            />
            <StatTile
              icon="check-circle"
              color="#d97706"
              label={t('crm.totalRedemptions')}
              value={isLoadingAll ? '–' : formatCount(totalRedemptions)}
            />
          </View>

          {/* ── This month's impact ─────────────────────────────── */}
          <Section title={t('crm.thisMonthsImpact')}>
            {isLoadingImpact ? (
              <ActivityIndicator size="small" color={BrandColors.teal} />
            ) : impactError ? (
              <InlineMessage tone="error" text={t('crm.failedLoadImpact')} />
            ) : (
              <View style={styles.statsRow}>
                <StatTile
                  icon="trending-up"
                  color="#16a34a"
                  label={t('crm.revenueFromDeals')}
                  value={formatCompactCurrency(impact?.revenueFromDeals ?? 0)}
                />
                <StatTile
                  icon="user-plus"
                  color="#8b5cf6"
                  label={t('crm.newMembers')}
                  value={formatCount(impact?.newMembers ?? 0)}
                />
              </View>
            )}
          </Section>

          {/* ── Active offers ───────────────────────────────────── */}
          <Section
            title={t('crm.activeOffers')}
            actionLabel={t('crm.viewAll')}
            onAction={() => router.push('/(admin)/promotions')}
          >
            {isLoadingOffers ? (
              <ActivityIndicator size="small" color={BrandColors.teal} />
            ) : activeError && plansError ? (
              <InlineMessage tone="error" text={t('crm.failedLoadOffers')} />
            ) : activeOfferCount === 0 ? (
              <InlineMessage text={t('crm.noActiveOffers')} />
            ) : (
              <View style={styles.list}>
                {activeError ? <InlineMessage tone="error" text={t('crm.failedLoadPromoOffers')} /> : null}
                {plansError ? <InlineMessage tone="error" text={t('crm.failedLoadPlanOffers')} /> : null}

                {planOffers.map((plan) => (
                  <Pressable
                    key={`plan-${plan.id}`}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                    onPress={() => router.push(`/(admin)/membership-plans/edit/${plan.id}` as any)}
                    accessibilityRole="button"
                  >
                    <View style={styles.offerTop}>
                      <DiscountTicket
                        percent={plan.offerType === 'percentage' ? (plan.offerValue ?? 0) : undefined}
                        amount={plan.offerDiscountAmount}
                      />
                      <View style={styles.offerInfo}>
                        <View style={styles.offerTitleRow}>
                          <Text style={styles.offerTitle} numberOfLines={1}>
                            {plan.offerLabel || t('crm.planOfferSuffix', { name: plan.name })}
                          </Text>
                          <StatusChip label={t('crm.planOffer')} colors={STATUS_COLORS.scheduled} />
                        </View>
                        <Text style={styles.offerMeta} numberOfLines={1}>
                          {t('crm.plan')} {plan.name}
                        </Text>
                        <Text style={styles.offerMeta} numberOfLines={1}>
                          {t('crm.validUntil')} {formatDate(plan.offerEndDate) ?? t('crm.noExpiry')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.offerFooter}>
                      <View style={styles.autoApply}>
                        <Feather name="zap" size={13} color={BrandColors.teal} />
                        <Text style={styles.autoApplyText} numberOfLines={1}>{t('crm.autoNoCode')}</Text>
                      </View>
                      <Text style={styles.priceText} numberOfLines={1}>
                        <Text style={styles.strikePrice}><CurrencyValue amount={plan.price} /></Text>
                        {'  '}
                        <CurrencyValue amount={plan.effectivePrice} />
                      </Text>
                    </View>
                  </Pressable>
                ))}

                {activeDeals.map((deal) => {
                  // Plain text for the share message; the card itself shows the currency glyph.
                  const discountText = deal.discountType === 'percentage'
                    ? `${deal.discountValue}% OFF`
                    : `${formatCurrency(deal.discountValue)} OFF`;
                  const status = getEffectiveStatus(deal, today);
                  const statusColor = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
                  const usageCount = deal.usageCount || 0;
                  const usagePercent = deal.usageLimit
                    ? Math.min((usageCount / deal.usageLimit) * 100, 100)
                    : 0;
                  const meta = [
                    `${t('crm.validUntil')} ${formatDate(deal.endDate) ?? t('crm.noExpiry')}`,
                    deal.branchName || t('crm.unknownBranch'),
                  ].join('  ·  ');

                  return (
                    <View key={deal.id} style={styles.card}>
                      <View style={styles.offerTop}>
                        <DiscountTicket
                          percent={deal.discountType === 'percentage' ? deal.discountValue : undefined}
                          amount={deal.discountValue}
                        />
                        <View style={styles.offerInfo}>
                          <View style={styles.offerTitleRow}>
                            <Text style={styles.offerTitle} numberOfLines={1}>{deal.name}</Text>
                            <StatusChip
                              label={translateValue('status', status, status).toUpperCase()}
                              colors={statusColor}
                            />
                          </View>
                          <Text style={styles.offerMeta} numberOfLines={2}>{meta}</Text>
                        </View>
                      </View>

                      {/* Promo code */}
                      <View style={styles.codeRow}>
                        <View style={styles.codeInfo}>
                          <Text style={styles.codeLabel}>{t('crm.promoCode')}</Text>
                          <Text style={styles.codeValue} numberOfLines={1}>{deal.code || 'N/A'}</Text>
                        </View>
                        <Pressable
                          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !deal.code && styles.disabled]}
                          disabled={!deal.code}
                          onPress={() => deal.code && handleCopy(deal.code)}
                          accessibilityRole="button"
                          hitSlop={4}
                        >
                          <Feather name="copy" size={16} color={BrandColors.teal} />
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.iconButton, styles.iconButtonPrimary, pressed && styles.pressed, !deal.code && styles.disabled]}
                          disabled={!deal.code}
                          onPress={() => handleShare(deal, discountText)}
                          accessibilityRole="button"
                          hitSlop={4}
                        >
                          <Feather name="share-2" size={16} color="#ffffff" />
                        </Pressable>
                      </View>

                      {/* Usage */}
                      <View style={styles.usageRow}>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${usagePercent}%` }]} />
                        </View>
                        <Text style={styles.usageText}>
                          {t('crm.usage')} {usageCount} / {deal.usageLimit || '∞'}
                        </Text>
                      </View>
                      {!deal.usageLimit ? (
                        <Text style={styles.usageHint}>{t('crm.noUsageLimit')}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </Section>

          {/* ── Referral codes ──────────────────────────────────── */}
          <Section
            title={t('crm.referralCodes')}
            actionLabel={t('crm.viewAll')}
            onAction={() => router.push('/(admin)/referrals')}
          >
            {isLoadingReferrals ? (
              <ActivityIndicator size="small" color={BrandColors.teal} />
            ) : referralsError ? (
              <InlineMessage tone="error" text={t('crm.failedLoadReferrals')} />
            ) : referralsList.length === 0 ? (
              <InlineMessage text={t('crm.noReferralCodes')} />
            ) : (
              <View style={[styles.card, styles.listCard]}>
                {referralsList.map((referral, index) => (
                  <View
                    key={referral.id}
                    style={[styles.referralRow, index < referralsList.length - 1 && styles.rowDivider]}
                  >
                    <View style={styles.referralIcon}>
                      <Feather name="gift" size={16} color="#d97706" />
                    </View>
                    <View style={styles.referralInfo}>
                      <Text style={styles.referralCode} numberOfLines={1}>{referral.referralCode || '—'}</Text>
                      <Text style={styles.offerMeta} numberOfLines={1}>
                        {referral.referrerName || t('crm.unknown')}
                        {referral.rewardAmount !== undefined && referral.rewardAmount !== null ? (
                          <>
                            {'  ·  '}
                            <Text style={styles.rewardText}><CurrencyValue amount={referral.rewardAmount} /></Text>
                          </>
                        ) : null}
                      </Text>
                    </View>
                    <View style={styles.referralRight}>
                      <StatusChip
                        label={translateValue('status', referral.status, t('crm.unknown'))}
                        colors={referralStatusColors(referral.status)}
                      />
                      <Text style={styles.referralDate}>{formatDate(referral.date) ?? '—'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </View>
      </ScreenLayout>
    );
  };
}

// ── Local building blocks ──────────────────────────────────────────────────

const REFERRAL_PREVIEW_COUNT = 5;

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

function referralStatusColors(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (['completed', 'converted', 'rewarded', 'paid', 'active'].includes(s)) return STATUS_COLORS.active;
  if (['pending', 'invited'].includes(s)) return STATUS_COLORS.paused;
  if (['expired', 'rejected', 'cancelled', 'canceled'].includes(s)) return STATUS_COLORS.expired;
  return STATUS_COLORS.draft;
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [styles.viewAllBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.viewAllText}>{actionLabel}</Text>
            <Feather name="arrow-right" size={13} color={BrandColors.teal} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function StatTile({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: `${color}1f` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

/** Coupon-style discount block: "5%" or the currency amount, with "OFF" underneath. */
function DiscountTicket({ percent, amount }: { percent?: number; amount: number }) {
  return (
    <View style={styles.ticket}>
      <Text style={styles.ticketValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {percent !== undefined ? `${percent}%` : <CurrencyValue amount={amount} />}
      </Text>
      <Text style={styles.ticketOff}>OFF</Text>
    </View>
  );
}

function StatusChip({ label, colors }: { label: string; colors: { bg: string; border: string; fg: string } }) {
  return (
    <View style={[styles.statusChip, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.statusChipText, { color: colors.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function InlineMessage({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }) {
  return (
    <View style={[styles.inlineMessage, tone === 'error' && styles.inlineMessageError]}>
      <Feather
        name={tone === 'error' ? 'alert-circle' : 'inbox'}
        size={16}
        color={tone === 'error' ? '#b91c1c' : '#6b7280'}
      />
      <Text style={[styles.inlineMessageText, tone === 'error' && { color: '#b91c1c' }]}>{text}</Text>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },

  // Hero
  heroBanner: {
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.md,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroTextGroup: {
    gap: Spacing.one,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 17,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    paddingVertical: Spacing.md - 2,
    borderRadius: Radius.full,
  },
  heroButtonText: {
    color: BrandColors.teal,
    fontSize: 14,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...CARD_SHADOW,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Sections
  section: {
    gap: Spacing.two + 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.screenBackgroundAlt,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
  },
  viewAllText: {
    color: BrandColors.teal,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.md,
    ...CARD_SHADOW,
  },

  // Offer card
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ticket: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#f5c742',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  ticketValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#b45309',
  },
  ticketOff: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#b45309',
  },
  offerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  offerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  offerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  offerMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#f6faf9',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#e2efec',
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.two,
  },
  codeInfo: {
    flex: 1,
    minWidth: 0,
  },
  codeLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#111827',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2efec',
  },
  iconButtonPrimary: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BrandColors.teal,
    borderRadius: 3,
  },
  usageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  usageHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: -Spacing.two,
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  autoApply: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoApplyText: {
    flexShrink: 1,
    fontSize: 12,
    color: BrandColors.teal,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  strikePrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },

  // Referrals
  listCard: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  referralIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  referralCode: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#111827',
  },
  rewardText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  referralRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  referralDate: {
    fontSize: 11,
    color: '#6b7280',
  },

  // Empty / error
  inlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    ...CARD_SHADOW,
  },
  inlineMessageError: {
    backgroundColor: '#fef2f2',
  },
  inlineMessageText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
  },
});
