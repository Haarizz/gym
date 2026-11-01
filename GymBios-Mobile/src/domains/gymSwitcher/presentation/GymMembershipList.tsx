import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';

import { formatDate } from '@/core/i18n';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Badge, Typography } from '@/shared/components';

import type { GymMembership } from '../gymMembershipsApi';

interface GymMembershipListProps {
  gyms: GymMembership[];
  /** The gym the app is working in now, marked as current. */
  activeTenant: string | null;
  /** A gym being switched to, shown with a spinner; the rows are disabled meanwhile. */
  pendingTenant?: string | null;
  onSelect: (gym: GymMembership) => void;
}

/**
 * The member's gyms, one row each: gym, branch and plan, and the membership's status.
 * Expired, suspended or pending memberships are listed too — the person still belongs
 * to that gym, and switching there shows them why it's locked and how to renew.
 */
export function GymMembershipList({ gyms, activeTenant, pendingTenant, onSelect }: GymMembershipListProps) {
  return (
    <View style={styles.list}>
      {gyms.map((gym) => (
        <GymMembershipRow
          key={gym.tenantSlug}
          gym={gym}
          isCurrent={gym.tenantSlug === activeTenant}
          isPending={gym.tenantSlug === pendingTenant}
          disabled={!!pendingTenant}
          onPress={() => onSelect(gym)}
        />
      ))}
    </View>
  );
}

interface GymMembershipRowProps {
  gym: GymMembership;
  isCurrent: boolean;
  isPending: boolean;
  disabled: boolean;
  onPress: () => void;
}

function GymMembershipRow({ gym, isCurrent, isPending, disabled, onPress }: GymMembershipRowProps) {
  const { t } = useTranslation();
  const details = [gym.branchName, gym.planName].filter(Boolean).join(' · ');
  const statusLabel = t(`gymSwitcher.status.${gym.status}`, { defaultValue: gym.status });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, isCurrent && styles.rowCurrent, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: isCurrent, disabled }}
      accessibilityLabel={[gym.gymName, details, statusLabel, isCurrent ? t('gymSwitcher.current') : '']
        .filter(Boolean)
        .join(', ')}
    >
      <Avatar size={44} name={gym.gymName} backgroundColor="#eef7f6" textColor={BrandColors.teal} />

      <View style={styles.body}>
        <Typography style={styles.gymName} numberOfLines={1}>{gym.gymName}</Typography>
        {!!details && (
          <Typography variant="caption" color="textSecondary" numberOfLines={1}>{details}</Typography>
        )}
        <View style={styles.meta}>
          <Badge label={statusLabel} tone={gym.active ? 'success' : 'muted'} />
          {!!gym.expiryDate && (
            <Typography variant="caption" color="textSecondary">
              {t('gymSwitcher.ends', { date: formatDate(gym.expiryDate, 'PP') })}
            </Typography>
          )}
        </View>
      </View>

      {isPending ? (
        <ActivityIndicator size="small" color={BrandColors.teal} />
      ) : isCurrent ? (
        <Feather name="check-circle" size={20} color={BrandColors.teal} />
      ) : (
        <Feather name="chevron-right" size={20} color={BrandColors.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  rowCurrent: {
    borderColor: 'rgba(50,127,116,0.45)',
    backgroundColor: 'rgba(50,127,116,0.06)',
  },
  rowPressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  gymName: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
