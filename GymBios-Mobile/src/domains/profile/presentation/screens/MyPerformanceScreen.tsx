import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { Badge, EmptyState, GlassBlob, GlassHeader, GlassSurface, InfoRow } from '@/shared/components';
import { useCurrency } from '@/core/providers';

import { useMyPerformance } from '../../hooks/useMyPerformance';
import { PerformanceOverviewCard } from '../components/PerformanceOverviewCard';

interface MyPerformanceScreenProps {
  onBack: () => void;
}

export function MyPerformanceScreen({ onBack }: MyPerformanceScreenProps) {
  const { t } = useTranslation();
  const { performance, isLoading, error, refetch } = useMyPerformance();
  const { formatCurrency } = useCurrency();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />
      <GlassHeader
        title={t('performance.title')}
        subtitle={t('performance.subtitle')}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Loader />
        ) : error || !performance ? (
          <EmptyState
            icon="bar-chart-2"
            title={t('performance.unavailableTitle')}
            description={t('performance.unavailableDesc')}
            buttonLabel={t('performance.tryAgain')}
            onPress={() => refetch()}
          />
        ) : (
          <>
            <PerformanceOverviewCard performance={performance} />

            {/* Performance Insights Card */}
            <GlassSurface radius={Radius.lg} style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Feather name="bar-chart-2" size={20} color={BrandColors.teal} style={styles.insightsIcon} />
                <Typography variant="subtitle" style={styles.insightsTitle}>
                  {t('performance.analytics')}
                </Typography>
              </View>

              <Typography variant="caption" color="textSecondary" style={styles.periodLabel}>
                {performance.periodLabel}
              </Typography>

              <Typography variant="bodySmall" color="textSecondary" style={styles.insightsDescription}>
                {performance.message}
              </Typography>

              <View>
                <InfoRow
                  icon="check-circle"
                  iconColor="#16a34a"
                  iconBackground="rgba(22,163,74,0.14)"
                  label={t('performance.attendanceRate')}
                  value={
                    performance.attendanceRate == null ? undefined : (
                      <Typography variant="body" style={styles.attendanceValue}>
                        {performance.attendanceRate}%
                      </Typography>
                    )
                  }
                  emptyText={t('performance.noScheduleSet')}
                  divider={false}
                />

                <InfoRow
                  icon="calendar"
                  label={t('performance.daysPresent')}
                  value={
                    performance.daysScheduled > 0
                      ? t('performance.daysScheduled', {
                          present: performance.daysPresent,
                          scheduled: performance.daysScheduled,
                        })
                      : `${performance.daysPresent}`
                  }
                />

                <InfoRow
                  icon="dollar-sign"
                  label={t('performance.revenueThisMonth')}
                  value={
                    performance.revenueTarget > 0
                      ? t('performance.revenueProgress', {
                          achieved: formatCurrency(performance.revenueAchieved),
                          target: formatCurrency(performance.revenueTarget),
                        })
                      : formatCurrency(performance.revenueAchieved)
                  }
                />

                {/* Ratings need feedback linked to individual staff/trainers — not built yet. */}
                <InfoRow
                  icon="star"
                  iconColor="#eab308"
                  iconBackground="rgba(234,179,8,0.14)"
                  label={t('performance.ratingsAndReviews')}
                  value={t('performance.ratingsComingSoonNotice')}
                  right={<Badge label={t('performance.comingSoon')} tone="muted" />}
                />
              </View>
            </GlassSurface>
          </>
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
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  insightsCard: {
    padding: Spacing.four,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  insightsIcon: {
    marginEnd: Spacing.two,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  periodLabel: {
    marginBottom: Spacing.one,
  },
  insightsDescription: {
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  attendanceValue: {
    fontWeight: '700',
    color: '#16a34a',
    fontSize: 14.5,
  },
});
