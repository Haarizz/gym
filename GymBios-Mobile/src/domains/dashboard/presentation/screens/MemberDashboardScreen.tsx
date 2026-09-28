import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BrandColors, Spacing } from '@/core/theme';
import { GlassBlob, Loader } from '@/shared/components';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberDashboard } from '../../hooks/useMemberDashboard';
import { MemberWelcomeCard } from '../components/MemberWelcomeCard';
import { MemberActiveMembershipCard } from '../components/MemberActiveMembershipCard';
import { MemberCheckInCard } from '../components/MemberCheckInCard';
import { MemberStatsGrid } from '../components/MemberStatsGrid';
import { MemberTodayScheduleCard } from '../components/MemberTodayScheduleCard';
import { MemberQuickActions } from '../components/MemberQuickActions';
import { MemberOfferBanner } from '../components/MemberOfferBanner';

export function MemberDashboardScreen() {
  const { data, isLoading, refetch, isRefetching, isStale } = useMemberDashboard();
  const insets = useSafeAreaInsets();

  // The home tab stays mounted while the member moves between tabs; refresh on
  // return if the data went stale (e.g. staff approved a pending purchase).
  useFocusEffect(
    useCallback(() => {
      if (isStale) refetch();
    }, [isStale, refetch]),
  );

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading member portal..." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, overflow: 'hidden' }} pointerEvents="none">
        <GlassBlob color={BrandColors.memberGold} size={340} opacity={0.42} top={-90} right={-60} />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }
        ]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
});
