import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';

interface QuickActionsSectionProps {
  onEdit: () => void;
  onRenew: () => void;
  onFreeze: () => void;
  onDelete: () => void;
  isFrozen: boolean;
}

export function QuickActionsSection({
  onEdit,
  onRenew,
  onFreeze,
  onDelete,
  isFrozen,
}: QuickActionsSectionProps) {
  return (
    <View style={styles.container}>
      <Button label="Edit Member" onPress={onEdit} size="lg" />
      <Button label="Renew Membership" onPress={onRenew} size="lg" />
      <Button
        label={isFrozen ? 'Unfreeze Membership' : 'Freeze Membership'}
        variant="secondary"
        onPress={onFreeze}
        size="lg"
      />
      <Button
        label="Delete Member"
        variant="secondary"
        onPress={onDelete}
        size="lg"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
});