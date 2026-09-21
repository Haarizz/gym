import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
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

const REPORT_TITLES: Record<string, string> = {
  'total-collections': 'Total Collections Report',
  'membership-sales': 'Membership Sales Report',
  'pos-revenue': 'POS Revenue Report',
  'pt-sales': 'PT Sales Report',
  'day-pass': 'Day Pass Revenue Report',
  'active-members': 'Active Members Report',
  'churn-rate': 'Churn Rate Analysis',
  'retention-rate': 'Retention Rate Analysis',
};

export function AdminReportDetailSheet({
  selectedReport,
  range,
  onClose,
}: AdminReportDetailSheetProps) {
  const { data, isLoading, isError, refetch } = useAdminReport(selectedReport, range);

  if (!selectedReport) return null;

  const title = REPORT_TITLES[selectedReport] ?? 'Report Detail';
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const currency = data?.currency ?? 'INR';
  const reportDateLabel = data
    ? data.from === data.to
      ? format(new Date(`${data.from}T00:00:00`), 'MMM d, yyyy')
      : `${format(new Date(`${data.from}T00:00:00`), 'MMM d')} – ${format(new Date(`${data.to}T00:00:00`), 'MMM d, yyyy')}`
    : '';

  return (
    <AppBottomSheet
      visible={!!selectedReport}
      title={title}
      subtitle="Detailed breakdown and insights"
      onClose={onClose}
    >
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.stateBox}>
            <ActivityIndicator color={BrandColors.teal} />
            <Text style={styles.stateText}>Loading report...</Text>
          </View>
        )}

        {!isLoading && isError && (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>Couldn&apos;t load this report.</Text>
            <Text style={styles.retryText} onPress={() => refetch()}>
              Tap to retry
            </Text>
          </View>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>No data for this period.</Text>
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
                      {formatReportCell(row[col] ?? null, col, currency)}
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
              <Text style={styles.summaryLabel}>Total Entries</Text>
              <Text style={styles.summaryValue}>{data?.total_entries ?? 0}</Text>
            </LinearGradient>

            <LinearGradient
              colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>Report Period</Text>
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
