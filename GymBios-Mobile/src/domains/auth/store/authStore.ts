import { create } from 'zustand';

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
  setSession: (session: Session | null) => void;
  setPendingRole: (role: AppRole | null) => void;
  setHydrated: (isHydrated: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  session: null,
  appRole: null,
  permissions: [],
  pendingRole: null,
  isHydrated: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      appRole: session?.appRole ?? null,
      permissions: session ? [...session.permissions] : [],
    }),
  setPendingRole: (pendingRole) => set({ pendingRole }),
  setHydrated: (isHydrated) => set({ isHydrated }),
  reset: () =>
    set({
      user: null,
      session: null,
      appRole: null,
      permissions: [],
      pendingRole: null,
      isHydrated: true,
    }),
}));

export const selectIsAuthenticated = (state: AuthStoreState) => state.session !== null;
export const selectAppRole = (state: AuthStoreState) => state.appRole;
export const selectPendingRole = (state: AuthStoreState) => state.pendingRole;
