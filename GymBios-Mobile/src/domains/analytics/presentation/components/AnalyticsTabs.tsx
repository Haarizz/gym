import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { AnalyticsPeriod } from '../../hooks/useAdminAnalytics';

export type AnalyticsTab = 'membership' | 'bookings' | 'pos';

export function AnalyticsTabs({ selected, onSelect }: { selected: AnalyticsTab; onSelect: (tab: AnalyticsTab) => void }) {
  const { t } = useTranslation();
  const tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'membership', label: t('analytics.tabs.membership') },
    { key: 'bookings', label: t('analytics.tabs.bookings') },
    { key: 'pos', label: t('analytics.tabs.pos') },
  ];

  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = selected === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PERIODS: AnalyticsPeriod[] = ['month', 'last_month', '3m', '12m'];

export function PeriodSelector({ selected, onSelect }: { selected: AnalyticsPeriod; onSelect: (p: AnalyticsPeriod) => void }) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
      {PERIODS.map((p) => {
        const isActive = p === selected;
        return (
          <Pressable
            key={p}
            onPress={() => onSelect(p)}
            style={[styles.chip, isActive && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{t(`analytics.periods.${p}`)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.md },
  activeTab: {
    backgroundColor: BrandColors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabLabel: { fontSize: TypographyScale.small, fontWeight: '500', color: BrandColors.textSecondary },
  activeTabLabel: { color: BrandColors.textPrimary, fontWeight: '600' },

  periods: { gap: Spacing.two, paddingBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: BrandColors.teal, borderColor: BrandColors.teal },
  chipText: { fontSize: TypographyScale.small, fontWeight: '500', color: BrandColors.textSecondary },
  chipTextActive: { color: BrandColors.white },
});
