import { useState } from 'react';

export type CommunityTab = 'feed' | 'events' | 'achievements' | 'leaderboard' | 'stats';

export function useCommunityNavigation() {
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');
  return { activeTab, setActiveTab };
}
