import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { StaffMonthSummary } from '../../domain/StaffDashboardData';

interface StaffMonthSummaryCardProps {
  summary: StaffMonthSummary;
}

export function StaffMonthSummaryCard({ summary }: StaffMonthSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <GlassSurface radius={Radius.lg} style={styles.container}>
      <Text style={styles.title}>{t('dashboard.staff.monthlySummary.title')}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{t('dashboard.staff.monthlySummary.targetAchievement')}</Text>
        <Text style={[styles.value, { color: '#16A34A' }]}>{summary.targetAchievement}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('dashboard.staff.monthlySummary.totalConversions')}</Text>
        <Text style={styles.value}>{summary.totalConversions}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('dashboard.staff.monthlySummary.revenueGenerated')}</Text>
        <CurrencyValue style={[styles.value, { color: BrandColors.memberGold }]} amount={summary.revenueGenerated} compact />
      </View>

      <View style={[styles.row, styles.lastRow]}>
        <Text style={styles.label}>{t('dashboard.staff.monthlySummary.conversionRate')}</Text>
        <Text style={styles.value}>{summary.conversionRate}%</Text>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
