import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

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
  const percentRemaining = Math.max(
    5,
    Math.min(100, Math.round((membership.daysRemaining / (membership.totalDays || 365)) * 100))
  );

  const formattedStart = new Date(membership.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedEnd = new Date(membership.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.badgeLabel}>Current Plan</Text>
          <Text style={styles.planTitle}>{membership.type}</Text>
          <Text style={styles.priceText}>{membership.price}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Feather name="check-circle" size={12} color="#FFFFFF" />
          <Text style={styles.activeBadgeText}>{membership.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Membership Progress</Text>
          <Text style={styles.daysRemainingText}>{membership.daysRemaining} days left</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentRemaining}%` }]} />
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
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.xl,
    padding: Spacing.four + 2,
    shadowColor: BrandColors.tealDark,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badgeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: 2,
  },
  planTitle: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  priceText: {
    fontSize: TypographyScale.body,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  },
  daysRemainingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  footerLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
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
});
