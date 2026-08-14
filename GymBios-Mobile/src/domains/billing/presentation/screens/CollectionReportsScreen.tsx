import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { useBillingStats } from '../../hooks/useBills';
import { BillingSkeleton, ErrorState, MoneyText } from '../components';

interface CollectionReportsScreenProps {
  onBack: () => void;
}

type ReportPeriod = 'Daily' | 'Monthly' | 'Custom';

/**
 * Dedicated Collection Reports Screen.
 * Analytics summary, breakdown charts/bars, period selectors, and export capabilities.
 */
export function CollectionReportsScreen({ onBack }: CollectionReportsScreenProps) {
  const [period, setPeriod] = useState<ReportPeriod>('Monthly');
  const { stats, loading, error, refresh } = useBillingStats();

  const handleExportCSV = useCallback(() => {
    Alert.alert('Export CSV', `Exported ${period} Collection Report to CSV.`);
  }, [period]);

  const handleExportPDF = useCallback(() => {
    Alert.alert('Export PDF', `Exported ${period} Collection Report to PDF.`);
  }, [period]);

  const monthlyCollection = stats?.monthlyCollection ?? 0;
  const collectionRate = stats?.collectionRate ?? 0;
  const overdueAmount = stats?.overdueAmount ?? 0;

  // Mock payment method breakdown data (aligned with web backend response structure)
  const breakdown = [
    { method: 'Credit Card', amount: monthlyCollection * 0.45, pct: 45 },
    { method: 'Cash', amount: monthlyCollection * 0.35, pct: 35 },
    { method: 'Bank Transfer', amount: monthlyCollection * 0.15, pct: 15 },
    { method: 'UPI / Online', amount: monthlyCollection * 0.05, pct: 5 },
  ];

  if (loading && !stats) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Collection Reports"
          subtitle="Financial Analytics & Reports"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <BillingSkeleton variant="overview" count={3} />
      </ScreenLayout>
    );
  }

  if (error && !stats) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Collection Reports"
          subtitle="Financial Analytics & Reports"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <ErrorState message="Failed to load collection stats." onRetry={refresh} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader
        title="Collection Reports"
        subtitle="Financial Analytics & Revenue"
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['Daily', 'Monthly', 'Custom'] as ReportPeriod[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              accessibilityRole="button"
            >
              <Typography
                variant="caption"
                style={[styles.periodTabText, period === p && styles.periodTabTextActive]}
              >
                {p} Report
              </Typography>
            </Pressable>
          ))}
        </View>

        {/* Collection Summary Cards */}
        <View style={styles.cardRow}>
          <View style={styles.statCard}>
            <Typography variant="caption" color="textSecondary">
              Total Collection ({period})
            </Typography>
            <MoneyText amount={monthlyCollection} variant="bodySmallBold" color={BrandColors.teal} />
          </View>
          <View style={styles.statCard}>
            <Typography variant="caption" color="textSecondary">
              Collection Rate
            </Typography>
            <Typography variant="bodySmallBold" style={styles.greenText}>
              {collectionRate.toFixed(1)}%
            </Typography>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.statCard}>
            <Typography variant="caption" color="textSecondary">
              Outstanding Dues
            </Typography>
            <MoneyText amount={overdueAmount} variant="bodySmallBold" color="#b91c1c" />
          </View>
          <View style={styles.statCard}>
            <Typography variant="caption" color="textSecondary">
              Target Progress
            </Typography>
            <Typography variant="bodySmallBold" style={styles.blueText}>
              85%
            </Typography>
          </View>
        </View>

        {/* Payment Method Breakdown Section */}
        <View style={styles.sectionCard}>
          <Typography variant="bodySmallBold" style={styles.sectionTitle}>
            Collection by Payment Method
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.sectionSubtitle}>
            Breakdown for current period
          </Typography>

          <View style={styles.breakdownList}>
            {breakdown.map((item) => (
              <View key={item.method} style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <Typography variant="caption" style={styles.methodName}>
                    {item.method}
                  </Typography>
                  <View style={styles.breakdownValues}>
                    <MoneyText amount={item.amount} variant="caption" color={BrandColors.textPrimary} />
                    <Typography variant="caption" style={styles.pctText}>
                      {item.pct}%
                    </Typography>
                  </View>
                </View>
                {/* Progress bar */}
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${item.pct}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action / Export Buttons */}
        <View style={styles.exportSection}>
          <Typography variant="bodySmallBold" style={styles.exportTitle}>
            Export Reports
          </Typography>

          <View style={styles.exportButtonsRow}>
            <Pressable onPress={handleExportCSV} style={styles.exportBtn} accessibilityRole="button">
              <Feather name="file-text" size={16} color={BrandColors.teal} />
              <Typography variant="caption" style={styles.exportBtnText}>
                Export CSV
              </Typography>
            </Pressable>

            <Pressable onPress={handleExportPDF} style={styles.exportBtn} accessibilityRole="button">
              <Feather name="download" size={16} color={BrandColors.teal} />
              <Typography variant="caption" style={styles.exportBtnText}>
                Export PDF
              </Typography>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  periodTabActive: {
    backgroundColor: BrandColors.teal,
  },
  periodTabText: {
    color: BrandColors.textSecondary,
    fontWeight: '600',
  },
  periodTabTextActive: {
    color: '#ffffff',
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  greenText: {
    color: '#16a34a',
  },
  blueText: {
    color: '#2563eb',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
  },
  sectionSubtitle: {
    marginTop: -4,
  },
  breakdownList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  breakdownItem: {
    gap: 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodName: {
    fontWeight: '600',
  },
  breakdownValues: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  pctText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.full,
  },
  exportSection: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  exportTitle: {
    fontSize: 14,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BrandColors.teal,
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  exportBtnText: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
});
