'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardTab } from './leave/DashboardTab';
import { ApplyTab } from './leave/ApplyTab';
import { HistoryTab } from './leave/HistoryTab';

export default function MyLeavesView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Leaves</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your leave balances, apply for leaves, and track history.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-muted/50 w-max sm:w-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="apply">Apply Leave</TabsTrigger>
            <TabsTrigger value="history">Leave History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0 outline-none">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="apply" className="mt-0 outline-none">
          <ApplyTab onApplied={() => setActiveTab('history')} />
        </TabsContent>
        <TabsContent value="history" className="mt-0 outline-none">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}