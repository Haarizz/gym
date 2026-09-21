import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useRestoreSession } from '@/domains/auth';
import { SlideIn } from '@/shared/components/Animations/SlideIn';

import { ProfileHubScreen } from './ProfileHubScreen';
import { MyProfileScreen } from './MyProfileScreen';
import { MemberReferralsScreen } from '../../../member-referrals/presentation/screens/MemberReferralsScreen';
import { MyPerformanceScreen } from './MyPerformanceScreen';
import { TransactionsScreen } from './TransactionsScreen';
import { SettingsScreen } from './SettingsScreen';

const SLIDE_DURATION = 320;

export type ProfileView =
  | 'hub'
  | 'my-profile'
  | 'referrals'
  | 'my-performance'
  | 'transactions'
  | 'settings';

const VALID_VIEWS: ProfileView[] = ['hub', 'my-profile', 'referrals', 'my-performance', 'transactions', 'settings'];

export function ProfileScreen() {
  const router = useRouter();
  const { logout } = useRestoreSession();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [activeView, setActiveView] = useState<ProfileView>('hub');
  const [isExiting, setIsExiting] = useState(false);
  const [enterKey, setEnterKey] = useState(0);

  // Lets a deep link (e.g. a "New Reward Generated" push notification) jump straight
  // to a specific section — /profile?view=referrals — instead of always opening the hub.
  useEffect(() => {
    if (view && (VALID_VIEWS as string[]).includes(view)) {
      setActiveView(view as ProfileView);
    }
  }, [view]);

  // The Tabs navigator keeps this screen mounted across blur/focus rather
  // than remounting it, so SlideIn's own mount-triggered entrance wouldn't
  // replay on a second tap of the profile icon. Bumping `enterKey` forces a
  // fresh SlideIn instance (and a fresh entrance animation) on every focus.
  useFocusEffect(
    useCallback(() => {
      setIsExiting(false);
      setEnterKey((key) => key + 1);
    }, [])
  );

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      router.back();
    }, SLIDE_DURATION);
  }, [router]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  let content: ReactNode;
  switch (activeView) {
    case 'my-profile':
      content = <MyProfileScreen onBack={() => setActiveView('hub')} />;
      break;
    case 'referrals':
      // Currently the referrals screen has its own back button logic to use router.back(), 
      // but inside this slide-in view it should probably go back to the hub. Wait, 
      // the existing MemberReferralsScreen does router.back().
      // I should update MemberReferralsScreen to take an onBack prop if it's rendered here.
      // For now, I'll just render it. It's safe to use router.back() if it's an Expo Router screen,
      // but here it's rendered conditionally. Let's pass the onBack if needed.
      content = <MemberReferralsScreen onBack={() => setActiveView('hub')} />;
      break;
    case 'my-performance':
      content = <MyPerformanceScreen onBack={() => setActiveView('hub')} />;
      break;
    case 'transactions':
      content = <TransactionsScreen onBack={() => setActiveView('hub')} />;
      break;
    case 'settings':
      content = <SettingsScreen onBack={() => setActiveView('hub')} />;
      break;
    case 'hub':
    default:
      content = (
        <ProfileHubScreen
          onClose={handleClose}
          onNavigateToProfile={() => setActiveView('my-profile')}
          onNavigateToReferrals={() => setActiveView('referrals')}
          onNavigateToPerformance={() => setActiveView('my-performance')}
          onNavigateToTransactions={() => setActiveView('transactions')}
          onNavigateToSettings={() => setActiveView('settings')}
          onLogout={handleLogout}
        />
      );
  }

  // The whole profile module slides in from the left when the profile icon
  // is tapped — this same SlideIn instance persists across activeView
  // changes, so switching between hub / my-profile / etc. doesn't replay it.
  return (
    <SlideIn
      key={enterKey}
      left
      duration={SLIDE_DURATION}
      isExiting={isExiting}
      style={styles.slideIn}
    >
      {content}
    </SlideIn>
  );
}

const styles = StyleSheet.create({
  slideIn: {
    flex: 1,
  },
});
