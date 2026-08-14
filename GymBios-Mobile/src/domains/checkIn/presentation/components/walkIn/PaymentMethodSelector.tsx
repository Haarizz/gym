import { View, StyleSheet } from 'react-native';
import { Input } from '@/shared/components/Input'; 

interface PaymentMethodSelectorProps {
  method: string;
  onSelect: (method: string) => void;
}

export function PaymentMethodSelector({ method, onSelect }: PaymentMethodSelectorProps) {
  // Mock dropdown
  return (
    <View style={styles.container}>
      <Input
        label="Payment Method *"
        value={method}
        placeholder="Select method"
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
