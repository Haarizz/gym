import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';

export type CenterDetailTab = 'overview' | 'plans' | 'trainers' | 'info';

interface CenterDetailTabsProps {
  activeTab: CenterDetailTab;
  onSelect: (tab: CenterDetailTab) => void;
}

const TABS: { key: CenterDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'plans', label: 'Subscriptions' },
  { key: 'trainers', label: 'Trainers' },
  { key: 'info', label: 'Info' },
];

export function CenterDetailTabs({ activeTab, onSelect }: CenterDetailTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Full-width underline tabs — active tab gets a gold underline and amber label.
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: BrandColors.surface,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTab: {
    borderColor: BrandColors.memberGold,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeLabel: {
    color: BrandColors.trainerAmber,
  },
});
