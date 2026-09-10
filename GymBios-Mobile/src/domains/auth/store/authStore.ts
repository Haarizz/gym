import { create } from 'zustand';

import { setApiClientToken, setApiClientTenant } from '@/core/network/apiClient';
import { setHttpClientToken } from '@/core/platform/api/httpClient';

import type { Session } from '../domain/entities/Session';
import type { User } from '../domain/entities/User';
import type { AppRole } from '../domain/valueObjects/AppRole';

interface AuthStoreState {
  user: User | null;
  session: Session | null;
  appRole: AppRole | null;
  permissions: string[];
  pendingRole: AppRole | null;
  isHydrated: boolean;
  activeTenant: string | null;
  setSession: (session: Session | null) => void;
  setPendingRole: (role: AppRole | null) => void;
  setHydrated: (isHydrated: boolean) => void;
  setActiveTenant: (tenant: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  session: null,
  appRole: null,
  permissions: [],
  pendingRole: null,
  isHydrated: false,
  activeTenant: null,
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
  setActiveTenant: (tenant) => {
    setApiClientTenant(tenant);
    set({ activeTenant: tenant });
    // Persist to secure storage asynchronously
    import('@/core/platform/storage').then(({ secureStorage, StorageKeys }) => {
      if (tenant) {
        secureStorage.setItem(StorageKeys.activeTenant, tenant).catch(console.error);
      } else {
        secureStorage.removeItem(StorageKeys.activeTenant).catch(console.error);
      }
    });
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

    // Deliberately NOT clearing activeTenant from secure storage here — a member's
    // gym doesn't change just because they logged out. Login (see useLogin.onSuccess)
    // restores it from storage the same way session-restore already does; if it were
    // wiped here, a global member who logs out and back in would have no way to
    // reach their gym's tenant DB again for the rest of the session (their JWT
    // carries no tenant claim — see AuthService.login/isGlobalUser — so this
    // client-side value is the ONLY thing that routes their requests to the right
    // database at all).
  },
}));

export const selectIsAuthenticated = (state: AuthStoreState) => state.session !== null;
export const selectAppRole = (state: AuthStoreState) => state.appRole;
export const selectPendingRole = (state: AuthStoreState) => state.pendingRole;
