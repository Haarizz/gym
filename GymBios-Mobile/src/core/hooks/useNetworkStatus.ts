import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  /** True while the initial connectivity check hasn't resolved yet. */
  isLoading: boolean;
}

/**
 * Subscribes to network connectivity changes using @react-native-community/netinfo.
 * Returns `isConnected: true` only when the device has an active internet
 * connection (not just a local network link).
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // optimistically assume connected until first check
    isLoading: true,
  });

  useEffect(() => {
    // Perform an immediate fetch so we get the state without waiting for a
    // change event — important on cold app launch.
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isConnected: !!(state.isConnected && state.isInternetReachable !== false),
        isLoading: false,
      });
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: !!(state.isConnected && state.isInternetReachable !== false),
        isLoading: false,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
