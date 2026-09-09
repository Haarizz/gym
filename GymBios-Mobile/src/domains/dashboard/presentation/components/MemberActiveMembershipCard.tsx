import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberInfo } from '../../domain/MemberDashboardData';

interface MemberActiveMembershipCardProps {
  memberInfo: MemberInfo;
}

// Gold-glass recipe from the reference: linear-gradient(135deg, rgba(255,214,110,0.85), rgba(242,187,61,0.65))
// Text is dark amber (#4a3200), not white — ensures legibility on a gold background.
const GOLD_START = 'rgba(255,214,110,0.88)';
const GOLD_END   = 'rgba(242,187,61,0.68)';

export function MemberActiveMembershipCard({ memberInfo }: MemberActiveMembershipCardProps) {
  const formattedDate = memberInfo.validUntil
    ? new Date(memberInfo.validUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '-';

  if (!memberInfo.isActive || memberInfo.membershipType === 'No Active Plan') {
    return (
      <View style={[styles.card, styles.inactiveCard]}>
        <View style={styles.topRow}>
          <View style={styles.infoLeft}>
            <Text style={[styles.badgeLabel, styles.inactiveTextLight]}>Membership Status</Text>
            <Text style={[styles.membershipType, styles.inactiveTextDark]}>No Active Membership</Text>
            <View style={styles.locationRow}>
              <Feather name="info" size={12} color="#6B7280" />
              <Text style={[styles.gymName, styles.inactiveTextLight]}>Action Required</Text>
            </View>
          </View>
        </View>
        <View style={[styles.divider, styles.inactiveDivider]} />
        <View style={styles.bottomRow}>
          <Text style={styles.inactivePrompt}>
            Please join a gym and select a membership plan to unlock all features.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Gold gradient glass background */}
      <LinearGradient
        colors={[GOLD_START, GOLD_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative shine overlay — top-left highlight streak */}
      <View pointerEvents="none" style={styles.shineOverlay} />
      {/* Decorative radial blob — top-right */}
      <View pointerEvents="none" style={styles.blobDecor} />

      <View style={styles.topRow}>
        <View style={styles.infoLeft}>
          <Text style={styles.badgeLabel}>Active Membership</Text>
          <Text style={styles.membershipType}>{memberInfo.membershipType}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color="rgba(74,50,0,0.75)" />
            <Text style={styles.gymName}>{memberInfo.gymName}</Text>
          </View>
        </View>
        {/* Active pill — amber-dark semi-transparent glass */}
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{memberInfo.isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.statLabel}>Days Remaining</Text>
          <Text style={styles.statValue}>{memberInfo.daysRemaining}</Text>
        </View>
        <View style={styles.statRight}>
          <Text style={styles.statLabel}>Valid Until</Text>
          <Text style={styles.statValueDate}>{formattedDate}</Text>
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
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: 'rgba(229,165,33,0.45)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    position: 'relative',
  },
  shineOverlay: {
    position: 'absolute',
    top: '-40%',
    left: '-20%',
    width: '60%',
    height: '180%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '20deg' }],
  },
  blobDecor: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  infoLeft: {
    flex: 1,
  },
  badgeLabel: {
    fontSize: 11,
    color: 'rgba(74,50,0,0.75)',
    fontWeight: '600',
    marginBottom: 4,
  },
  membershipType: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4a3200',
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  gymName: {
    fontSize: TypographyScale.body,
    color: 'rgba(74,50,0,0.85)',
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: 'rgba(74,50,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,50,0,0.28)',
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4a3200',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(74,50,0,0.18)',
    marginVertical: Spacing.three,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(74,50,0,0.75)',
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#4a3200',
    lineHeight: 36,
    letterSpacing: -1,
  },
  statRight: {
    alignItems: 'flex-end',
  },
  statValueDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a3200',
    marginTop: 2,
  },
  // Inactive state
  inactiveCard: {
    backgroundColor: BrandColors.screenBackground,
    borderColor: BrandColors.neutral[200],
    shadowColor: 'transparent',
    borderWidth: 1,
  },
  inactiveTextDark: {
    color: '#111827',
  },
  inactiveTextLight: {
    color: '#6B7280',
  },
  inactiveDivider: {
    backgroundColor: BrandColors.neutral[200],
  },
  inactivePrompt: {
    fontSize: TypographyScale.body,
    color: '#4B5563',
    lineHeight: 20,
    marginTop: Spacing.two,
  },
});
