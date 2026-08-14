import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAutomationStats } from '../../hooks/useAutomations';
import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { Button } from '@/shared/components/Button';
import { StatCard } from '@/shared/components/StatCard';
import { Typography } from '@/shared/components/Typography';

export const AutomationsOverviewScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { data: stats, isLoading, refetch } = useAutomationStats();

  const handleCreateNew = () => {
    router.push('/(admin)/automations/create');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextContainer}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>
              Automations
            </Text>
            <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
              Automated workflows & communications
            </Text>
          </View>

          <Button
            label="+ Create"
            size="md"
            onPress={handleCreateNew}
          />
        </View>
      </View>

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
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  headerContainer: {
    marginBottom: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
