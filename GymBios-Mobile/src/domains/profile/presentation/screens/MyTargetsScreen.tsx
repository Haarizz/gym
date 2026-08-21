import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { EmptyState } from '@/shared/components/EmptyState';

import { useMyTargets } from '../../hooks/useMyTargets';
import { TargetCard } from '../components/TargetCard';

interface MyTargetsScreenProps {
  onBack: () => void;
}

export function MyTargetsScreen({ onBack }: MyTargetsScreenProps) {
  const { targets, activeTargets, completedTargets, isLoading } = useMyTargets();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredTargets =
    filter === 'active'
      ? activeTargets
      : filter === 'completed'
        ? completedTargets
        : targets;

  const successRate =
    targets.length > 0
      ? Math.round((completedTargets.length / targets.length) * 100)
      : 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="My Targets"
        subtitle="Track personal goals & progress metrics"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBox}>
            <Typography variant="title" style={styles.summaryValue}>
              {activeTargets.length}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Active Goals
            </Typography>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBox}>
            <Typography variant="title" style={[styles.summaryValue, styles.completedValue]}>
              {completedTargets.length}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Completed
            </Typography>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBox}>
            <Typography variant="title" style={[styles.summaryValue, styles.rateValue]}>
              {successRate}%
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Success Rate
            </Typography>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterBar}>
          {(['all', 'active', 'completed'] as const).map((tab) => {
            const isSelected = filter === tab;
            const label = tab === 'all' ? `All (${targets.length})` : tab === 'active' ? `Active (${activeTargets.length})` : `Completed (${completedTargets.length})`;
            return (
              <Pressable
                key={tab}
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                onPress={() => setFilter(tab)}
              >
                <Typography
                  variant="bodySmall"
                  style={[styles.filterText, isSelected && styles.filterTextSelected]}
                >
                  {label}
                </Typography>
              </Pressable>
            );
          })}
        </View>

        {/* Target Cards */}
        {isLoading ? (
          <Loader />
        ) : filteredTargets.length === 0 ? (
          <EmptyState
            title="No Targets Found"
            description={`You currently have no ${filter} targets.`}
          />
        ) : (
          filteredTargets.map((target) => <TargetCard key={target.id} target={target} />)
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
    paddingBottom: Spacing.six,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  completedValue: {
    color: '#16a34a',
  },
  rateValue: {
    color: BrandColors.teal,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  filterBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: '#f1f5f9',
  },
  filterPillSelected: {
    backgroundColor: BrandColors.teal,
  },
  filterText: {
    color: BrandColors.textSecondary,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
});
