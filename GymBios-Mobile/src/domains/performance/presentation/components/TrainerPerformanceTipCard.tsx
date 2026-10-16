import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { PerformanceTipDTO } from '../../domain/TrainerPerformanceData';

interface TrainerPerformanceTipCardProps {
  tip: PerformanceTipDTO;
}

export function TrainerPerformanceTipCard({ tip }: TrainerPerformanceTipCardProps) {
  const { t } = useTranslation();

  const message =
    tip.sessionsRemaining <= 0
      ? t('trainerPerformance.tipTargetHit')
      : t('trainerPerformance.tipRemaining', {
          percent: tip.remainingPercentage,
          remaining: tip.sessionsRemaining,
          count: tip.sessionsRemaining,
        });

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>{t('trainerPerformance.tipTitle')}</Text>
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
