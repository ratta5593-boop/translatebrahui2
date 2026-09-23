import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { setAdminSession, setGoogleUser, GoogleUserProfile } from '../utils/auth.js';
import { safeFetchJson } from '../utils/api.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'google' | 'admin';
  onAdminLoginSuccess: (username: string) => void;
  onGoogleLoginSuccess: (user: GoogleUserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'google',
  onAdminLoginSuccess,
  onGoogleLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'admin'>(initialTab);

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Google user form state
  const [googleEmail, setGoogleEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setAdminError('Please enter both username and password.');
      return;
    }

    setIsAdminLoading(true);
    setAdminError(null);

    try {
      const res = await safeFetchJson<any>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Invalid credentials. Please check username & password.');
      }

      const data = res.data || {};
      setAdminSession(data.token, data.admin?.username || adminUsername.trim());
      onAdminLoginSuccess(data.admin?.username || adminUsername.trim());
      onClose();
    } catch (err: any) {
      setAdminError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleGoogleSignIn = (customEmail?: string) => {
    setIsGoogleLoading(true);
    setGoogleError(null);

    try {
      const emailToUse = (customEmail || googleEmail.trim() || 'user@gmail.com').toLowerCase();
      const extractedName = emailToUse.split('@')[0];
      const capitalizedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1);

      const userProfile: GoogleUserProfile = {
        name: capitalizedName,
        email: emailToUse,
        id: 'g_' + Math.random().toString(36).substring(2, 9),
      };

      setGoogleUser(userProfile);
      setTimeout(() => {
        setIsGoogleLoading(false);
        onGoogleLoginSuccess(userProfile);
        onClose();
      }, 400);
    } catch (err: any) {
      setIsGoogleLoading(false);
      setGoogleError('Failed to sign in with Google account. Please try again.');
    }
  };

  const handleUseDefaultAdmin = () => {
    setAdminUsername('admin');
    setAdminPassword('admin123');
    setAdminError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <span className="font-amiri text-lg">ب</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Sign In / لاگ ان</h3>
              <p className="text-[11px] text-slate-400">Brahui Translate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('google');
                setAdminError(null);
                setGoogleError(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Google G Logo */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setAdminError(null);
                setGoogleError(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* ================= TAB 1: GOOGLE SIGN IN (REGULAR USERS) ================= */}
          {activeTab === 'google' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="text-center">
                <h4 className="text-base font-bold text-slate-800">Sign in with your Google Account</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Public translation works for everyone without any login. Sign in with Google to contribute verified Brahui corrections under your profile.
                </p>
              </div>

              {googleError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{googleError}</span>
                </div>
              )}

              {/* Primary 1-Click Google Sign-In Button */}
              <button
                type="button"
                id="google-signin-btn"
                disabled={isGoogleLoading}
                onClick={() => handleGoogleSignIn('ratta5593@gmail.com')}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl shadow-xs hover:shadow text-sm font-semibold text-slate-700 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                {isGoogleLoading ? (
                  <span>Signing in with Google...</span>
                ) : (
                  <span>Continue as Google User (ratta5593@gmail.com)</span>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">Or enter any Gmail address</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Custom Google Email input */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn()}
                  disabled={isGoogleLoading || !googleEmail.trim()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </div>

              <div className="text-[11px] text-slate-400 text-center pt-2">
                By signing in, you agree to Google Translate community guidelines for linguistic preservation.
              </div>
            </div>
          )}

          {/* ================= TAB 2: ADMIN LOGIN (USERNAME & PASSWORD) ================= */}
          {activeTab === 'admin' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="text-center">
                <h4 className="text-base font-bold text-slate-800">Admin Portal Authentication</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Secure administrator credentials are required to unlock the top navigation bar, daily reports, and corpus governance.
                </p>
              </div>

              {adminError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="modal-admin-user" className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="modal-admin-user"
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-admin-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="modal-admin-pass"
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="submit-admin-login-btn"
                  disabled={isAdminLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isAdminLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Unlock Admin Dashboard</span>
                    </>
                  )}
                </button>
              </form>

              {/* Demo Credentials Quick Fill */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Default: <strong className="text-slate-800">admin</strong> / <strong className="text-slate-800">admin123</strong></span>
                <button
                  type="button"
                  onClick={handleUseDefaultAdmin}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
