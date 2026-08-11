import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

type AnalyticsModule = {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  description?: string;
};

const analyticsModules: AnalyticsModule[] = [
  { id: 'community', title: 'Community', icon: 'users', route: '/(admin)/analytics/community', description: 'Social feed & challenges' },
  { id: 'member-connect', title: 'Member Connect', icon: 'message-square', route: '/(admin)/analytics/member-connect', description: 'Engagement metrics' },
  { id: 'membership', title: 'Membership', icon: 'credit-card', route: '/(admin)/analytics/membership', description: 'Plans & subscriptions' },
  { id: 'attendance', title: 'Attendance', icon: 'calendar', route: '/(admin)/analytics/attendance', description: 'Check-ins & trends' },
  { id: 'facilities', title: 'Facilities', icon: 'map-pin', route: '/(admin)/analytics/facilities', description: 'Usage & bookings' },
  { id: 'sales-purchases', title: 'Sales & Purchases', icon: 'shopping-cart', route: '/(admin)/analytics/sales-purchases', description: 'POS & revenue' },
  { id: 'financials', title: 'Financials', icon: 'dollar-sign', route: '/(admin)/analytics/financials', description: 'Accounting & ledger' },
  { id: 'hr-payroll', title: 'HR & Payroll', icon: 'briefcase', route: '/(admin)/analytics/hr-payroll', description: 'Staff performance' },
  { id: 'assets', title: 'Assets', icon: 'box', route: '/(admin)/analytics/assets', description: 'Equipment lifecycle' },
];

export function AnalyticsHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Hub</Text>
          <Text style={styles.headerSubtitle}>Cross-module performance & insights</Text>
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
                    <Feather name={item.icon} size={20} color={BrandColors.teal} />
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
