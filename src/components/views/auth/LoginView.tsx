'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { loginSchema, type LoginInput } from '@/lib/validators';
import { apiPost } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';

export default function LoginView() {
  const navigate = useNavStore((s) => s.navigate);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const res = await apiPost<{ token: string; user: any }>('/auth/login', data);
      setAuth(res.user, res.token);

      // Navigate based on role
      const role = res.user?.role;
      if (role === 'SUPER_ADMIN') {
        navigate('admin-dashboard');
      } else if (role === 'ADMIN') {
        navigate('admin-dashboard');
      } else if (role === 'EMPLOYEE') {
        navigate('employee-dashboard');
      } else {
        navigate('login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Salary Portal
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-10"
                  {...register('email')}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  {...register('password')}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <button
            onClick={() => navigate('forgot-password')}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Forgot Password?
          </button>

          <div className="bg-border h-px w-full" />

          <button
            onClick={() => navigate('register-step-1')}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Register as Employee
          </button>

          <button
            onClick={() => navigate('appointment-form')}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Submit Appointment Form
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}