import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useBranchContext } from '@/shared/providers/BranchProvider';
import { toast } from '@/shared/components/Toasts/toastStore';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { BrandColors, Spacing } from '@/core/theme';
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
  const { t } = useTranslation();
  const router = useRouter();
  const bottomInset = useTabBarBottomInset() + Spacing.six;
  const { recentVisitors } = useRecentCheckIns();
  const { selectedBranchId } = useBranchContext();

  return (
    <ScreenLayout>
      <AppHeader
        title={t('checkIn.walkIn.title')}
        subtitle={t('checkIn.walkIn.subtitle')}
        colors={CHECK_IN_COLORS}
        onBack={() => router.back()}
      />

      <View style={[styles.content, { paddingBottom: bottomInset }]}>
        <HubFeatureCard
          title={t('checkIn.walkIn.registerTitle')}
          subtitle={t('checkIn.walkIn.registerSubtitle')}
          iconName="user-plus"
          iconBg="#dcfce7"
          iconColor="#16a34a"
          onPress={() => {
            if (selectedBranchId === 'ALL') {
              toast.error(t('checkIn.walkIn.branchRequiredMsg'), { title: t('checkIn.walkIn.branchRequiredTitle') });
              return;
            }
            router.push('/(admin)/check-in/walk-in/register');
          }}
        />

        <HubFeatureCard
          title={t('checkIn.walkIn.todayVisitorsTitle')}
          subtitle={t('checkIn.walkIn.todayVisitorsSub')}
          iconName="list"
          iconBg="#dbeafe"
          iconColor="#2563eb"
          onPress={() => router.push('/(admin)/check-in/walk-in/visitors')}
          countLabel={recentVisitors.length > 0 ? t('checkIn.walkIn.todayCount', { count: recentVisitors.length }) : t('checkIn.walkIn.open')}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
