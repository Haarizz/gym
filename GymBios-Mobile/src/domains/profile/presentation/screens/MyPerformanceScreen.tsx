import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

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
  const { performance, isLoading, error, refetch } = useMyPerformance();
  const { formatCurrency } = useCurrency();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />
      <GlassHeader
        title="My Performance"
        subtitle="Performance scores, analytics & ratings"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Loader />
        ) : error || !performance ? (
          <EmptyState
            icon="bar-chart-2"
            title="Performance unavailable"
            description="We couldn't load your performance right now. Make sure your account is linked to a staff profile."
            buttonLabel="Try again"
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
                  Performance Analytics
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
                  label="Attendance Rate"
                  value={
                    performance.attendanceRate == null ? undefined : (
                      <Typography variant="body" style={styles.attendanceValue}>
                        {performance.attendanceRate}%
                      </Typography>
                    )
                  }
                  emptyText="No schedule set"
                  divider={false}
                />

                <InfoRow
                  icon="calendar"
                  label="Days Present"
                  value={
                    performance.daysScheduled > 0
                      ? `${performance.daysPresent} of ${performance.daysScheduled} scheduled`
                      : `${performance.daysPresent}`
                  }
                />

                <InfoRow
                  icon="dollar-sign"
                  label="Revenue This Month"
                  value={
                    performance.revenueTarget > 0
                      ? `${formatCurrency(performance.revenueAchieved)} of ${formatCurrency(performance.revenueTarget)}`
                      : formatCurrency(performance.revenueAchieved)
                  }
                />

                {/* Ratings need feedback linked to individual staff/trainers — not built yet. */}
                <InfoRow
                  icon="star"
                  iconColor="#eab308"
                  iconBackground="rgba(234,179,8,0.14)"
                  label="Ratings & Reviews"
                  value="Member ratings for you are on the way"
                  right={<Badge label="Coming soon" tone="muted" />}
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
    marginRight: Spacing.two,
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
