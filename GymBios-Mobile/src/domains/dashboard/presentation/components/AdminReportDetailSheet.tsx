import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import type { AdminReportType } from '../../domain/AdminDashboardData';
import {
  getAdminReportColumns,
  getAdminReportData,
  getAdminReportTitle,
} from '../../hooks/useAdminDashboard';

interface AdminReportDetailSheetProps {
  selectedReport: AdminReportType;
  onClose: () => void;
}

export function AdminReportDetailSheet({
  selectedReport,
  onClose,
}: AdminReportDetailSheetProps) {
  if (!selectedReport) return null;

  const title = getAdminReportTitle(selectedReport);
  const columns = getAdminReportColumns(selectedReport);
  const rows = getAdminReportData(selectedReport);

  return (
    <AppBottomSheet
      visible={!!selectedReport}
      title={title}
      subtitle="Detailed breakdown and insights"
      onClose={onClose}
    >
      <View style={styles.container}>
        {/* Table Container */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            {columns.map((col, idx) => (
              <Text key={idx} style={styles.tableHeaderText} numberOfLines={1}>
                {col}
              </Text>
            ))}
          </View>

          {/* Table Rows */}
          <View style={styles.tableBody}>
            {rows.map((row, rowIdx) => (
              <View
                key={rowIdx}
                style={[
                  styles.tableRow,
                  rowIdx % 2 === 1 && styles.tableRowEven,
                ]}
              >
                {Object.values(row).map((val, colIdx) => (
                  <Text key={colIdx} style={styles.tableCell} numberOfLines={1}>
                    {String(val)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Summary Stats Cards */}
        <View style={styles.summaryStatsRow}>
          <LinearGradient
            colors={[BrandColors.teal, BrandColors.tealDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>Total Entries</Text>
            <Text style={styles.summaryValue}>{rows.length}</Text>
          </LinearGradient>

          <LinearGradient
            colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>Report Date</Text>
            <Text style={styles.summaryValueDate}>March 26, 2026</Text>
          </LinearGradient>
        </View>
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
