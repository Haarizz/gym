import { useTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PillTabBar,
  TAB_BAR_HEIGHT,
  type PillTab,
} from '@/domains/auth/presentation/navigation/RoleTabBar';

import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import type { CommunityTab } from '../hooks/useCommunityNavigation';

export const COMMUNITY_TABS: { key: CommunityTab; icon: PillTab['icon'] }[] = [
  { key: 'feed', icon: 'home' },
  { key: 'events', icon: 'calendar' },
  { key: 'achievements', icon: 'award' },
  { key: 'leaderboard', icon: 'bar-chart-2' },
  { key: 'stats', icon: 'activity' },
];

// Same offset RoleTabsLayout uses, so the pill sits where the role tab bar does.
function useCommunityNavBottom(): number {
  const insets = useSafeAreaInsets();
  return (insets.bottom > 0 ? insets.bottom : 24) + 6;
}

/**
 * Space the floating nav covers at the bottom of the screen. Scrollable
 * sections pad their content by this so the last item clears the pill.
 */
export function useCommunityNavInset(): number {
  return useCommunityNavBottom() + TAB_BAR_HEIGHT;
}

interface CommunityBottomNavProps {
  activeTab: CommunityTab;
  onTabPress: (tab: CommunityTab) => void;
}

export function CommunityBottomNav({ activeTab, onTabPress }: CommunityBottomNavProps) {
  const { t } = useTranslation();
  const { primaryColor } = useCommunityTheme();
  const bottom = useCommunityNavBottom();

  const tabs = useMemo<PillTab[]>(
    () => COMMUNITY_TABS.map(({ key, icon }) => ({ name: key, title: t(`community.nav.${key}`), icon })),
    [t],
  );

  const handlePress = useCallback(
    (name: string) => onTabPress(name as CommunityTab),
    [onTabPress],
  );

  return (
    <PillTabBar
      tabs={tabs}
      activeName={activeTab}
      activeColor={primaryColor}
      hidden={false}
      bottom={bottom}
      onTabPress={handlePress}
    />
  );
}
