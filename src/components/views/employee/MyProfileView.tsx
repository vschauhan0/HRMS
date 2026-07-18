'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPut, apiUpload } from '@/lib/api-client';
import type { Employee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Camera, Save, User } from 'lucide-react';

export default function MyProfileView() {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiGet<Employee>('/profile');
        const data = res;
        if (data) {
          setProfile(data);
          setEmail(data.email || '');
          setMobile(data.mobile || '');
          setAddress(data.address || '');
        }
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiUpload<Employee>('/profile/photo', formData);
      if (res) {
        setProfile(res);
        toast.success('Photo updated successfully');
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiPut<Employee>('/profile', {
        email,
        mobile,
        address,
      });
      if (res) {
        setProfile(res);
        toast.success('Profile updated successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>

      {/* Profile Photo Section */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 text-xl">
                <AvatarImage src={profile?.profilePhoto || undefined} alt="Profile" />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold">
                {profile?.firstName} {profile?.lastName}
              </p>
              {profile?.designation && (
                <p className="text-sm text-muted-foreground">{profile.designation}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Employee Code</Label>
              <Input value={profile?.employeeCode || '—'} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Company</Label>
              <Input value={profile?.company?.name || '—'} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Branch</Label>
              <Input value={profile?.branch?.name || '—'} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Department</Label>
              <Input value={profile?.department || '—'} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Designation</Label>
              <Input value={profile?.designation || '—'} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Joining Date</Label>
              <Input
                value={profile?.joiningDate ? formatDate(profile.joiningDate) : '—'}
                readOnly
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">PAN</Label>
              <Input
                value={profile?.pan || '—'}
                readOnly
                className="bg-muted/50"
              />
            </div>
          </div>

          <Separator />

          {/* Editable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile number"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Your address"
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}