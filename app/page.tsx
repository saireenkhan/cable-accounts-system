'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/app/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if rate limited
    if (isRateLimited) {
      toast.error(`Please wait ${countdown} seconds before trying again`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Login successful!');
        setRetryCount(0);
        setIsRateLimited(false);
        router.push('/dashboard');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Invalid email or password';
      
      // Handle rate limiting (429)
      if (status === 429) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        if (newRetryCount >= 3) {
          setIsRateLimited(true);
          setCountdown(30);
          toast.error('Too many login attempts. Please wait 30 seconds.');
          
          // Start countdown
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                setIsRateLimited(false);
                setRetryCount(0);
                toast.success('You can try logging in again now.');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          const waitTime = Math.pow(2, newRetryCount) * 1000;
          toast.error(`Rate limited. Retrying in ${waitTime/1000} seconds...`);
          setError(`Too many requests. Please wait ${waitTime/1000} seconds.`);
          
          // Auto retry after wait time
          setTimeout(() => {
            if (!isRateLimited) {
              handleSubmit(e);
            }
          }, waitTime);
        }
      } else {
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@cable.com');
    setPassword('Admin@123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
            <span className="text-white font-bold text-2xl">SR</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Smart-Recovery
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in to manage your cable business
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-800/50 border border-gray-100 dark:border-gray-700 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span className="text-lg mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {isRateLimited && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span className="text-lg mt-0.5">⏳</span>
                <span>Too many attempts. Please wait <strong>{countdown}</strong> seconds.</span>
              </div>
            )}

            {retryCount > 0 && !isRateLimited && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span className="text-lg mt-0.5">🔄</span>
                <span>Attempt {retryCount + 1}/3. Rate limit may apply.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cable.com"
                required
                disabled={isRateLimited}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isRateLimited}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                Remember me
              </label>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Use demo credentials
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || isRateLimited}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : isRateLimited ? (
                `Wait ${countdown}s`
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
              Demo: <span className="font-mono">admin@cable.com</span> /{' '}
              <span className="font-mono">Admin@123</span>
            </div>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} Smart-Recovery Management 
        </div>
      </div>
    </div>
  );
}