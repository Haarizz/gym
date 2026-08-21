import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerInfo } from '../../domain/TrainerDashboardData';

interface TrainerWelcomeCardProps {
  trainerInfo: TrainerInfo;
}

export function TrainerWelcomeCard({ trainerInfo }: TrainerWelcomeCardProps) {
  const firstName = trainerInfo.name.split(' ')[0] || trainerInfo.name;

  return (
    <LinearGradient
      colors={[BrandColors.trainerAmber, '#D97706']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.greeting}>Good morning, {firstName}! 👋</Text>
      <Text style={styles.specialization}>{trainerInfo.specialization}</Text>
      <View style={styles.ratingRow}>
        <Feather name="star" size={14} color="#FFFFFF" />
        <Text style={styles.ratingValue}>{trainerInfo.rating}</Text>
        <Text style={styles.ratingLabel}>Rating</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 2,
  },
});
