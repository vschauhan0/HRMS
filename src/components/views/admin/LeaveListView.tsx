'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardTab } from './leave/DashboardTab';
import { RequestsTab } from './leave/RequestsTab';
import { LeaveBalancesTab } from './leave/LeaveBalancesTab';
import { LeaveTypesTab } from './leave/LeaveTypesTab';
import { HolidaysTab } from './leave/HolidaysTab';

export default function LeaveListView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage employee leaves, balances, types, and company holidays.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-muted/50 w-max sm:w-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Leave Requests</TabsTrigger>
            <TabsTrigger value="balances">Leave Balances</TabsTrigger>
            <TabsTrigger value="types">Leave Types</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0 outline-none">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="requests" className="mt-0 outline-none">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="balances" className="mt-0 outline-none">
          <LeaveBalancesTab />
        </TabsContent>
        <TabsContent value="types" className="mt-0 outline-none">
          <LeaveTypesTab />
        </TabsContent>
        <TabsContent value="holidays" className="mt-0 outline-none">
          <HolidaysTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}