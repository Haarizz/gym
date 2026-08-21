import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { PerformanceTipDTO } from '../../domain/TrainerPerformanceData';

interface TrainerPerformanceTipCardProps {
  tip: PerformanceTipDTO;
}

export function TrainerPerformanceTipCard({ tip }: TrainerPerformanceTipCardProps) {
  let message = '';
  if (tip.sessionsRemaining <= 0) {
    message = "You have hit your monthly session target! Great job keep it up! 🎯";
  } else {
    message = `You're ${tip.remainingPercentage}% away from your monthly target. Book ${tip.sessionsRemaining} more session${tip.sessionsRemaining === 1 ? '' : 's'} to stay on track!`;
  }

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Performance Tip 💡</Text>
      <Text style={styles.tipText}>{message}</Text>
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
  tipText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 18,
  },
});
