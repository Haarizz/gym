import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/shared/components/AppText';
import { formatDate } from '@/core/i18n/format';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import {
  type AnalyticsPeriod,
  type AnalyticsRange,
  useBookingsAnalytics,
  useMembershipAnalytics,
  usePosAnalytics,
} from '../../hooks/useAdminAnalytics';
import { AnalyticsTab, AnalyticsTabs, PeriodSelector } from '../components/AnalyticsTabs';
import { MembershipTab } from '../components/MembershipTab';
import { BookingsTab } from '../components/BookingsTab';
import { PosTab } from '../components/PosTab';

export function AdminAnalyticsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AnalyticsTab>('membership');
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t('analytics.title'), headerShadowVisible: false }} />
      <TabContent
        key={tab}
        tab={tab}
        period={period}
        header={
          <>
            <AnalyticsTabs selected={tab} onSelect={setTab} />
            <PeriodSelector selected={period} onSelect={setPeriod} />
          </>
        }
        bottomPadding={TAB_BAR_HEIGHT + insets.bottom + Spacing.four}
      />
    </View>
  );
}

/** Only the open tab's query runs; the others load when first opened and stay cached. */
function TabContent({
  tab,
  period,
  header,
  bottomPadding,
}: {
  tab: AnalyticsTab;
  period: AnalyticsPeriod;
  header: React.ReactNode;
  bottomPadding: number;
}) {
  const membership = useMembershipAnalytics(period, tab === 'membership');
  const bookings = useBookingsAnalytics(period, tab === 'bookings');
  const pos = usePosAnalytics(period, tab === 'pos');
  const query = tab === 'membership' ? membership : tab === 'bookings' ? bookings : pos;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={BrandColors.teal} />
      }
    >
      {header}
      {query.data && <RangeCaption range={query.data.range} />}
      {query.isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={BrandColors.teal} />
        </View>
      ) : query.isError || !query.data ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : tab === 'membership' && membership.data ? (
        <MembershipTab data={membership.data} />
      ) : tab === 'bookings' && bookings.data ? (
        <BookingsTab data={bookings.data} />
      ) : pos.data ? (
        <PosTab data={pos.data} />
      ) : null}
    </ScrollView>
  );
}

function RangeCaption({ range }: { range: AnalyticsRange }) {
  const { t } = useTranslation();
  if (!range.from || !range.to) return null;
  return (
    <Text style={styles.range}>
      {t('analytics.rangeCaption', { from: formatDate(range.from, 'd MMM yyyy'), to: formatDate(range.to, 'd MMM yyyy') })}
    </Text>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.state}>
      <Text style={styles.errorText}>{t('analytics.failedToLoad')}</Text>
      <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
        <Text style={styles.retryText}>{t('analytics.retry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BrandColors.screenBackground },
  content: { padding: Spacing.three },
  range: { fontSize: TypographyScale.small, color: BrandColors.textSecondary, marginBottom: Spacing.md },
  state: { paddingVertical: Spacing.six, alignItems: 'center', gap: Spacing.three },
  errorText: { color: BrandColors.danger, fontSize: TypographyScale.body, textAlign: 'center' },
  retry: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.full, backgroundColor: BrandColors.teal },
  retryText: { color: BrandColors.white, fontWeight: '600', fontSize: TypographyScale.body },
});
