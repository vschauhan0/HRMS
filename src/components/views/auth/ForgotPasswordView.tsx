'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

import {
  forgotPasswordSchema,
  createPasswordSchema,
  type ForgotPasswordInput,
  type CreatePasswordInput,
} from '@/lib/validators';
import { apiPost } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';

export default function ForgotPasswordView() {
  const navigate = useNavStore((s) => s.navigate);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  const step1Form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const step2Form = useForm<CreatePasswordInput>({
    resolver: zodResolver(createPasswordSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleStep1 = async (data: ForgotPasswordInput) => {
    setLoading(true);
    try {
      const res = await apiPost<{ otp: string }>('/auth/forgot-password', data);
      setEmail(data.email);
      toast.success('OTP sent! For demo purposes: ' + res.otp);
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (formData: CreatePasswordInput) => {
    if (otpValue.length !== 6) {
      setOtpError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/auth/reset-password', {
        email,
        otp: otpValue,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      toast.success('Password reset successfully! Please sign in.');
      navigate('login');
    } catch (error: any) {
      toast.error(error.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Reset Password
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Enter your email to receive a reset code'
              : 'Enter the code and your new password'}
          </CardDescription>
        </CardHeader>

        {/* Step 1: Email */}
        {step === 1 && (
          <>
            <CardContent>
              <form onSubmit={step1Form.handleSubmit(handleStep1)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@company.com"
                      className="pl-10"
                      {...step1Form.register('email')}
                      disabled={loading}
                    />
                  </div>
                  {step1Form.formState.errors.email && (
                    <p className="text-destructive text-sm">
                      {step1Form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Send Reset Code
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <button
                onClick={() => navigate('login')}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to Login
              </button>
            </CardFooter>
          </>
        )}

        {/* Step 2: OTP + New Password */}
        {step === 2 && (
          <>
            <CardContent>
              <form onSubmit={step2Form.handleSubmit(handleStep2)} className="flex flex-col gap-4">
                <div className="text-center text-sm text-muted-foreground">
                  Code sent to <span className="font-medium text-foreground">{email}</span>
                </div>

                {/* OTP */}
                <div className="flex flex-col gap-2">
                  <Label>Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={(value) => {
                        setOtpValue(value);
                        setOtpError('');
                      }}
                      disabled={loading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {otpError && (
                    <p className="text-center text-destructive text-sm">{otpError}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      className="pl-10"
                      {...step2Form.register('password')}
                      disabled={loading}
                    />
                  </div>
                  {step2Form.formState.errors.password && (
                    <p className="text-destructive text-sm">
                      {step2Form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Confirm new password"
                      className="pl-10"
                      {...step2Form.register('confirmPassword')}
                      disabled={loading}
                    />
                  </div>
                  {step2Form.formState.errors.confirmPassword && (
                    <p className="text-destructive text-sm">
                      {step2Form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Reset Password
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await apiPost<{ otp: string }>('/auth/forgot-password', { email });
                    toast.success('OTP resent! For demo: ' + res.otp);
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to resend OTP');
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                disabled={loading}
              >
                Resend Code
              </button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}