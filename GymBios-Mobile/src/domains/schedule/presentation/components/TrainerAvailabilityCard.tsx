import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface TrainerAvailabilityCardProps {
  onUpdateSchedule?: () => void;
}

export function TrainerAvailabilityCard({ onUpdateSchedule }: TrainerAvailabilityCardProps) {
  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Manage Availability</Text>
      <Text style={styles.description}>
        Set your working hours and block off time when you're unavailable
      </Text>
      <Pressable
        style={styles.button}
        onPress={onUpdateSchedule}
        accessibilityRole="button"
        accessibilityLabel="Update Schedule"
      >
        <Text style={styles.buttonText}>Update Schedule</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.teal,
  },
});
