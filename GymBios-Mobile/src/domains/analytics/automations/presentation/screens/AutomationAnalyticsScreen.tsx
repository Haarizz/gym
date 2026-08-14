import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Typography } from '@/shared/components/Typography';
import { StatCard } from '@/shared/components/StatCard';
import { Loader } from '@/shared/components/Loader';
import { useAutomationStats } from '@/domains/automations/hooks/useAutomations';
import { Spacing } from '@/core/theme';

export const AutomationAnalyticsScreen = () => {
  const { data: stats, isLoading, refetch } = useAutomationStats();

  if (isLoading && !stats) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.content} 
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <Typography variant="subtitle" style={styles.sectionTitle}>
        Overview
      </Typography>
      
      <View style={styles.statsGrid}>
        <StatCard
          label="Active Workflows"
          value={String(stats?.activeWorkflows ?? 0)}
          iconName="activity"
          color="#327f74"
        />
        <StatCard
          label="Members Engaged"
          value={String(stats?.totalMembersEngaged ?? 0)}
          iconName="users"
          color="#327f74"
        />
        <StatCard
          label="Total Runs"
          value={String(stats?.totalRuns ?? 0)}
          iconName="play"
          color="#327f74"
        />
        <StatCard
          label="Success Rate"
          value={`${stats?.successRate?.toFixed(1) ?? 0}%`}
          iconName="check-circle"
          color="#327f74"
        />
        <StatCard
          label="Errors"
          value={String(stats?.errorCount ?? 0)}
          iconName="alert-triangle"
          color="#d4183d"
        />
        <StatCard
          label="Pending Tasks"
          value={String(stats?.pendingTasks ?? 0)}
          iconName="clock"
          color="#327f74"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});

