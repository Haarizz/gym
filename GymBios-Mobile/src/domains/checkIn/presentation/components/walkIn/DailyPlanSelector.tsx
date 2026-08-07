import { View, StyleSheet } from 'react-native';
import { Input } from '@/shared/components/Input'; // Assuming input can act as a selector, or use Dropdown if available

interface DailyPlanSelectorProps {
  selectedPlanId: string;
  onSelect: (id: string) => void;
}

export function DailyPlanSelector({ selectedPlanId, onSelect }: DailyPlanSelectorProps) {
  // In a real implementation, this would fetch from a Plans service.
  // Using a mock Dropdown behaviour via Input for layout purposes.
  return (
    <View style={styles.container}>
      <Input
        label="Choose Daily Plan *"
        value={selectedPlanId ? 'Jolene Maldonado - 154 (26 monthly)' : ''}
        placeholder="Select a plan"
        onChangeText={() => {}} // Disabled directly since it's a mock dropdown
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
