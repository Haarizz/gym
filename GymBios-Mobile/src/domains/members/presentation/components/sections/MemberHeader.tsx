import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

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
}

export function MemberHeader({ member, onEdit, onRenew, onFreeze, onDelete }: MemberHeaderProps) {
  const theme = useTheme();

  const actions = [
    { key: 'edit', label: 'Edit', icon: 'edit-2', color: theme.text, onPress: onEdit },
    { key: 'renew', label: 'Renew', icon: 'refresh-cw', color: theme.text, onPress: onRenew },
    {
      key: 'freeze',
      label: member.isFrozen ? 'Unfreeze' : 'Freeze',
      icon: member.isFrozen ? 'sun' : 'pause-circle',
      color: theme.text,
      onPress: onFreeze,
    },
    { key: 'delete', label: 'Delete', icon: 'trash-2', color: BrandColors.danger, onPress: onDelete },
  ] as const;

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

      <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
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
});
