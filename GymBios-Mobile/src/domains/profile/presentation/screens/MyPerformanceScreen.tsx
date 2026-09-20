import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { GlassBlob, GlassHeader, GlassSurface, InfoRow } from '@/shared/components';

import { useMyPerformance } from '../../hooks/useMyPerformance';
import { PerformanceOverviewCard } from '../components/PerformanceOverviewCard';

interface MyPerformanceScreenProps {
  onBack: () => void;
}

export function MyPerformanceScreen({ onBack }: MyPerformanceScreenProps) {
  const { performance, isLoading } = useMyPerformance();

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

              <Typography variant="bodySmall" color="textSecondary" style={styles.insightsDescription}>
                You are currently in the top 5% of staff across all gym branches for client satisfaction and attendance rate. Keep up the great consistency!
              </Typography>

              <View>
                <InfoRow
                  icon="star"
                  iconColor="#eab308"
                  iconBackground="rgba(234,179,8,0.14)"
                  label="Average Rating"
                  value="4.9 / 5.0"
                  divider={false}
                />

                <InfoRow
                  icon="message-square"
                  label="Review Feedback Count"
                  value="128 reviews"
                />

                <InfoRow
                  icon="check-circle"
                  iconColor="#16a34a"
                  iconBackground="rgba(22,163,74,0.14)"
                  label="Attendance Rate"
                  value={
                    <Typography variant="body" style={styles.attendanceValue}>
                      98.5%
                    </Typography>
                  }
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
