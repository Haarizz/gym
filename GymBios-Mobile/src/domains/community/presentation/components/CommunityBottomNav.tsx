import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

import type { CommunityTab } from '../hooks/useCommunityNavigation';

interface TabConfig {
  key: CommunityTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const TABS: TabConfig[] = [
  { key: 'feed', label: 'Feed', icon: 'home' },
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'achievements', label: 'Achieve', icon: 'award' },
  { key: 'leaderboard', label: 'Board', icon: 'bar-chart-2' },
  { key: 'stats', label: 'Stats', icon: 'activity' },
];


const INprimaryColor = '#94A3B8';

interface CommunityBottomNavProps {
  activeTab: CommunityTab;
  onTabPress: (tab: CommunityTab) => void;
}

export function CommunityBottomNav({ activeTab, onTabPress }: CommunityBottomNavProps) {
  const { primaryColor, headerColors } = useCommunityTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 8 : 12) },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const color = isActive ? primaryColor : INprimaryColor;

        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => onTabPress(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            hitSlop={4}
          >
            <Feather name={tab.icon} size={22} color={color} />
            <Typography
              variant="caption"
              style={[styles.label, { color }]}
            >
              {tab.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ECEBF2',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
