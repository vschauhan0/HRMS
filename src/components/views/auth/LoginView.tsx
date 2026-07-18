'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { loginSchema, type LoginInput } from '@/lib/validators';
import { apiPost } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

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
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="gradient-mesh absolute inset-0" />

      {/* Floating decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 blur-3xl" style={{ animationDelay: '0s' }} />
        <div className="animate-float absolute top-1/3 -right-16 h-96 w-96 rounded-full bg-violet-500/5 dark:bg-violet-400/5 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-float absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-emerald-500/5 dark:bg-emerald-400/5 blur-3xl" style={{ animationDelay: '4s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, duration: 0.6 }}
          className="w-full max-w-[420px]"
        >
          {/* Card */}
          <div className="glass-strong rounded-2xl p-8 sm:p-10">
            <motion.form
              variants={container}
              initial="hidden"
              animate="show"
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              {/* Logo + Title */}
              <motion.div variants={item} className="flex flex-col items-center gap-3 text-center">
                <div className="animate-pulse-glow relative flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground">
                  <Sparkles className="text-background h-7 w-7" />
                  <div className="animate-spin-slow absolute -inset-1 rounded-2xl border border-dashed border-foreground/10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Salary Portal</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
                </div>
              </motion.div>

              {/* Email */}
              <motion.div variants={item} className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <div className="group relative">
                  <Mail className="text-muted-foreground/60 absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors group-focus-within:text-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="h-11 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus-visible:bg-background focus-visible:shadow-md"
                    {...register('email')}
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-xs font-medium"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={item} className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <div className="group relative">
                  <Lock className="text-muted-foreground/60 absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors group-focus-within:text-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="h-11 rounded-xl border-border/50 bg-background/50 pl-11 pr-11 shadow-sm transition-all focus-visible:bg-background focus-visible:shadow-md"
                    {...register('password')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground/60 hover:text-foreground absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-xs font-medium"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Sign In Button */}
              <motion.div variants={item}>
                <Button
                  type="submit"
                  className="hover-shine group relative h-11 w-full rounded-xl bg-foreground text-background font-medium shadow-md transition-all hover:shadow-lg"
                  disabled={loading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Sign In
                    {!loading && (
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </span>
                </Button>
              </motion.div>
            </motion.form>

            {/* Footer Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-6 flex flex-col items-center gap-3"
            >
              <button
                onClick={() => navigate('forgot-password')}
                className="hover-scale text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Forgot Password?
              </button>

              <div className="h-px w-full max-w-[200px] bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => navigate('register-step-1')}
                  className="hover-scale text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Register
                </button>
                <span className="text-border">·</span>
                <button
                  onClick={() => navigate('appointment-form')}
                  className="hover-scale text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Appointment Form
                </button>
              </div>
            </motion.div>
          </div>

          {/* Bottom branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="mt-6 text-center text-xs text-muted-foreground/60"
          >
            Secure employee salary management
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}