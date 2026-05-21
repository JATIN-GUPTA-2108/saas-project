import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization, User } from '@/types/auth';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeOrganization: Organization | null;
  setSession: (payload: {
    user: User;
    accessToken: string;
    refreshToken: string;
    organization?: Organization | null;
  }) => void;
  setActiveOrganization: (org: Organization | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeOrganization: null,
      setSession: ({ user, accessToken, refreshToken, organization }) =>
        set({
          user,
          accessToken,
          refreshToken,
          activeOrganization: organization ?? null,
        }),
      setActiveOrganization: (org) => set({ activeOrganization: org }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeOrganization: null,
        }),
    }),
    { name: 'lms-auth' },
  ),
);
