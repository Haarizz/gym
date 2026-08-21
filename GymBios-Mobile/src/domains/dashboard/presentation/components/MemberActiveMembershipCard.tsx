import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberInfo } from '../../domain/MemberDashboardData';

interface MemberActiveMembershipCardProps {
  memberInfo: MemberInfo;
}

export function MemberActiveMembershipCard({ memberInfo }: MemberActiveMembershipCardProps) {
  const formattedDate = memberInfo.validUntil
    ? new Date(memberInfo.validUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '2026-12-31';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.infoLeft}>
          <Text style={styles.badgeLabel}>Active Membership</Text>
          <Text style={styles.membershipType}>{memberInfo.membershipType}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.gymName}>{memberInfo.gymName}</Text>
          </View>
        </View>
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
    backgroundColor: BrandColors.memberGold,
    borderRadius: Radius.lg,
    padding: Spacing.four + 2,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: 4,
  },
  membershipType: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  gymName: {
    fontSize: TypographyScale.body,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: Spacing.two,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statRight: {
    alignItems: 'flex-end',
  },
  statValueDate: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
});
