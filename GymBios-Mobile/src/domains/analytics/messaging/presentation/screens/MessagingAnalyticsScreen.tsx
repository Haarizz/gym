import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/shared/components/AppHeader';
import { BrandColors, Spacing, TypographyScale, Radius } from '@/core/theme';
import { useMessagingAnalytics } from '@/domains/messaging/hooks/useMessagingHooks';

export function MessagingAnalyticsScreen() {
  const router = useRouter();
  const { data: analytics, isLoading } = useMessagingAnalytics();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="Messaging Analytics"
        subtitle="Performance & insights"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => router.back()}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading analytics...</Text>
          </View>
        ) : analytics ? (
          <>
            <View style={styles.summaryContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Sent Today</Text>
                <Text style={styles.statValue}>{analytics.sentToday}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Scheduled</Text>
                <Text style={styles.statValue}>{analytics.scheduledMessages}</Text>
              </View>
            </View>

            <View style={styles.summaryContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Recipients</Text>
                <Text style={styles.statValue}>{analytics.totalRecipients}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Cost</Text>
                <Text style={styles.statValue}>${analytics.totalCost.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.metricsContainer}>
              <Text style={styles.sectionTitle}>Engagement Metrics</Text>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Open Rate</Text>
                <Text style={styles.metricValue}>{(analytics.openRate * 100).toFixed(1)}%</Text>
              </View>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Click Rate</Text>
                <Text style={styles.metricValue}>{(analytics.clickRate * 100).toFixed(1)}%</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No analytics data available.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  statCard: {
    flex: 1,
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  statLabel: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.one,
  },
  statValue: {
    fontSize: TypographyScale.title,
    fontWeight: 'bold',
    color: BrandColors.textPrimary,
  },
  metricsContainer: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.four,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  metricLabel: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
  metricValue: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  emptyContainer: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
});
