import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface TrainerQuickActionsProps {
  onMessageMember?: () => void;
  onCreateWorkout?: () => void;
  onTrackProgress?: () => void;
  onViewLedger?: () => void;
}

export function TrainerQuickActions({
  onMessageMember,
  onCreateWorkout,
  onTrackProgress,
  onViewLedger,
}: TrainerQuickActionsProps) {
  const router = useRouter();

  const handleMessage = () => {
    if (onMessageMember) onMessageMember();
    else router.push('/(trainer)/messaging' as any);
  };

  const handleCreateWorkout = () => {
    if (onCreateWorkout) onCreateWorkout();
    else router.push('/(trainer)/workout-feedback' as any);
  };

  const handleTrackProgress = () => {
    if (onTrackProgress) onTrackProgress();
    else router.push('/(trainer)/performance' as any);
  };

  const handleViewLedger = () => {
    if (onViewLedger) onViewLedger();
    else router.push('/(trainer)/ledger' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        <Pressable
          style={[styles.actionBtn, { borderColor: BrandColors.trainerAmber }]}
          onPress={handleMessage}
          accessibilityRole="button"
          accessibilityLabel="Message Member"
        >
          <Text style={[styles.actionBtnText, { color: BrandColors.trainerAmber }]}>
            Message Member
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: BrandColors.teal }]}
          onPress={handleCreateWorkout}
          accessibilityRole="button"
          accessibilityLabel="Create Workout"
        >
          <Text style={[styles.actionBtnText, { color: BrandColors.teal }]}>
            Create Workout
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: BrandColors.memberGold }]}
          onPress={handleTrackProgress}
          accessibilityRole="button"
          accessibilityLabel="Track Progress"
        >
          <Text style={[styles.actionBtnText, { color: BrandColors.memberGold }]}>
            Track Progress
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { borderColor: '#A855F7' }]}
          onPress={handleViewLedger}
          accessibilityRole="button"
          accessibilityLabel="View Ledger"
        >
          <Text style={[styles.actionBtnText, { color: '#A855F7' }]}>
            View Ledger
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionBtn: {
    width: '48.5%',
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
