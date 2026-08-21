import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useMemberDashboard } from '../../hooks/useMemberDashboard';
import { MemberWelcomeCard } from '../components/MemberWelcomeCard';
import { MemberActiveMembershipCard } from '../components/MemberActiveMembershipCard';
import { MemberCheckInCard } from '../components/MemberCheckInCard';
import { MemberStatsGrid } from '../components/MemberStatsGrid';
import { MemberTodayScheduleCard } from '../components/MemberTodayScheduleCard';
import { MemberQuickActions } from '../components/MemberQuickActions';
import { MemberOfferBanner } from '../components/MemberOfferBanner';

export function MemberDashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useMemberDashboard();

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading member portal..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={BrandColors.memberGold}
          colors={[BrandColors.memberGold]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <MemberWelcomeCard memberInfo={data.memberInfo} />
      <MemberActiveMembershipCard memberInfo={data.memberInfo} />
      <MemberCheckInCard />
      <MemberStatsGrid stats={data.quickStats} />
      <MemberTodayScheduleCard schedule={data.todaysSchedule} />
      <MemberQuickActions />
      <MemberOfferBanner />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 50,
    gap: Spacing.four,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
});
