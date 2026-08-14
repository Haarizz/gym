import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';

export type PromotionTabType = 'promotions' | 'statistics';

interface PromotionTabsProps {
  activeTab: PromotionTabType;
  onChangeTab: (tab: PromotionTabType) => void;
  promotionsCount?: number;
}

export function PromotionTabs({
  activeTab,
  onChangeTab,
  promotionsCount,
}: PromotionTabsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.tab,
          activeTab === 'promotions' && styles.activeTab,
        ]}
        onPress={() => onChangeTab('promotions')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'promotions' && styles.activeTabText,
          ]}
        >
          Promotions
          {promotionsCount !== undefined ? ` (${promotionsCount})` : ''}
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tab,
          activeTab === 'statistics' && styles.activeTab,
        ]}
        onPress={() => onChangeTab('statistics')}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'statistics' && styles.activeTabText,
          ]}
        >
          Statistics
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: Spacing.half,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  activeTab: {
    backgroundColor: BrandColors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
});
