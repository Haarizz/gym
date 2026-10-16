import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { BarChart } from '@/shared/components/charts';
import { formatDate } from '@/core/i18n';
import type { TrainerSessionTrendDTO } from '../../domain/TrainerPerformanceData';

interface TrainerMonthlyTrendChartProps {
  trend: TrainerSessionTrendDTO[];
}

export function TrainerMonthlyTrendChart({ trend }: TrainerMonthlyTrendChartProps) {
  const { t } = useTranslation();

  // Format '2026-03' into localized short month (e.g. 'Mar')
  const formattedData = trend.map((tr) => {
    const [year, month] = tr.month.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return {
      ...tr,
      displayMonth: formatDate(date, 'MMM'),
    };
  }).reverse(); // Reverse to chronological order (oldest to newest)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('trainerPerformance.sixMonthTrend')}</Text>
      <BarChart
        data={formattedData}
        xKey="displayMonth"
        series={[
          {
            key: 'sessions',
            label: t('trainerPerformance.sessions'),
            color: BrandColors.trainerAmber,
          },
        ]}
        height={180}
        showLegend={false}
      />
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
});
