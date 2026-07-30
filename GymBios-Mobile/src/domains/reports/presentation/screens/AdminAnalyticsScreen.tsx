import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts';
import type { createUseRestoreSession } from '@/domains/auth/presentation/hooks/useAuthFlow';

interface AdminAnalyticsScreenProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
}

export function createAdminAnalyticsScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminAnalyticsScreen() {
    const { logout, isLoggingOut } = useRestoreSession();

    const timeframes = ['Today', '7 Days', '30 Days', '12 Months'];
    const activeTimeframe = '30 Days';

    const revenueMetrics = [
      { label: 'Total Revenue', value: '₹4.2L', trend: '+15%', isUp: true },
      { label: 'Avg per Member', value: '₹2,450', trend: '+5%', isUp: true },
    ];

    const growthMetrics = [
      { label: 'New Members', value: '124', trend: '+12%', isUp: true },
      { label: 'Churn Rate', value: '2.4%', trend: '-0.5%', isUp: true }, // Lower churn is good
    ];

    return (
      <ScreenLayout scrollable>
        <View style={styles.container}>
          {/* Timeframe Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.timeframeContainer}
            contentContainerStyle={styles.timeframeContent}
          >
            {timeframes.map((timeframe, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeframeTab,
                  timeframe === activeTimeframe && styles.timeframeTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.timeframeTabText,
                    timeframe === activeTimeframe && styles.timeframeTabTextActive,
                  ]}
                >
                  {timeframe}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Revenue Overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Revenue Overview</Text>
            <View style={styles.metricsRow}>
              {revenueMetrics.map((metric, index) => (
                <View key={index} style={styles.metricBox}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <View style={styles.trendContainer}>
                    <Feather
                      name={metric.isUp ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={metric.isUp ? '#16a34a' : '#dc2626'}
                    />
                    <Text
                      style={[
                        styles.trendText,
                        { color: metric.isUp ? '#16a34a' : '#dc2626' },
                      ]}
                    >
                      {metric.trend}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {/* Placeholder for Chart */}
            <View style={styles.chartPlaceholder}>
              <Feather name="bar-chart-2" size={48} color="#e5e7eb" />
              <Text style={styles.chartPlaceholderText}>Revenue Chart Placeholder</Text>
            </View>
          </View>

          {/* Membership Growth */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Membership Growth</Text>
            <View style={styles.metricsRow}>
              {growthMetrics.map((metric, index) => (
                <View key={index} style={styles.metricBox}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <View style={styles.trendContainer}>
                    <Feather
                      name={metric.isUp ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={metric.isUp ? '#16a34a' : '#dc2626'}
                    />
                    <Text
                      style={[
                        styles.trendText,
                        { color: metric.isUp ? '#16a34a' : '#dc2626' },
                      ]}
                    >
                      {metric.trend}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {/* Placeholder for Chart */}
            <View style={styles.chartPlaceholder}>
              <Feather name="pie-chart" size={48} color="#e5e7eb" />
              <Text style={styles.chartPlaceholderText}>Growth Chart Placeholder</Text>
            </View>
          </View>

          {/* Export Report */}
          <TouchableOpacity style={styles.exportButton}>
            <Feather name="download" size={20} color={BrandColors.teal} />
            <Text style={styles.exportButtonText}>Export Detailed Report</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  timeframeContainer: {
    marginHorizontal: -Spacing.four,
  },
  timeframeContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  timeframeTab: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeframeTabActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  timeframeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  timeframeTabTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: Spacing.four,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  metricBox: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartPlaceholder: {
    height: 160,
    backgroundColor: '#f9fafb',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    backgroundColor: 'rgba(50, 127, 116, 0.1)',
    borderRadius: Radius.md,
    gap: Spacing.two,
  },
  exportButtonText: {
    color: BrandColors.teal,
    fontSize: 14,
    fontWeight: '600',
  },
});
