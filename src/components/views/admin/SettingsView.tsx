'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import type { AuthUser } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Settings, Building2, Bell, UserCircle, LogOut, KeyRound } from 'lucide-react';

interface SettingsData {
  companyName: string;
  companyCode: string;
  notifications: {
    registration: boolean;
    salaryUpload: boolean;
    form16Upload: boolean;
  };
}

export default function SettingsView() {
  const { user, logout } = useAuthStore();
  const { navigate } = useNavStore();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local edit state
  const [companyCode, setCompanyCode] = useState('');
  const [notifRegistration, setNotifRegistration] = useState(true);
  const [notifSalaryUpload, setNotifSalaryUpload] = useState(true);
  const [notifForm16Upload, setNotifForm16Upload] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, authRes] = await Promise.all([
          apiGet<SettingsData>('/settings'),
          apiGet<AuthUser>('/auth/me'),
        ]);

        if (settingsRes) {
          setSettings(settingsRes);
          setCompanyCode(settingsRes.companyCode || '');
          setNotifRegistration(settingsRes.notifications?.registration ?? true);
          setNotifSalaryUpload(settingsRes.notifications?.salaryUpload ?? true);
          setNotifForm16Upload(settingsRes.notifications?.form16Upload ?? true);
        }

        if (authRes) {
          useAuthStore.getState().setUser(authRes);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/settings', {
        companyCode,
        notifications: {
          registration: notifRegistration,
          salaryUpload: notifSalaryUpload,
          form16Upload: notifForm16Upload,
        },
      });
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('login');
  };

  const companyName = settings?.companyName || user?.adminProfile?.company?.name || user?.employee?.company?.name || 'Company';

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* General Settings */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Company Name</Label>
            <Input value={companyName} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyCode">Company Code</Label>
            <Input
              id="companyCode"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              placeholder="Company code"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Registration Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when new employees register</p>
            </div>
            <Switch
              checked={notifRegistration}
              onCheckedChange={setNotifRegistration}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Salary Upload Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when salary slips are uploaded</p>
            </div>
            <Switch
              checked={notifSalaryUpload}
              onCheckedChange={setNotifSalaryUpload}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Form 16 Upload Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when Form 16 documents are uploaded</p>
            </div>
            <Switch
              checked={notifForm16Upload}
              onCheckedChange={setNotifForm16Upload}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Change Password</p>
              <p className="text-xs text-muted-foreground">Update your account password</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('change-password')}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              Change
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Logout</p>
              <p className="text-xs text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          ) : (
            <Settings className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}