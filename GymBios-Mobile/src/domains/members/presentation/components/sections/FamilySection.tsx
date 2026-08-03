import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { FamilyGroup } from '../../../domain/FamilyGroup';
import type { Member } from '../../../domain/Member';

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
  const isFamily = member.membershipType.toUpperCase() === 'FAMILY';

  if (!isFamily) {
    return null;
  }

  const adults = family?.members.filter(m => m.familyRole.toUpperCase() === 'ADULT') ?? [];
  const minors = family?.members.filter(m => m.familyRole.toUpperCase() === 'MINOR') ?? [];

  return (
    <FormSection title="Family">
      <View style={styles.detailRow}>
        <Typography variant="caption" color="textSecondary" style={styles.detailLabel}>
          Family Head
        </Typography>
        <Typography variant="bodySmall">
          {family?.headName ?? member.familyHeadName ?? '—'}
        </Typography>
      </View>

      <View style={styles.detailRow}>
        <Typography variant="caption" color="textSecondary" style={styles.detailLabel}>
          Adults
        </Typography>
        <Typography variant="bodySmall">{adults.length}</Typography>
      </View>

      <View style={styles.detailRow}>
        <Typography variant="caption" color="textSecondary" style={styles.detailLabel}>
          Minors
        </Typography>
        <Typography variant="bodySmall">{minors.length}</Typography>
      </View>

      {family && family.members.length > 0 && (
        <View style={styles.memberList}>
          {family.members.map(fm => (
            <Button
              key={fm.id}
              label={`${fm.name} (${fm.familyRole})`}
              variant="secondary"
              onPress={() => onSelectMember(fm.id)}
            />
          ))}
        </View>
      )}

      <Button
        label="Add Family Member"
        onPress={onAddFamilyMember}
      />
    </FormSection>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  detailLabel: {
    flex: 1,
  },
  memberList: {
    gap: Spacing.two,
  },
});