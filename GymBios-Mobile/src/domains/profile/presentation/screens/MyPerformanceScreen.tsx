import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';

import { useMyPerformance } from '../../hooks/useMyPerformance';
import { PerformanceOverviewCard } from '../components/PerformanceOverviewCard';

interface MyPerformanceScreenProps {
  onBack: () => void;
}

export function MyPerformanceScreen({ onBack }: MyPerformanceScreenProps) {
  const { performance, isLoading } = useMyPerformance();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="My Performance"
        subtitle="Performance scores, analytics & ratings"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <PerformanceOverviewCard performance={performance} />

            {/* Performance Insights Card */}
            <View style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Feather name="bar-chart-2" size={20} color={BrandColors.teal} style={styles.insightsIcon} />
                <Typography variant="subtitle" style={styles.insightsTitle}>
                  Performance Analytics
                </Typography>
              </View>

              <Typography variant="bodySmall" color="textSecondary" style={styles.insightsDescription}>
                You are currently in the top 5% of staff across all gym branches for client satisfaction and attendance rate. Keep up the great consistency!
              </Typography>

              <View style={styles.statList}>
                <View style={styles.statRow}>
                  <Typography variant="bodySmall" style={styles.statLabel}>
                    Average Rating
                  </Typography>
                  <View style={styles.ratingBadge}>
                    <Feather name="star" size={14} color="#eab308" style={{ marginRight: 4 }} />
                    <Typography variant="bodySmall" style={styles.ratingText}>
                      4.9 / 5.0
                    </Typography>
                  </View>
                </View>

                <View style={styles.statRow}>
                  <Typography variant="bodySmall" style={styles.statLabel}>
                    Review Feedback Count
                  </Typography>
                  <Typography variant="bodySmall" style={styles.statValue}>
                    128 reviews
                  </Typography>
                </View>

                <View style={styles.statRow}>
                  <Typography variant="bodySmall" style={styles.statLabel}>
                    Attendance Rate
                  </Typography>
                  <Typography variant="bodySmall" style={[styles.statValue, { color: '#16a34a' }]}>
                    98.5%
                  </Typography>
                </View>
              </View>
            </View>
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
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
  insightsDescription: {
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  statList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
});
