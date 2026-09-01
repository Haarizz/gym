import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export type TabType = 'members' | 'walkIn';

interface StaffCheckInTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function StaffCheckInTabs({ activeTab, onTabChange }: StaffCheckInTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'members' && styles.activeTab]}
        onPress={() => onTabChange('members')}
        activeOpacity={0.7}
      >
        <Typography
          variant="bodySmallBold"
          color={activeTab === 'members' ? undefined : 'textSecondary'}
          style={activeTab === 'members' ? { color: 'white' } : undefined}
        >
          Members & Staff
        </Typography>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'walkIn' && styles.activeTab]}
        onPress={() => onTabChange('walkIn')}
        activeOpacity={0.7}
      >
        <Typography
          variant="bodySmallBold"
          color={activeTab === 'walkIn' ? undefined : 'textSecondary'}
          style={activeTab === 'walkIn' ? { color: 'white' } : undefined}
        >
          Walk-In / Daily
        </Typography>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9', // fallback for backgroundLight
    padding: Spacing.one,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  activeTab: {
    backgroundColor: BrandColors.teal,
  },
});
