import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { formatDate } from '@/core/i18n';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberInfo } from '../../domain/MemberDashboardData';
import { useBranchContext } from '@/shared/providers/BranchProvider';

interface MemberActiveMembershipCardProps {
  memberInfo: MemberInfo;
}

// Gold-glass recipe from the reference: linear-gradient(135deg, rgba(255,214,110,0.85), rgba(242,187,61,0.65))
// Text is dark amber (#4a3200), not white — ensures legibility on a gold background.
const GOLD_START = 'rgba(255,214,110,0.88)';
const GOLD_END   = 'rgba(242,187,61,0.68)';

export function MemberActiveMembershipCard({ memberInfo }: MemberActiveMembershipCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedBranchId, availableBranches } = useBranchContext();
  const branchName =
    selectedBranchId === 'ALL'
      ? t('memberHome.allBranches')
      : availableBranches.find((b) => b.id === selectedBranchId)?.branch_name || t('memberHome.allBranches');

  const formattedDate = memberInfo.validUntil ? formatDate(memberInfo.validUntil, 'PP') : '-';

  const isFrozen = memberInfo.isFrozen;

  if (!isFrozen && (!memberInfo.isActive || memberInfo.membershipType === 'No Active Plan')) {
    return (
      <View style={[styles.card, styles.inactiveCard]}>
        <View style={styles.topRow}>
          <View style={styles.infoLeft}>
            <Text style={[styles.badgeLabel, styles.inactiveTextLight]}>{t('memberHome.subscriptionStatus')}</Text>
            <Text style={[styles.membershipType, styles.inactiveTextDark]}>{t('memberHome.noActiveSubscription')}</Text>
            <View style={styles.locationRow}>
              <Feather name="info" size={12} color="#6B7280" />
              <Text style={[styles.gymName, styles.inactiveTextLight]}>{t('memberHome.actionRequired')}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.divider, styles.inactiveDivider]} />
        <View style={styles.bottomRow}>
          <Text style={styles.inactivePrompt}>
            {t('memberHome.joinGymPrompt')}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.findGymButton, pressed && styles.findGymButtonPressed]}
          onPress={() => router.push('/(member)/centers' as any)}
          accessibilityRole="button"
          hitSlop={6}
        >
          <Feather name="search" size={14} color="#FFFFFF" />
          <Text style={styles.findGymText}>{t('memberHome.findGymCta')}</Text>
          <Feather name="arrow-right" size={14} color="#FFFFFF" />
        </Pressable>
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
          <Text style={styles.badgeLabel}>{t(isFrozen ? 'memberHome.frozenSubscription' : 'memberHome.activeSubscription')}</Text>
          <Text style={styles.membershipType} numberOfLines={2}>{memberInfo.membershipType}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color="rgba(74,50,0,0.75)" />
            <Text style={styles.gymName} numberOfLines={1}>{branchName}</Text>
          </View>
        </View>
        {/* Active pill — amber-dark semi-transparent glass */}
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{t(isFrozen ? 'memberHome.statusFrozen' : memberInfo.isActive ? 'memberHome.statusActive' : 'memberHome.statusInactive')}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.statLabel}>{t('memberHome.daysRemaining')}</Text>
          <Text style={styles.statValue}>{memberInfo.daysRemaining}</Text>
        </View>
        <View style={styles.statRight}>
          <Text style={styles.statLabel}>{t('memberHome.validUntil')}</Text>
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
    borderColor: 'transparent',
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
    end: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  infoLeft: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 1,
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
    flexShrink: 0,
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
  // Compact shortcut to gym discovery — sized to its label, not full width.
  findGymButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.memberGold,
  },
  findGymButtonPressed: {
    opacity: 0.85,
  },
  findGymText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
