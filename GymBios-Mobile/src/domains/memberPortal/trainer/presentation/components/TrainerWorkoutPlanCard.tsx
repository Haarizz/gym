import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export function TrainerWorkoutPlanCard() {
  const handleViewPlan = () => {
    Alert.alert('Workout Program', 'Opening 4-Week Muscle Building full routine schedule.');
  };

  const handleRequestUpdate = () => {
    Alert.alert(
      'Request Plan Update',
      'Your request for a program review has been sent to Coach Rahul Mehta.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Latest Workout Plan Banner */}
      <View style={styles.planBanner}>
        <View style={styles.planHeader}>
          <Feather name="activity" size={18} color="#FFFFFF" />
          <Text style={styles.planBannerTitle}>Assigned Workout Plan</Text>
        </View>

        <View style={styles.planInnerCard}>
          <Text style={styles.programTitle}>4-Week Hypertrophy & Strength Program</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Assigned: Mar 15, 2026</Text>
            <Text style={styles.metaText}>Week 2 of 4</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.viewPlanButton, pressed && styles.pressed]}
            onPress={handleViewPlan}
          >
            <Text style={styles.viewPlanButtonText}>View Full Plan</Text>
          </Pressable>
        </View>
      </View>

      {/* Request Changes Button */}
      <Pressable
        style={({ pressed }) => [styles.requestButton, pressed && styles.pressed]}
        onPress={handleRequestUpdate}
        accessibilityRole="button"
        accessibilityLabel="Request Plan Update"
      >
        <Text style={styles.requestButtonText}>Request Plan Update</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  planBanner: {
    backgroundColor: BrandColors.tealDark,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planBannerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planInnerCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.three + 2,
    gap: Spacing.two,
  },
  programTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: TypographyScale.small,
    color: 'rgba(255,255,255,0.85)',
  },
  viewPlanButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  viewPlanButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.tealDark,
  },
  requestButton: {
    borderWidth: 2,
    borderColor: BrandColors.trainerAmber,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three + 2,
    alignItems: 'center',
    backgroundColor: BrandColors.surface,
  },
  requestButtonText: {
    fontSize: TypographyScale.body,
    fontWeight: '800',
    color: BrandColors.trainerAmber,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
