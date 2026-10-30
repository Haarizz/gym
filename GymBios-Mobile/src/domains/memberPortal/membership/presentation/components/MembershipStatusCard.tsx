import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { formatDate, tOr } from '@/core/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { parsePlanTerm } from '../../domain/planTerm';

import type { BenefitInfo } from '../../domain/models';

// Deep-green gradient glass — matches reference `.plan-card`
const GREEN_START = 'rgba(27,90,76,0.82)';
const GREEN_END   = 'rgba(18,63,53,0.65)';

export interface MembershipDetails {
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  totalDays: number;
  autoRenew: boolean;
  /** Plan price in the gym's display currency; null when there is no plan. */
  price: number | null;
  /** Plan length from the backend, e.g. "1 month", "56 monthly", "8 sessions". */
  pricePeriod?: string;
  benefits: BenefitInfo[];
  freezeAvailable: boolean;
  freezeDaysAllowed: number;
  isFrozen: boolean;
  renewalOfferAvailable: boolean;
}

interface MembershipStatusCardProps {
  membership: MembershipDetails;
}

export function MembershipStatusCard({ membership }: MembershipStatusCardProps) {
  const { t } = useTranslation();
  if (membership.status === 'No Active Plan') {
    return (
      <View style={[styles.card, styles.inactiveCard]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.badgeLabel, styles.inactiveTextLight]}>{t('membership.status.currentSubscription')}</Text>
            <Text style={[styles.planTitle, styles.inactiveTextDark]}>{t('membership.status.noActiveSubscription')}</Text>
            <Text style={[styles.priceText, styles.inactiveTextLight]}>{t('membership.status.notAvailable')}</Text>
          </View>
          <View style={[styles.activeBadge, styles.activeBadgeInactive]}>
            <Text style={[styles.activeBadgeText, styles.activeBadgeTextInactive]}>{t('membership.status.inactiveBadge')}</Text>
          </View>
        </View>
        <Text style={styles.inactivePrompt}>
          {t('membership.status.inactivePrompt')}
        </Text>
      </View>
    );
  }

  const percentRemaining = Math.max(
    5,
    Math.min(100, Math.round((membership.daysRemaining / (membership.totalDays || 365)) * 100))
  );

  const notAvailable = t('membership.status.notAvailable');
  const formattedStart = membership.startDate ? formatDate(membership.startDate, 'PP') : notAvailable;
  const formattedEnd = membership.endDate ? formatDate(membership.endDate, 'PP') : notAvailable;
  const term = parsePlanTerm(membership.pricePeriod);
  const priceSuffix = term
    ? ` ${t(`membership.status.term.${term.unit}`, { count: term.count })}`
    : membership.pricePeriod
      ? ` · ${membership.pricePeriod}`
      : undefined;

  return (
    <View style={styles.card}>
      {/* Deep-green gradient glass background */}
      <LinearGradient
        colors={[GREEN_START, GREEN_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative radial blob — top right, matching reference .plan-card::before */}
      <View pointerEvents="none" style={styles.blobDecor} />
      {/* Top-edge highlight */}
      <View pointerEvents="none" style={styles.topHighlight} />

      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.badgeLabel}>{t('membership.status.currentSubscription')}</Text>
          <Text style={styles.planTitle} numberOfLines={2}>{membership.type || t('membership.status.unknownSubscription')}</Text>
          {membership.price != null && (
            <CurrencyValue
              style={styles.priceText}
              amount={membership.price}
              suffix={priceSuffix}
            />
          )}
        </View>
        {/* White-glass active pill — matching reference `.active-pill` */}
        <View style={styles.activeBadge}>
          <Feather name="check-circle" size={11} color="#FFFFFF" />
          <Text style={styles.activeBadgeText}>{tOr(`membership.status.values.${membership.status.toUpperCase()}`, membership.status.toUpperCase())}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{t('membership.status.progress')}</Text>
          <Text style={styles.daysRemainingText}>{t('membership.status.daysLeft', { count: membership.daysRemaining || 0 })}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentRemaining}%` as any }]} />
        </View>
      </View>

      {/* Dates & Auto Renew */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.footerLabel}>{t('membership.status.started')}</Text>
          <Text style={styles.footerValue}>{formattedStart}</Text>
        </View>
        <View style={styles.centerCol}>
          <Text style={styles.footerLabel}>{t('membership.status.autoRenew')}</Text>
          <Text style={styles.footerValue}>{t(membership.autoRenew ? 'membership.status.on' : 'membership.status.off')}</Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.footerLabel}>{t('membership.status.expires')}</Text>
          <Text style={styles.footerValue}>{formattedEnd}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four + 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: 'rgba(18,63,53,0.45)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    gap: Spacing.three,
    position: 'relative',
  },
  blobDecor: {
    position: 'absolute',
    top: -60,
    end: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  // Takes the leftover width so a long plan name wraps instead of pushing the pill off-card.
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  badgeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 2,
  },
  planTitle: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  priceText: {
    fontSize: TypographyScale.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '600',
  },
  // White-glass active pill — reference `.active-pill`
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeBadgeInactive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderColor: 'rgba(0,0,0,0.15)',
  },
  activeBadgeTextInactive: {
    color: BrandColors.textSecondary,
  },
  progressSection: {
    marginVertical: Spacing.one,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  daysRemainingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.full,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderColor: 'transparent',
  },
  footerLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
    fontWeight: '500',
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerCol: {
    alignItems: 'center',
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  // Inactive state
  inactiveCard: {
    backgroundColor: BrandColors.screenBackground,
    borderColor: BrandColors.neutral[200],
    shadowColor: 'transparent',
    elevation: 0,
  },
  inactiveTextDark: {
    color: '#111827',
  },
  inactiveTextLight: {
    color: '#6B7280',
  },
  inactivePrompt: {
    fontSize: TypographyScale.body,
    color: '#4B5563',
    lineHeight: 20,
    marginTop: Spacing.two,
  },
});
