import { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { TrainerProfileCard, type TrainerProfileData } from '../components/TrainerProfileCard';
import { TrainerProgressCard, type TrainerProgressData } from '../components/TrainerProgressCard';
import { TrainerUpcomingSessionsCard } from '../components/TrainerUpcomingSessionsCard';
import { TrainerWorkoutPlanCard } from '../components/TrainerWorkoutPlanCard';

const TRAINER_INFO: TrainerProfileData = {
  name: 'Rahul Mehta',
  specialization: 'Strength & Conditioning',
  experience: '8 years',
  rating: 4.9,
  reviews: 142,
  bio: 'Certified personal trainer specializing in functional fitness, athletic performance, and bodybuilding. Passionate about helping clients achieve their peak fitness through scientific programming.',
  phone: '+91 98200 44556',
};

const PROGRESS_INFO: TrainerProgressData = {
  sessionsCompleted: 24,
  currentGoal: 'Build Muscle Mass & Strength',
  startWeight: '75 kg',
  currentWeight: '78 kg',
  targetWeight: '82 kg',
};

export function MemberTrainerScreen() {
  const [isRefetching, setIsRefetching] = useState(false);

  const onRefresh = () => {
    setIsRefetching(true);
    setTimeout(() => {
      setIsRefetching(false);
    }, 600);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={BrandColors.trainerAmber}
          colors={[BrandColors.trainerAmber]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Trainer Profile */}
      <TrainerProfileCard trainer={TRAINER_INFO} />

      {/* About Trainer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About Your Coach</Text>
        <Text style={styles.bioText}>{TRAINER_INFO.bio}</Text>
      </View>

      {/* Member Progress */}
      <TrainerProgressCard progress={PROGRESS_INFO} />

      {/* Upcoming Sessions */}
      <TrainerUpcomingSessionsCard />

      {/* Workout Plan Card */}
      <TrainerWorkoutPlanCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 50,
    gap: Spacing.four,
  },
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  bioText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    lineHeight: 20,
  },
});
