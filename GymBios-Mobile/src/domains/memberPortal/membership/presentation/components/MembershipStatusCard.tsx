import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

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
  price: string;
  benefits: string[];
  freezeAvailable: boolean;
  freezeDaysAllowed: number;
  isFrozen: boolean;
  renewalOfferAvailable: boolean;
}

interface MembershipStatusCardProps {
  membership: MembershipDetails;
}

export function MembershipStatusCard({ membership }: MembershipStatusCardProps) {
  if (membership.status === 'No Active Plan') {
    return (
      <View style={[styles.card, styles.inactiveCard]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.badgeLabel, styles.inactiveTextLight]}>Current Plan</Text>
            <Text style={[styles.planTitle, styles.inactiveTextDark]}>No Active Plan</Text>
            <Text style={[styles.priceText, styles.inactiveTextLight]}>N/A</Text>
          </View>
          <View style={[styles.activeBadge, styles.activeBadgeInactive]}>
            <Text style={[styles.activeBadgeText, styles.activeBadgeTextInactive]}>INACTIVE</Text>
          </View>
        </View>
        <Text style={styles.inactivePrompt}>
          You don't have an active membership plan. Join a gym to unlock benefits and add-ons.
        </Text>
      </View>
    );
  }

  const percentRemaining = Math.max(
    5,
    Math.min(100, Math.round((membership.daysRemaining / (membership.totalDays || 365)) * 100))
  );

  const formattedStart = membership.startDate
    ? new Date(membership.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const formattedEnd = membership.endDate
    ? new Date(membership.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

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
        <View>
          <Text style={styles.badgeLabel}>Current Plan</Text>
          <Text style={styles.planTitle}>{membership.type || 'Unknown Plan'}</Text>
          <Text style={styles.priceText}>{membership.price || ''}</Text>
        </View>
        {/* White-glass active pill — matching reference `.active-pill` */}
        <View style={styles.activeBadge}>
          <Feather name="check-circle" size={11} color="#FFFFFF" />
          <Text style={styles.activeBadgeText}>{membership.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Membership Progress</Text>
          <Text style={styles.daysRemainingText}>{membership.daysRemaining || 0} days left</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentRemaining}%` as any }]} />
        </View>
      </View>

      {/* Dates & Auto Renew */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.footerLabel}>Started</Text>
          <Text style={styles.footerValue}>{formattedStart}</Text>
        </View>
        <View style={styles.centerCol}>
          <Text style={styles.footerLabel}>Auto Renew</Text>
          <Text style={styles.footerValue}>{membership.autoRenew ? 'ON' : 'OFF'}</Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.footerLabel}>Expires</Text>
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
    borderColor: 'rgba(255,255,255,0.35)',
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
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
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
    borderColor: 'rgba(255,255,255,0.22)',
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
