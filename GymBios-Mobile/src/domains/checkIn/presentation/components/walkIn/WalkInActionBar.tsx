import { View, StyleSheet } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Spacing } from '@/core/theme';

interface WalkInActionBarProps {
  onCancel: () => void;
  onCollectPayment: () => void;
  onGrantAccess: () => void;
  isLoading?: boolean;
}

export function WalkInActionBar({ onCancel, onCollectPayment, onGrantAccess, isLoading }: WalkInActionBarProps) {
  return (
    <View style={styles.container}>
      <Button label="Cancel" variant="outline" onPress={onCancel} style={styles.btn} disabled={isLoading} />
      <Button label="Collect Payment" variant="secondary" onPress={onCollectPayment} style={styles.btn} disabled={isLoading} />
      <Button label="Grant Access" variant="primary" onPress={onGrantAccess} style={styles.btn} loading={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  btn: {
    flex: 1,
  },
});
