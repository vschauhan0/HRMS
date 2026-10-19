import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Role, Company, Branch } from '@/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  selectedCompany: Company | null;
  selectedBranch: Branch | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  clearCompany: () => void;
  selectCompany: (company: Company | null) => void;
  selectBranch: (branch: Branch | null) => void;
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
      selectedBranch: null,

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

      clearCompany: () => set({ selectedCompany: null, selectedBranch: null }),
      selectCompany: (company) => set({ selectedCompany: company, selectedBranch: null }),
      selectBranch: (branch) => set({ selectedBranch: branch }),

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
        selectedBranch: state.selectedBranch,
      }),
    }
  )
);