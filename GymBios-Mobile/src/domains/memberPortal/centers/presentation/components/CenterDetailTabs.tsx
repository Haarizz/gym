import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export type CenterDetailTab = 'overview' | 'plans' | 'trainers' | 'info';

interface CenterDetailTabsProps {
  activeTab: CenterDetailTab;
  onSelect: (tab: CenterDetailTab) => void;
}

const TABS: { key: CenterDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'plans', label: 'Plans' },
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
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
    fontWeight: '700',
  },
});
