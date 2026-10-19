import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDate } from '@/core/i18n/format';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import type { AdminReportType } from '../../domain/AdminDashboardData';
import { useAdminReport, type AdminDashboardDateRange } from '../../hooks/useAdminDashboard';
import { formatReportCell } from '../../utils/adminDashboardFormat';

interface AdminReportDetailSheetProps {
  selectedReport: AdminReportType;
  range: AdminDashboardDateRange;
  onClose: () => void;
}

const REPORT_I18N_KEYS: Record<string, string> = {
  'total-collections': 'dashboard.admin.reportDetailSheet.reports.totalCollections',
  'membership-sales': 'dashboard.admin.reportDetailSheet.reports.membershipSales',
  'pos-revenue': 'dashboard.admin.reportDetailSheet.reports.posRevenue',
  'pt-sales': 'dashboard.admin.reportDetailSheet.reports.ptSales',
  'day-pass': 'dashboard.admin.reportDetailSheet.reports.dayPass',
  'active-members': 'dashboard.admin.reportDetailSheet.reports.activeMembers',
  'churn-rate': 'dashboard.admin.reportDetailSheet.reports.churnRate',
  'retention-rate': 'dashboard.admin.reportDetailSheet.reports.retentionRate',
};

export function AdminReportDetailSheet({
  selectedReport,
  range,
  onClose,
}: AdminReportDetailSheetProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useAdminReport(selectedReport, range);

  if (!selectedReport) return null;

  const title = REPORT_I18N_KEYS[selectedReport]
    ? (t(REPORT_I18N_KEYS[selectedReport] as any) as string)
    : (t('dashboard.admin.reportDetailSheet.title') as string);
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const reportDateLabel = data
    ? data.from === data.to
      ? formatDate(new Date(`${data.from}T00:00:00`), 'MMM d, yyyy')
      : `${formatDate(new Date(`${data.from}T00:00:00`), 'MMM d')} – ${formatDate(new Date(`${data.to}T00:00:00`), 'MMM d, yyyy')}`
    : '';

  return (
    <AppBottomSheet
      visible={!!selectedReport}
      title={title}
      subtitle={t('dashboard.admin.reportDetailSheet.subtitle')}
      onClose={onClose}
    >
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.stateBox}>
            <ActivityIndicator color={BrandColors.teal} />
            <Text style={styles.stateText}>{t('dashboard.admin.reportDetailSheet.loading')}</Text>
          </View>
        )}

        {!isLoading && isError && (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{t('dashboard.admin.reportDetailSheet.loadError')}</Text>
            <Text style={styles.retryText} onPress={() => refetch()}>
              {t('dashboard.admin.tapToRetry')}
            </Text>
          </View>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{t('dashboard.admin.reportDetailSheet.noData')}</Text>
          </View>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              {columns.map((col, idx) => (
                <Text key={idx} style={styles.tableHeaderText} numberOfLines={1}>
                  {col}
                </Text>
              ))}
            </View>

            <View style={styles.tableBody}>
              {rows.map((row, rowIdx) => (
                <View
                  key={rowIdx}
                  style={[
                    styles.tableRow,
                    rowIdx % 2 === 1 && styles.tableRowEven,
                  ]}
                >
                  {columns.map((col, colIdx) => (
                    <Text key={colIdx} style={styles.tableCell} numberOfLines={1}>
                      {formatReportCell(row[col] ?? null, col)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {!isLoading && !isError && (
          <View style={styles.summaryStatsRow}>
            <LinearGradient
              colors={[BrandColors.teal, BrandColors.tealDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>{t('dashboard.admin.reportDetailSheet.totalEntries')}</Text>
              <Text style={styles.summaryValue}>{data?.total_entries ?? 0}</Text>
            </LinearGradient>

            <LinearGradient
              colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>{t('dashboard.admin.reportDetailSheet.reportPeriod')}</Text>
              <Text style={styles.summaryValueDate}>{reportDateLabel}</Text>
            </LinearGradient>
          </View>
        )}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four * 2,
    gap: Spacing.two,
  },
  stateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  retryText: {
    fontSize: 13,
    color: BrandColors.teal,
    fontWeight: '700',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BrandColors.teal,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableBody: {},
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tableRowEven: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryValueDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
});
