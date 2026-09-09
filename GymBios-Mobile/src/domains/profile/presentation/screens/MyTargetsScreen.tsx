import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { EmptyState } from '@/shared/components/EmptyState';
import { GlassBlob, GlassSurface } from '@/shared/components';

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
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />
      <AppHeader
        title="My Targets"
        subtitle="Track personal goals & progress metrics"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <GlassSurface radius={Radius.lg} style={styles.summaryCard}>
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
        </GlassSurface>

        {/* Filter Pills */}
        <GlassSurface radius={Radius.full} style={styles.filterBar}>
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
        </GlassSurface>

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
    padding: Spacing.three,
    marginBottom: Spacing.four,
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
    padding: 4,
    marginBottom: Spacing.four,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
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
