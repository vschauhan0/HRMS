'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function CompanyThemeProvider({ children }: { children: React.ReactNode }) {
  const { selectedCompany, isSuperAdmin, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const root = document.documentElement;

    if (selectedCompany?.themeColor) {
      const color = selectedCompany.themeColor;
      root.style.setProperty('--company-accent', color);
      root.style.setProperty('--company-accent-light', color + '18');
      root.style.setProperty('--company-accent-medium', color + '40');
      root.style.setProperty('--company-accent-strong', color + 'cc');
      root.setAttribute('data-company', selectedCompany.code);
    } else if (isSuperAdmin() && isAuthenticated) {
      // Super admin with no company selected - neutral
      root.style.setProperty('--company-accent', 'var(--foreground)');
      root.style.setProperty('--company-accent-light', 'var(--muted)');
      root.style.setProperty('--company-accent-medium', 'var(--border)');
      root.style.setProperty('--company-accent-strong', 'var(--foreground)');
      root.removeAttribute('data-company');
    } else {
      root.style.removeProperty('--company-accent');
      root.style.removeProperty('--company-accent-light');
      root.style.removeProperty('--company-accent-medium');
      root.style.removeProperty('--company-accent-strong');
      root.removeAttribute('data-company');
    }
  }, [selectedCompany, isSuperAdmin, isAuthenticated]);

  return <>{children}</>;
}