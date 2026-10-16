import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { EmptyState } from '@/shared/components/EmptyState';
import { GlassBlob, GlassHeader, GlassSurface } from '@/shared/components';

import { useMyTargets } from '../../hooks/useMyTargets';
import { TargetCard } from '../components/TargetCard';

interface MyTargetsScreenProps {
  onBack: () => void;
}

export function MyTargetsScreen({ onBack }: MyTargetsScreenProps) {
  const { t } = useTranslation();
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
      <GlassHeader
        title={t('targets.title')}
        subtitle={t('targets.subtitle')}
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
              {t('targets.activeGoals')}
            </Typography>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBox}>
            <Typography variant="title" style={[styles.summaryValue, styles.completedValue]}>
              {completedTargets.length}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t('targets.completed')}
            </Typography>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBox}>
            <Typography variant="title" style={[styles.summaryValue, styles.rateValue]}>
              {`${successRate}%`}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t('targets.successRate')}
            </Typography>
          </View>
        </GlassSurface>

        {/* Filter Pills */}
        <GlassSurface radius={Radius.full} style={styles.filterBar}>
          {(['all', 'active', 'completed'] as const).map((tab) => {
            const isSelected = filter === tab;
            const label =
              tab === 'all'
                ? t('targets.filterAll', { count: targets.length })
                : tab === 'active'
                  ? t('targets.filterActive', { count: activeTargets.length })
                  : t('targets.filterCompleted', { count: completedTargets.length });
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
            title={t('targets.emptyTitle')}
            description={t('targets.emptyDesc')}
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
    backgroundColor: 'rgba(30,42,58,0.1)',
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
