import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Role, Company } from '@/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  selectedCompany: Company | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  selectCompany: (company: Company) => void;
  hasRole: (roles: Role[]) => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isEmployee: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      selectedCompany: null,

      setAuth: (user, token) => {
        const selectedCompany = user.role === 'EMPLOYEE' ? null :
          user.adminProfile?.company || null;
        set({
          user,
          token,
          isAuthenticated: true,
          selectedCompany,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          selectedCompany: null,
        });
      },

      setUser: (user) => set({ user }),

      selectCompany: (company) => set({ selectedCompany: company }),

      hasRole: (roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      isSuperAdmin: () => get().user?.role === 'SUPER_ADMIN',
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
      },
      isEmployee: () => get().user?.role === 'EMPLOYEE',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        selectedCompany: state.selectedCompany,
      }),
    }
  )
);