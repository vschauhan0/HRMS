'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, GitBranch } from 'lucide-react';
import CompanyListView from './CompanyListView';
import BranchListView from './BranchListView';

export default function OrganizationView() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Branches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="m-0">
          <CompanyListView />
        </TabsContent>

        <TabsContent value="branches" className="m-0">
          <BranchListView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
