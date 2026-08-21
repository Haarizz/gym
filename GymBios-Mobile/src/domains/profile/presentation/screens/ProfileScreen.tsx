import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';

import { useRestoreSession } from '@/domains/auth';

import { ProfileHubScreen } from './ProfileHubScreen';
import { MyProfileScreen } from './MyProfileScreen';
import { MyTargetsScreen } from './MyTargetsScreen';
import { MyPerformanceScreen } from './MyPerformanceScreen';
import { TransactionsScreen } from './TransactionsScreen';
import { SettingsScreen } from './SettingsScreen';

export type ProfileView =
  | 'hub'
  | 'my-profile'
  | 'my-targets'
  | 'my-performance'
  | 'transactions'
  | 'settings';

export function ProfileScreen() {
  const router = useRouter();
  const { logout } = useRestoreSession();
  const [activeView, setActiveView] = useState<ProfileView>('hub');

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  switch (activeView) {
    case 'my-profile':
      return <MyProfileScreen onBack={() => setActiveView('hub')} />;
    case 'my-targets':
      return <MyTargetsScreen onBack={() => setActiveView('hub')} />;
    case 'my-performance':
      return <MyPerformanceScreen onBack={() => setActiveView('hub')} />;
    case 'transactions':
      return <TransactionsScreen onBack={() => setActiveView('hub')} />;
    case 'settings':
      return <SettingsScreen onBack={() => setActiveView('hub')} />;
    case 'hub':
    default:
      return (
        <ProfileHubScreen
          onClose={handleClose}
          onNavigateToProfile={() => setActiveView('my-profile')}
          onNavigateToTargets={() => setActiveView('my-targets')}
          onNavigateToPerformance={() => setActiveView('my-performance')}
          onNavigateToTransactions={() => setActiveView('transactions')}
          onNavigateToSettings={() => setActiveView('settings')}
          onLogout={handleLogout}
        />
      );
  }
}
