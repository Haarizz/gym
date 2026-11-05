import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BrandColors, Spacing } from '@/core/theme';
import { useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { ReferralStatsSummary } from '../components/ReferralStatsSummary';
import { ReferralHubMenu } from '../components/ReferralHubMenu';
import { referralKeys } from '../../hooks/referralKeys';
import { rewardKeys } from '@/domains/rewards';

export function ReferralsHubScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const bottomInset = useTabBarBottomInset() + Spacing.four;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: referralKeys.all }),
      queryClient.invalidateQueries({ queryKey: rewardKeys.all }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
      >
        <ReferralStatsSummary />
        <ReferralHubMenu />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scroll: {
    flex: 1,
  },
});
