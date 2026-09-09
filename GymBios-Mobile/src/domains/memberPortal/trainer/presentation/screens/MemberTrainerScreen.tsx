import { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassBlob, GlassSurface } from '@/shared/components';
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
    <View style={styles.root}>
      <GlassBlob color={BrandColors.trainerAmber} size={340} opacity={0.4} top={-90} right={-60} />
      <GlassBlob color={BrandColors.trainerAmber} size={300} opacity={0.28} top={340} left={-70} />
      <GlassBlob color={BrandColors.memberGold} size={240} opacity={0.2} top={760} right={-70} />
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
        <GlassSurface radius={Radius.lg} style={styles.card}>
          <Text style={styles.cardTitle}>About Your Coach</Text>
          <Text style={styles.bioText}>{TRAINER_INFO.bio}</Text>
        </GlassSurface>

        {/* Member Progress */}
        <TrainerProgressCard progress={PROGRESS_INFO} />

        {/* Upcoming Sessions */}
        <TrainerUpcomingSessionsCard />

        {/* Workout Plan Card */}
        <TrainerWorkoutPlanCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 50,
    gap: Spacing.four,
  },
  card: {
    padding: Spacing.four,
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
