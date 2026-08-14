import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { BrandColors, BottomTabInset, Spacing } from '@/core/theme';
import { HubFeatureCard } from '@/domains/attendance/presentation/components/hub/HubFeatureCard';

import { useRecentCheckIns } from '../hooks/useRecentCheckIns';

const CHECK_IN_COLORS: [string, string] = [BrandColors.teal, '#1a7a47'];

/**
 * Walk-In / Daily Visitor Hub Screen.
 *
 * Acts as a sub-hub within the Check-In module, providing two navigation
 * paths: visitor registration and today's visitor listing.
 */
export function WalkInHubScreen() {
  const router = useRouter();
  const { recentVisitors } = useRecentCheckIns();

  return (
    <ScreenLayout>
      <AppHeader
        title="Walk-In / Daily Visitor"
        subtitle="Register visitors and grant temporary access"
        colors={CHECK_IN_COLORS}
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <HubFeatureCard
          title="Register Visitor"
          subtitle="Fill visitor details, select a daily plan, and process payment."
          iconName="user-plus"
          iconBg="#dcfce7"
          iconColor="#16a34a"
          onPress={() => router.push('/(admin)/check-in/walk-in/register')}
        />

        <HubFeatureCard
          title="Today's Daily Visitors"
          subtitle="View all walk-in passes issued today."
          iconName="list"
          iconBg="#dbeafe"
          iconColor="#2563eb"
          onPress={() => router.push('/(admin)/check-in/walk-in/visitors')}
          countLabel={recentVisitors.length > 0 ? `${recentVisitors.length} today` : 'Open'}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.six,
  },
});
