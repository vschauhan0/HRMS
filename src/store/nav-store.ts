import { create } from 'zustand';
import type { PageRoute } from '@/types';

interface NavState {
  currentPage: PageRoute;
  pageParams: Record<string, any>;
  previousPages: { page: PageRoute; params: Record<string, any> }[];
  navigate: (page: PageRoute, params?: Record<string, any>) => void;
  goBack: () => void;
  setParams: (params: Record<string, any>) => void;
  getParam: (key: string) => any;
}

export const useNavStore = create<NavState>()((set, get) => ({
  currentPage: 'login',
  pageParams: {},
  previousPages: [],

  navigate: (page, params = {}) => {
    const { currentPage, pageParams, previousPages } = get();
    set({
      previousPages: [...previousPages, { page: currentPage, params: pageParams }],
      currentPage: page,
      pageParams: params,
    });
  },

  goBack: () => {
    const { previousPages } = get();
    if (previousPages.length > 0) {
      const prev = previousPages[previousPages.length - 1];
      set({
        currentPage: prev.page,
        pageParams: prev.params,
        previousPages: previousPages.slice(0, -1),
      });
    }
  },

  setParams: (params) => set({ pageParams: params }),
  getParam: (key) => get().pageParams[key],
}));