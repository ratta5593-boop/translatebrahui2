import React from 'react';
import { Languages, ShieldCheck, BookMarked, Cpu, LogOut, User } from 'lucide-react';
import { GoogleUserProfile } from '../utils/auth.js';

export type ActiveTab = 'translator' | 'admin' | 'knowledge' | 'rules';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  rulesCount: number;
  corpusCount: number;
  docsCount: number;
  isAdminAuthenticated: boolean;
  adminUsername?: string;
  onAdminLogout: () => void;
  googleUser: GoogleUserProfile | null;
  onGoogleLogout: () => void;
  onOpenAuthModal: (tab?: 'google' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  rulesCount,
  docsCount,
  isAdminAuthenticated,
  adminUsername = 'admin',
  onAdminLogout,
  googleUser,
  onGoogleLogout,
  onOpenAuthModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
      {/* Primary Brand & User Controls Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              <span className="font-amiri text-2xl font-bold">ب</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-[#1a73e8]">Brahui</span>
                  <span className="text-slate-800">Translate</span>
                  <span className="text-slate-400 font-normal">•</span>
                  <span className="text-slate-700 font-semibold font-amiri text-lg">براہوئی</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Free Instant Translation • English • Urdu • Brahui
              </p>
            </div>
          </div>

          {/* Right Action / Auth Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAdminAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Admin:</span>
                  <span className="truncate max-w-[100px] sm:max-w-none">{adminUsername}</span>
                </div>
                <button
                  type="button"
                  id="header-admin-signout-btn"
                  onClick={onAdminLogout}
                  className="px-2.5 py-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                  title="Sign out of Admin Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Sign Out</span>
                </button>
              </div>
            ) : googleUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                    {googleUser.name.charAt(0) || 'U'}
                  </div>
                  <span className="font-medium max-w-[100px] sm:max-w-[160px] truncate">
                    {googleUser.name}
                  </span>
                </div>
                <button
                  type="button"
                  id="header-user-signout-btn"
                  onClick={onGoogleLogout}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="header-login-btn"
                onClick={() => onOpenAuthModal('google')}
                className="px-3.5 sm:px-4 py-2 bg-white hover:bg-blue-50/60 text-[#1a73e8] border border-slate-300 hover:border-blue-300 rounded-full text-xs font-semibold flex items-center gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                title="Sign in or Admin login"
              >
                <User className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Sign in / لاگ ان</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Header Navigation Bar: Stacks neatly directly under the main header on mobile and desktop */}
      {isAdminAuthenticated && (
        <div className="w-full bg-slate-50/95 border-t border-slate-200/80 backdrop-blur-xs shadow-2xs py-2 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar scroll-smooth">
            <nav className="flex items-center gap-1.5 sm:gap-2 p-1 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs min-w-max">
              <button
                type="button"
                id="tab-translator-btn"
                onClick={() => onTabChange('translator')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'translator'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Languages className="w-4 h-4 text-blue-600" />
                <span>Translator</span>
              </button>

              <button
                type="button"
                id="tab-admin-btn"
                onClick={() => onTabChange('admin')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Admin Daily Report</span>
              </button>

              <button
                type="button"
                id="tab-knowledge-btn"
                onClick={() => onTabChange('knowledge')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'knowledge'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookMarked className="w-4 h-4 text-purple-600" />
                <span>Knowledge Base</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-bold">
                  {docsCount}
                </span>
              </button>

              <button
                type="button"
                id="tab-rules-btn"
                onClick={() => onTabChange('rules')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'rules'
                    ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Learned Rules</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                  {rulesCount}
                </span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
