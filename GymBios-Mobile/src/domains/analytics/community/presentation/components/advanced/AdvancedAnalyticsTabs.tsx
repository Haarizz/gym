import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

export type AdvancedAnalyticsTab = 'churn' | 'trainer' | 'engagement' | 'profitability';

interface AdvancedAnalyticsTabsProps {
  selectedTab: AdvancedAnalyticsTab;
  onSelectTab: (tab: AdvancedAnalyticsTab) => void;
}

const TABS: { key: AdvancedAnalyticsTab; label: string }[] = [
  { key: 'churn', label: 'Churn' },
  { key: 'trainer', label: 'Trainer' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'profitability', label: 'Profitability' },
];

export function AdvancedAnalyticsTabs({
  selectedTab,
  onSelectTab,
}: AdvancedAnalyticsTabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map(tab => {
          const isActive = selectedTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => onSelectTab(tab.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Typography
                variant="bodySmallBold"
                style={[styles.tabText, isActive && styles.activeTabText]}
              >
                {tab.label}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Radius.full,
    padding: 4,
    marginVertical: Spacing.two,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: BrandColors.teal,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  activeTabText: {
    color: '#ffffff',
  },
});
