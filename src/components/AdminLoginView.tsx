import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, Eye, EyeOff, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { setAdminSession } from '../utils/auth.js';
import { safeFetchJson } from '../utils/api.js';

interface AdminLoginViewProps {
  onLoginSuccess: (username: string) => void;
  onCancel: () => void;
  targetSectionTitle?: string;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onCancel,
  targetSectionTitle = 'Admin Portal',
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await safeFetchJson<any>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Authentication failed. Please check your credentials.');
      }

      const data = res.data || {};
      setAdminSession(data.token, data.admin?.username || username.trim());
      onLoginSuccess(data.admin?.username || username.trim());
    } catch (err: any) {
      setError(err.message || 'Login error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDefaultCredentials = () => {
    setUsername('admin');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 animate-in fade-in-50 duration-300">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
        {/* Header with Lock Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Admin Authentication</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access to <span className="font-semibold text-slate-700">{targetSectionTitle}</span>, corpus exports, and knowledge base ingestion requires administrator credentials.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in shake duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Admin Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-all"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-all"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In as Admin</span>
              </>
            )}
          </button>
        </form>

        {/* Credentials Helper & Quick Fill */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Default Admin Credentials:</span>
            <button
              type="button"
              onClick={handleUseDefaultCredentials}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
            >
              Auto-fill
            </button>
          </div>
          <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span>Username: <strong className="text-slate-800">admin</strong></span>
            <span>Password: <strong className="text-slate-800">admin123</strong></span>
          </div>
        </div>

        {/* Return to Translator link */}
        <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Brahui Translate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
