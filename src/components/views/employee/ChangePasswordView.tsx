'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiPost } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, ArrowLeft } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrength } from '@/components/ui/password-strength';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePasswordView() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const goBack = useNavStore((s) => s.goBack);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordForm) => {
    setSubmitting(true);
    try {
      await apiPost('/profile/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password updated successfully');
      reset();
      goBack();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const newPasswordValue = watch('newPassword') || '';

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="-ml-2" onClick={goBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Change Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your account password
        </p>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <PasswordInput
                id="currentPassword"
                placeholder="Enter current password"
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <PasswordInput
                id="newPassword"
                placeholder="Enter new password"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Password Requirements */}
            <PasswordStrength password={newPasswordValue} />

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Confirm new password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}