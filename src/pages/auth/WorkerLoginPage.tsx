import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Wrench, ShieldAlert, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';

interface WorkerLoginForm {
  email: string;
  password: string;
  remember: boolean;
}

export default function WorkerLoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<WorkerLoginForm>();

  const onSubmit = async (data: WorkerLoginForm) => {
    setLoading(true);
    setBlocked(null);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      toast(error, 'error');
      setLoading(false);
      return;
    }

    // Check worker status
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) { setLoading(false); return; }

    const { data: worker } = await supabase.from('workers').select('status').eq('id', userId).maybeSingle();

    if (!worker) {
      // Not a worker account
      toast('This account is not registered as a worker.', 'error');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (worker.status === 'pending') {
      setBlocked('pending');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (worker.status === 'rejected') {
      setBlocked('rejected');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (worker.status === 'suspended') {
      setBlocked('suspended');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    toast('Welcome back!', 'success');
    navigate('/worker');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl text-gray-900 dark:text-white mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            worker<span className="text-blue-600 dark:text-blue-400">.com</span>
          </Link>
          <p className="text-gray-500 dark:text-gray-400">Worker Login</p>
        </div>

        {blocked && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 p-6 mb-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {blocked === 'pending' && 'Verification Pending'}
              {blocked === 'rejected' && 'Registration Rejected'}
              {blocked === 'suspended' && 'Account Suspended'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {blocked === 'pending' && 'Your profile is under review by our admin team. You will be able to login once approved.'}
              {blocked === 'rejected' && 'Your registration was rejected. Please update your profile and resubmit.'}
              {blocked === 'suspended' && 'Your account has been suspended. Please contact support for assistance.'}
            </p>
            <button onClick={() => setBlocked(null)} className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
              Back to Login
            </button>
          </div>
        )}

        {!blocked && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('email', { required: 'Email is required' })}
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input type="checkbox" {...register('remember')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Forgot password?</Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Not a worker yet?{' '}
              <Link to="/register-worker" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Register as Worker</Link>
            </div>
            <div className="mt-2 text-center text-sm">
              <Link to="/login" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">User Login</Link>
              <span className="mx-2 text-gray-300">|</span>
              <Link to="/admin-login" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Admin Login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
