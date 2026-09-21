import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../../store/authStore';

export function DeepLinkIntentProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Initial URL on cold start
    Linking.getInitialURL().then(url => {
      if (url) processDeepLink(url);
    });

    // 2. Subsequent URLs while running/backgrounded
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const processDeepLink = (url: string) => {
    try {
      const parsed = Linking.parse(url);
      
      // We look for /catalog/t/<tenantSlug>/b/<branchId>
      // The parsed.path will likely be 'catalog/t/TENANT/b/BRANCH'
      if (parsed.path && parsed.path.startsWith('catalog/t/')) {
        const parts = parsed.path.split('/');
        
        // expected format: catalog / t / <tenantSlug> / b / <branchId>
        if (parts.length >= 5 && parts[1] === 't' && parts[3] === 'b') {
          const tenantSlug = parts[2];
          const branchId = parts[4];
          
          if (tenantSlug && branchId) {
            useAuthStore.getState().setPendingDeepLinkIntent({
              type: 'catalog-branch',
              tenantSlug,
              branchId
            });
          }
        }
      }
    } catch (e) {
      console.warn("DeepLinkIntentProvider failed to parse URL", e);
    }
  };

  return <>{children}</>;
}
