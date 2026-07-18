'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { apiGet } from '@/lib/api-client';
import type { Company } from '@/types';

export function CompanySwitcher() {
  const { user, isSuperAdmin, selectedCompany, selectCompany } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allOption, setAllOption] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin()) return;
    apiGet<Company[]>('/companies?pageSize=100').then((res) => {
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      setCompanies(list);
    }).catch(() => {});
  }, [isSuperAdmin]);

  // Auto-select first company if none selected and companies loaded
  useEffect(() => {
    if (!isSuperAdmin() || !companies.length || selectedCompany) return;
    selectCompany(companies[0]);
  }, [companies, selectedCompany, isSuperAdmin, selectCompany]);

  if (!isSuperAdmin() || companies.length === 0) return null;

  const handleSelect = (company: Company | null) => {
    if (company) {
      setAllOption(false);
      selectCompany(company);
    } else {
      setAllOption(true);
      selectCompany(null as any);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* All Companies pill */}
      <button
        onClick={() => handleSelect(null)}
        className={`company-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          allOption
            ? 'data-[active=true]'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        data-active={allOption}
      >
        <div className="w-2 h-2 rounded-full bg-foreground/60" />
        <span className="hidden sm:inline">All</span>
      </button>

      <div className="h-4 w-px bg-border" />

      {/* Company pills */}
      {companies.map((company) => {
        const isActive = selectedCompany?.id === company.id;
        return (
          <motion.button
            key={company.id}
            onClick={() => handleSelect(company)}
            className={`company-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? ''
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-active={isActive}
            whileTap={{ scale: 0.96 }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: company.themeColor }}
            />
            <span className="hidden sm:inline">{company.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}