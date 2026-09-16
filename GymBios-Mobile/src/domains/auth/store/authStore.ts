import { create } from 'zustand';

import { setApiClientToken, setApiClientTenant } from '@/core/network/apiClient';
import { setHttpClientToken } from '@/core/platform/api/httpClient';

import type { Session } from '../domain/entities/Session';
import type { User } from '../domain/entities/User';
import type { AppRole } from '../domain/valueObjects/AppRole';

export type PendingDeepLink = {
  type: 'catalog-branch';
  tenantSlug: string;
  branchId: string;
} | null;

interface AuthStoreState {
  user: User | null;
  session: Session | null;
  appRole: AppRole | null;
  permissions: string[];
  pendingRole: AppRole | null;
  isHydrated: boolean;
  activeTenant: string | null;
  pendingDeepLinkIntent: PendingDeepLink;
  setSession: (session: Session | null) => void;
  setPendingRole: (role: AppRole | null) => void;
  setHydrated: (isHydrated: boolean) => void;
  setActiveTenant: (tenant: string | null) => void;
  setPendingDeepLinkIntent: (intent: PendingDeepLink) => void;
  /**
   * Loads the active tenant persisted for this specific user id and applies it,
   * if any. Keying storage per user (see `activeTenantKey`) means a tenant left
   * behind by a *different* account that previously logged in on this device is
   * simply never read here — it's dropped as stale rather than inherited.
   */
  restoreActiveTenantForUser: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  session: null,
  appRole: null,
  permissions: [],
  pendingRole: null,
  isHydrated: false,
  activeTenant: null,
  pendingDeepLinkIntent: null,
  setSession: (session) => {
    setApiClientToken(session?.accessToken ?? null);
    setHttpClientToken(session?.accessToken ?? null);
    
    set({
      session,
      user: session?.user ?? null,
      appRole: session?.appRole ?? null,
      permissions: session ? [...session.permissions] : [],
    });
  },
  setPendingRole: (pendingRole) => set({ pendingRole }),
  setHydrated: (isHydrated) => set({ isHydrated }),
  setPendingDeepLinkIntent: (intent) => set({ pendingDeepLinkIntent: intent }),
  setActiveTenant: (tenant) => {
    setApiClientTenant(tenant);
    set({ activeTenant: tenant });

    // Persist per logged-in user, asynchronously — never under the old shared key,
    // so a stale tenant from a previously logged-in account can't leak forward.
    const userId = get().user?.id;
    if (!userId) return;
    import('@/core/platform/storage').then(({ secureStorage, activeTenantKey }) => {
      const key = activeTenantKey(userId);
      if (tenant) {
        secureStorage.setItem(key, tenant).catch(console.error);
      } else {
        secureStorage.removeItem(key).catch(console.error);
      }
    });
  },
  restoreActiveTenantForUser: async (userId) => {
    const { secureStorage, activeTenantKey, StorageKeys } = await import('@/core/platform/storage');

    // Best-effort cleanup of the old device-wide key from before tenants were
    // scoped per user — nothing reads it anymore, so leaving it around would
    // only be confusing dead data.
    secureStorage.removeItem(StorageKeys.activeTenant).catch(() => {});

    const stored = await secureStorage.getItem(activeTenantKey(userId));
    if (stored) {
      get().setActiveTenant(stored);
    }
  },
  reset: () => {
    setApiClientToken(null);
    setHttpClientToken(null);
    setApiClientTenant(null);

    set({
      user: null,
      session: null,
      appRole: null,
      permissions: [],
      pendingRole: null,
      isHydrated: true,
      activeTenant: null,
    });

    // Deliberately NOT clearing the per-user persisted tenant here — a member's
    // gym doesn't change just because they logged out, and it's keyed by their
    // user id (see setActiveTenant/restoreActiveTenantForUser), so it can never
    // be picked up by a different account that logs in next on this device.
    // restoreActiveTenantForUser (called from login and session-restore) brings
    // it back for THIS user; without it, a global member who logs out and back
    // in would have no way to reach their gym's tenant DB again for the rest of
    // the session (their JWT carries no tenant claim — see
    // AuthService.login/isGlobalUser — so this client-side value is the ONLY
    // thing that routes their requests to the right database at all).
  },
}));

export const selectIsAuthenticated = (state: AuthStoreState) => state.session !== null;
export const selectAppRole = (state: AuthStoreState) => state.appRole;
export const selectPendingRole = (state: AuthStoreState) => state.pendingRole;
