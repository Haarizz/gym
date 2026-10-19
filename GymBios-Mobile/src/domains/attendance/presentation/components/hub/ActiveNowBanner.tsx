import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface ActiveNowBannerProps {
  activeCount: number;
  todayVisits: number;
}

export function ActiveNowBanner({ activeCount, todayVisits }: ActiveNowBannerProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.banner}>
      <View style={styles.textGroup}>
        <Typography variant="bodySmallBold" style={styles.title}>
          {t('attendance.hub.activeCount', { count: activeCount })}
        </Typography>
        <Typography variant="caption" style={styles.subtitle}>
          {t('attendance.hub.totalVisitsToday', { count: todayVisits })}
        </Typography>
      </View>
      <View style={styles.iconWrap}>
        <Feather name="activity" size={20} color="#ffffff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
