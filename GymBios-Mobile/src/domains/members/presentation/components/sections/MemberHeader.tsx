import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import { getInitials, getMemberStatusTone, getPaymentStatusTone } from '../../utils/memberDisplay';
import { TonePill } from '../TonePill';
import { DetailCard } from './DetailCard';

interface MemberHeaderProps {
  member: Member;
  onEdit: () => void;
  onRenew: () => void;
  onFreeze: () => void;
  onDelete: () => void;
  /** Sell an add-on / facility access (omitted where selling isn't offered). */
  onAddon?: () => void;
}

export function MemberHeader({ member, onEdit, onRenew, onFreeze, onDelete, onAddon }: MemberHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // A suspended or frozen membership is locked until resumed / unfrozen — the backend refuses
  // renewals, add-on sales and payments for it (MemberSuspension.requireUsable). Unfreeze stays.
  const suspended = !!member.membershipSuspended;
  const frozen = !!member.isFrozen;
  const locked = suspended || frozen;

  const actions: { key: string; label: string; icon: any; color: string; onPress: () => void; disabled?: boolean }[] = [
    { key: 'edit', label: t('members.header.edit'), icon: 'edit-2', color: theme.text, onPress: onEdit },
    { key: 'renew', label: t('members.header.renew'), icon: 'refresh-cw', color: theme.text, onPress: onRenew, disabled: locked },
    ...(onAddon ? [{ key: 'addon', label: t('members.header.addon'), icon: 'package', color: theme.text, onPress: onAddon, disabled: locked }] : []),
    {
      key: 'freeze',
      label: frozen ? t('members.header.unfreeze') : t('members.header.freeze'),
      icon: frozen ? 'sun' : 'pause-circle',
      color: theme.text,
      onPress: onFreeze,
      disabled: suspended,
    },
    { key: 'delete', label: t('members.header.delete'), icon: 'trash-2', color: BrandColors.danger, onPress: onDelete },
  ];

  return (
    <DetailCard>
      <View style={styles.profileRow}>
        <Avatar
          initials={getInitials(member.name)}
          imageUrl={member.photoUrl}
          size={60}
          backgroundColor={BrandColors.teal}
          textColor={BrandColors.white}
        />
        <View style={styles.profileInfo}>
          <Typography variant="subtitle" numberOfLines={2}>
            {member.name}
          </Typography>
          <Typography variant="caption" color="textSecondary" numberOfLines={1}>
            {member.memberId}
            {member.membershipPlanName ? ` · ${member.membershipPlanName}` : ''}
          </Typography>
          <View style={styles.pills}>
            <TonePill tone={getMemberStatusTone(member)} />
            <TonePill tone={getPaymentStatusTone(member.paymentStatus)} />
          </View>
        </View>
      </View>

      {locked && (
        <View style={[styles.lockBanner, { backgroundColor: suspended ? 'rgba(212,24,61,0.08)' : 'rgba(29,78,216,0.08)' }]}>
          <Feather name={suspended ? 'slash' : 'pause-circle'} size={14} color={suspended ? BrandColors.danger : '#1d4ed8'} />
          <Typography variant="caption" style={{ flex: 1, color: suspended ? BrandColors.danger : '#1d4ed8' }}>
            {suspended ? t('members.extras.lockedSuspended') : t('members.extras.lockedFrozen')}
            {suspended && member.suspendedReason ? ` (${member.suspendedReason})` : ''}
          </Typography>
        </View>
      )}

      <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [styles.action, pressed && styles.pressed, action.disabled && styles.disabled]}
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: !!action.disabled }}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSelected }]}>
              <Feather name={action.icon} size={16} color={action.color} />
            </View>
            <Typography variant="caption" style={{ color: action.color }}>
              {action.label}
            </Typography>
          </Pressable>
        ))}
      </View>
    </DetailCard>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.md,
    padding: Spacing.two,
    borderRadius: Radius.md,
  },
});
