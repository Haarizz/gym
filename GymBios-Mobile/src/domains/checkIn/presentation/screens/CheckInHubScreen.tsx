import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { HubFeatureCard } from '@/domains/attendance/presentation/components/hub/HubFeatureCard';
import { AttendanceSummaryCard } from '@/domains/attendance/presentation/components/shared/AttendanceSummaryCard';
import { AttendanceSkeleton } from '@/domains/attendance/presentation/components/shared/AttendanceSkeleton';

import { useRecentCheckIns } from '../hooks/useRecentCheckIns';

// Check-In module brand color pair (green tones, distinct from Attendance's teal)
const CHECK_IN_COLORS: [string, string] = [BrandColors.teal, '#1a7a47'];

/**
 * Check-In Hub — mobile-first entry point for the Check-In module.
 *
 * Mirrors the AttendanceHubScreen pattern:
 * - AppHeader with gradient
 * - Summary stat cards
 * - HubFeatureCard navigation menu
 */
export function CheckInHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bottomInset = useTabBarBottomInset() + Spacing.six;
  const { summary, isLoading, error, refetch, isRefetching } = useRecentCheckIns();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Loading state ───────────────────────────────────────────────────────────

  if (isLoading && !summary.total) {
    return (
      <ScreenLayout>
        <AppHeader
          title={t('checkIn.hub.title')}
          subtitle={t('checkIn.hub.subtitle')}
          colors={CHECK_IN_COLORS}
        />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
          showsVerticalScrollIndicator={false}
        >
          <AttendanceSkeleton variant="overview" count={4} />
        </ScrollView>
      </ScreenLayout>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <ScreenLayout>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={BrandColors.teal}
            />
          }
        >
          <View style={styles.errorContainer}>
            <Feather name="alert-triangle" size={32} color="#b91c1c" />
            <Typography variant="bodySmallBold" style={styles.errorTitle}>
              {t('checkIn.hub.loadError')}
            </Typography>
            <Typography variant="bodySmall" color="textSecondary">
              {error.message}
            </Typography>
          </View>
        </ScrollView>
      </ScreenLayout>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* ── Summary Stats ── */}
        <View style={styles.statsGrid}>
          <AttendanceSummaryCard
            label={t('checkIn.hub.stats.totalToday')}
            value={String(summary.total)}
            subtitle={t('checkIn.hub.stats.totalTodaySub')}
            iconName="log-in"
            iconBg={BrandColors.teal}
          />
          <AttendanceSummaryCard
            label={t('checkIn.hub.stats.inGym')}
            value={String(summary.active)}
            subtitle={t('checkIn.hub.stats.inGymSub')}
            iconName="activity"
            iconBg="#10b981"
          />
          <AttendanceSummaryCard
            label={t('checkIn.hub.stats.walkIns')}
            value={String(summary.walkIns)}
            subtitle={t('checkIn.hub.stats.walkInsSub')}
            iconName="user-plus"
            iconBg="#3b82f6"
          />
          <AttendanceSummaryCard
            label={t('checkIn.hub.stats.checkedOut')}
            value={String(summary.total - summary.active)}
            subtitle={t('checkIn.hub.stats.checkedOutSub')}
            iconName="log-out"
            iconBg="#f59e0b"
          />
        </View>

        {/* ── Navigation Feature Cards ── */}
        <View style={styles.featureCards}>
          <HubFeatureCard
            title={t('checkIn.hub.cards.membersStaffTitle')}
            subtitle={t('checkIn.hub.cards.membersStaffSub')}
            iconName="users"
            iconBg="#dcfce7"
            iconColor="#16a34a"
            onPress={() => router.push('/(admin)/check-in/members-staff')}
          />

          <HubFeatureCard
            title={t('checkIn.hub.cards.walkInTitle')}
            subtitle={t('checkIn.hub.cards.walkInSub')}
            iconName="user-plus"
            iconBg="#dbeafe"
            iconColor="#2563eb"
            onPress={() => router.push('/(admin)/check-in/walk-in')}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  featureCards: {
    gap: Spacing.two,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  errorTitle: {
    textAlign: 'center',
    color: '#b91c1c',
  },
});

