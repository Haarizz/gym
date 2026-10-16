import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface TrainerAvailabilityCardProps {
  onUpdateSchedule?: () => void;
}

export function TrainerAvailabilityCard({ onUpdateSchedule }: TrainerAvailabilityCardProps) {
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>{t('schedule.trainer.manageAvailability')}</Text>
      <Text style={styles.description}>
        {t('schedule.trainer.manageAvailabilityDesc')}
      </Text>
      <Pressable
        style={styles.button}
        onPress={onUpdateSchedule}
        accessibilityRole="button"
        accessibilityLabel={t('schedule.trainer.updateSchedule')}
      >
        <Text style={styles.buttonText}>{t('schedule.trainer.updateSchedule')}</Text>
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
