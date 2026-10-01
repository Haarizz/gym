import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import type { FamilyGroup } from '../../../domain/FamilyGroup';
import type { Member } from '../../../domain/Member';
import { getInitials, titleCase } from '../../utils/memberDisplay';
import { DetailCard } from './DetailCard';

interface FamilySectionProps {
  member: Member;
  family?: FamilyGroup | null;
  onAddFamilyMember: () => void;
  onSelectMember: (memberId: number) => void;
}

export function FamilySection({
  member,
  family,
  onAddFamilyMember,
  onSelectMember,
}: FamilySectionProps) {
  const theme = useTheme();
  const isFamily = member.membershipType?.toUpperCase() === 'FAMILY';

  if (!isFamily) {
    return null;
  }

  const others = family?.members.filter((m) => m.id !== member.id) ?? [];
  const headName = family?.headName ?? member.familyHeadName;

  return (
    <DetailCard title="Family" icon="users">
      {headName ? (
        <Typography variant="caption" color="textSecondary" style={styles.headLine}>
          Family head: <Typography variant="caption" style={styles.headName}>{headName}</Typography>
        </Typography>
      ) : null}

      {others.length === 0 ? (
        <Typography variant="bodySmall" color="textSecondary" style={styles.empty}>
          No other family members yet.
        </Typography>
      ) : (
        others.map((fm, idx) => (
          <Pressable
            key={fm.id}
            style={({ pressed }) => [
              styles.row,
              idx > 0 && { borderTopWidth: 0.5, borderTopColor: theme.border },
              pressed && styles.pressed,
            ]}
            onPress={() => onSelectMember(fm.id)}
            accessibilityRole="button"
          >
            <Avatar
              initials={getInitials(fm.name)}
              imageUrl={fm.photoUrl}
              size={36}
              backgroundColor={BrandColors.teal}
              textColor={BrandColors.white}
            />
            <View style={styles.rowInfo}>
              <Typography variant="bodySmallBold" numberOfLines={1}>
                {fm.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {titleCase(fm.familyRole)}
              </Typography>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>
        ))
      )}

      <Pressable
        style={({ pressed }) => [styles.addButton, { borderColor: BrandColors.teal }, pressed && styles.pressed]}
        onPress={onAddFamilyMember}
        accessibilityRole="button"
      >
        <Feather name="user-plus" size={15} color={BrandColors.teal} />
        <Typography variant="bodySmallBold" style={{ color: BrandColors.teal }}>
          Add family member
        </Typography>
      </Pressable>
    </DetailCard>
  );
}

const styles = StyleSheet.create({
  headLine: {
    marginBottom: Spacing.two,
  },
  headName: {
    fontWeight: '700',
  },
  empty: {
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.two,
  },
  rowInfo: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
