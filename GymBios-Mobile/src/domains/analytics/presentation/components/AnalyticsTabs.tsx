import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export type AnalyticsTab = 'overview' | 'revenue' | 'operations';

interface AnalyticsTabsProps {
  selected: AnalyticsTab;
  onSelect: (tab: AnalyticsTab) => void;
}

export function AnalyticsTabs({ selected, onSelect }: AnalyticsTabsProps) {
  const tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'operations', label: 'Operations' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = selected === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: Radius.lg,
    marginBottom: Spacing.four,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  activeTab: {
    backgroundColor: BrandColors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: TypographyScale.small,
    fontWeight: '500',
    color: BrandColors.textSecondary,
  },
  activeLabel: {
    color: BrandColors.textPrimary,
    fontWeight: '600',
  },
});
