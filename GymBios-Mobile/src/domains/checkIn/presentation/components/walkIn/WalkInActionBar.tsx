import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/Button';
import { Spacing } from '@/core/theme';

interface WalkInActionBarProps {
  onCancel: () => void;
  onCollectPayment: () => void;
  onGrantAccess: () => void;
  isLoading?: boolean;
}

export function WalkInActionBar({ onCancel, onCollectPayment, onGrantAccess, isLoading }: WalkInActionBarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Button label={t('checkIn.walkIn.cancel')} variant="ghost" onPress={onCancel} style={styles.btn} disabled={isLoading} />
      <Button label={t('checkIn.walkIn.collectPayment')} variant="secondary" onPress={onCollectPayment} style={styles.btn} disabled={isLoading} />
      <Button label={t('checkIn.walkIn.grantAccess')} variant="primary" onPress={onGrantAccess} style={styles.btn} loading={isLoading} />
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
