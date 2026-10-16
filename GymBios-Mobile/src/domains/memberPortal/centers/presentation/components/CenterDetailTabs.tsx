import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Spacing } from '@/core/theme';

export type CenterDetailTab = 'overview' | 'plans' | 'trainers' | 'info';

interface CenterDetailTabsProps {
  activeTab: CenterDetailTab;
  onSelect: (tab: CenterDetailTab) => void;
}

const TABS: CenterDetailTab[] = ['overview', 'plans', 'trainers', 'info'];

export function CenterDetailTabs({ activeTab, onSelect }: CenterDetailTabsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(tab)}
            style={[styles.tab, isActive && styles.activeTab]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{t(`centers.detail.tabs.${tab}`)}</Text>
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
