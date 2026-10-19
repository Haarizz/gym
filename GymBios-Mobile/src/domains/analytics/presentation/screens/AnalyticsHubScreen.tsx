import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { FeatherIcon } from '@/shared/components/CurrencyIcon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

type AnalyticsModule = {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  description?: string;
};

export function AnalyticsHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const analyticsModules: AnalyticsModule[] = [
    { id: 'community', title: t('analytics.modules.community.title'), icon: 'users', route: '/(admin)/analytics/community', description: t('analytics.modules.community.description') },
    { id: 'member-connect', title: t('analytics.modules.memberConnect.title'), icon: 'message-square', route: '/(admin)/analytics/member-connect', description: t('analytics.modules.memberConnect.description') },
    { id: 'membership', title: t('analytics.modules.membership.title'), icon: 'credit-card', route: '/(admin)/analytics/membership', description: t('analytics.modules.membership.description') },
    { id: 'attendance', title: t('analytics.modules.attendance.title'), icon: 'calendar', route: '/(admin)/analytics/attendance', description: t('analytics.modules.attendance.description') },
    { id: 'facilities', title: t('analytics.modules.facilities.title'), icon: 'map-pin', route: '/(admin)/analytics/facilities', description: t('analytics.modules.facilities.description') },
    { id: 'sales-purchases', title: t('analytics.modules.salesPurchases.title'), icon: 'shopping-cart', route: '/(admin)/analytics/sales-purchases', description: t('analytics.modules.salesPurchases.description') },
    { id: 'financials', title: t('analytics.modules.financials.title'), icon: 'dollar-sign', route: '/(admin)/analytics/financials', description: t('analytics.modules.financials.description') },
    { id: 'hr-payroll', title: t('analytics.modules.hrPayroll.title'), icon: 'briefcase', route: '/(admin)/analytics/hr-payroll', description: t('analytics.modules.hrPayroll.description') },
    { id: 'assets', title: t('analytics.modules.assets.title'), icon: 'box', route: '/(admin)/analytics/assets', description: t('analytics.modules.assets.description') },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('analytics.hub.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('analytics.hub.subtitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.listContainer}>
            {analyticsModules.map((item) => (
              <Pressable
                key={item.id}
                style={styles.listItem}
                onPress={() => router.push(item.route as never)}
                android_ripple={{ color: '#F3F4F6' }}
              >
                <View style={styles.listItemContent}>
                  <View style={styles.iconContainer}>
                    <FeatherIcon name={item.icon} size={20} color={BrandColors.teal} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.itemSubtitle}>{item.description}</Text>
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color={BrandColors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: TypographyScale.title,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    marginTop: Spacing.one,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  listContainer: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(50, 127, 116, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  itemSubtitle: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
});
