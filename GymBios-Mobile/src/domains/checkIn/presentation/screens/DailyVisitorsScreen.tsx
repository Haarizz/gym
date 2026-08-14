import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, BottomTabInset, Spacing } from '@/core/theme';

import { WalkInVisitorList } from '../components/walkIn/WalkInVisitorList';
import { useRecentCheckIns } from '../hooks/useRecentCheckIns';

const CHECK_IN_COLORS: [string, string] = [BrandColors.teal, '#1a7a47'];

/**
 * Daily Visitors Screen — shows all walk-in / daily visitor records for today.
 * Separated from Walk-In Registration to keep concerns distinct.
 */
export function DailyVisitorsScreen() {
  const router = useRouter();
  const { recentVisitors, isLoading, refetch, isRefetching } = useRecentCheckIns();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ScreenLayout>
      <AppHeader
        title="Today's Daily Visitors"
        subtitle="Walk-in passes issued today"
        colors={CHECK_IN_COLORS}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* Header row with count */}
        <View style={styles.headerRow}>
          <View style={styles.headerRowLeft}>
            <Feather name="user-plus" size={14} color={BrandColors.textSecondary} />
            <Typography variant="bodySmallBold" style={styles.sectionTitle}>
              Daily Visitors
            </Typography>
          </View>
          {!isLoading && (
            <Typography variant="caption" color="textSecondary">
              {recentVisitors.length} today
            </Typography>
          )}
        </View>

        <WalkInVisitorList />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
