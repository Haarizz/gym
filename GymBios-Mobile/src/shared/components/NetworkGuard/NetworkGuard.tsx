import { type ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { useNetworkStatus } from '@/core/hooks';
import { NoInternetScreen } from '@/shared/components/NoInternetScreen';

interface NetworkGuardProps {
  children: ReactNode;
}

// ─── DEV PREVIEW ────────────────────────────────────────────────────────────
// Set to `true` locally to force the offline screen without turning off Wi-Fi.
// Must be `false` before committing.
const DEV_PREVIEW_OFFLINE = false;
// ────────────────────────────────────────────────────────────────────────────


/**
 * Wraps the entire app tree. When the device has no internet connection it
 * renders a full-screen `NoInternetScreen` instead of the children, preventing
 * any tab bars, role-specific layouts, or API calls from mounting.
 *
 * The guard is placed inside `AppProviders` (above `AuthBootstrap`) so it is
 * active for every user role and even the unauthenticated flow.
 *
 * During the brief initial check we optimistically render children to avoid a
 * flash of the offline screen on fast connections.
 */
export function NetworkGuard({ children }: NetworkGuardProps) {
  const { isConnected, isLoading } = useNetworkStatus();

  if (DEV_PREVIEW_OFFLINE) {
    return <NoInternetScreen onRetry={() => {}} />;
  }

  // While we haven't resolved the first connectivity check yet (isLoading),
  // render children optimistically — it prevents a flash of the offline
  // screen on devices that have connectivity.
  if (isLoading || isConnected) {
    return <>{children}</>;
  }

  const handleRetry = () => {
    // Re-fetch connectivity state; the hook's event listener will update state
    // automatically when NetInfo reports a change, but the user pressing Retry
    // forces an immediate re-check.
    NetInfo.fetch();
  };

  return <NoInternetScreen onRetry={handleRetry} />;
}
