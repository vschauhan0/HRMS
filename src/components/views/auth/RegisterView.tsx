'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Mail, Lock, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

import {
  requestRegistrationSchema,
  verifyOtpSchema,
  createPasswordSchema,
  type RequestRegistrationInput,
  type VerifyOtpInput,
  type CreatePasswordInput,
} from '@/lib/validators';
import { apiPost } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';

export default function RegisterView() {
  const navigate = useNavStore((s) => s.navigate);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');

  // Step 1 form
  const step1Form = useForm<RequestRegistrationInput>({
    resolver: zodResolver(requestRegistrationSchema),
    defaultValues: { employeeCode: '', email: '' },
  });

  // Step 2 - managed manually via InputOTP
  const [otpError, setOtpError] = useState('');

  // Step 3 form
  const step3Form = useForm<CreatePasswordInput>({
    resolver: zodResolver(createPasswordSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleStep1 = async (data: RequestRegistrationInput) => {
    setLoading(true);
    try {
      const res = await apiPost<{ otp: string }>('/auth/request-registration', data);
      setEmail(data.email);
      toast.success('OTP sent! For demo purposes: ' + res.otp);
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Registration request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    setOtpError('');
    if (otpValue.length !== 6) {
      setOtpError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const data: VerifyOtpInput = { email, otp: otpValue };
      await apiPost('/auth/verify-otp', data);
      step3Form.setValue('email', email);
      setStep(3);
    } catch (error: any) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (data: CreatePasswordInput) => {
    setLoading(true);
    try {
      const res = await apiPost<{ user: any; token: string }>('/auth/create-password', data);
      setAuth(res.user, res.token);
      toast.success('Registration successful!');
      navigate('employee-dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Password creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Employee Registration
          </CardTitle>
          <CardDescription>Create your account to get started</CardDescription>
        </CardHeader>

        {/* Step indicators */}
        <CardContent className="pb-0">
          <div className="flex items-center justify-center gap-2 pb-4">
            {[
              { num: 1, label: 'Verify' },
              { num: 2, label: 'OTP' },
              { num: 3, label: 'Password' },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    step >= s.num
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.num}
                </div>
                {i < 2 && (
                  <div
                    className={`h-px w-8 transition-colors ${
                      step > s.num ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>

        {/* Step 1: Employee Code + Email */}
        {step === 1 && (
          <>
            <CardContent>
              <form onSubmit={step1Form.handleSubmit(handleStep1)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="employeeCode">Employee Code</Label>
                  <div className="relative">
                    <ShieldCheck className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      id="employeeCode"
                      placeholder="e.g. EMP-001"
                      className="pl-10"
                      {...step1Form.register('employeeCode')}
                      disabled={loading}
                    />
                  </div>
                  {step1Form.formState.errors.employeeCode && (
                    <p className="text-destructive text-sm">
                      {step1Form.formState.errors.employeeCode.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      id="reg-email"
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
                  Continue
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

        {/* Step 2: OTP */}
        {step === 2 && (
          <>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="text-center text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
                </div>

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

                <Button onClick={handleStep2} className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Verify OTP
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <button
                onClick={() => {
                  setStep(1);
                  setOtpValue('');
                }}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await apiPost<{ otp: string }>('/auth/request-registration', {
                      employeeCode: step1Form.getValues('employeeCode'),
                      email,
                    });
                    toast.success('OTP resent! For demo: ' + res.otp);
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to resend OTP');
                  }
                }}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                disabled={loading}
              >
                Resend OTP
              </button>
            </CardFooter>
          </>
        )}

        {/* Step 3: Create Password */}
        {step === 3 && (
          <>
            <CardContent>
              <form onSubmit={step3Form.handleSubmit(handleStep3)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password">Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Create a strong password"
                      className="pl-10"
                      {...step3Form.register('password')}
                      disabled={loading}
                    />
                  </div>
                  {step3Form.formState.errors.password && (
                    <p className="text-destructive text-sm">
                      {step3Form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      className="pl-10"
                      {...step3Form.register('confirmPassword')}
                      disabled={loading}
                    />
                  </div>
                  {step3Form.formState.errors.confirmPassword && (
                    <p className="text-destructive text-sm">
                      {step3Form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <button
                onClick={() => setStep(2)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}