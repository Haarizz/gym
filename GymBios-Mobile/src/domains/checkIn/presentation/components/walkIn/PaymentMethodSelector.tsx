import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/components/Input'; 

interface PaymentMethodSelectorProps {
  method: string;
  onSelect: (method: string) => void;
}

export function PaymentMethodSelector({ method, onSelect }: PaymentMethodSelectorProps) {
  const { t } = useTranslation();
  // Mock dropdown
  return (
    <View style={styles.container}>
      <Input
        label={t('checkIn.walkIn.paymentMethodLabel')}
        value={method}
        placeholder={t('checkIn.walkIn.selectMethodPlaceholder')}
        onChangeText={() => {}} // Disabled for mock
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
