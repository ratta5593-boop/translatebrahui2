/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header.js';
import { TranslationView } from './components/TranslationView.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { KnowledgeBaseView } from './components/KnowledgeBaseView.js';
import { RulesCatalogView } from './components/RulesCatalogView.js';
import { AuthModal } from './components/AuthModal.js';
import { GrammarRule } from './types/index.js';
import {
  getAdminToken,
  clearAdminSession,
  getAdminUsername,
  getGoogleUser,
  clearGoogleUser,
  GoogleUserProfile
} from './utils/auth.js';
import { safeFetchJson } from './utils/api.js';
import { useRealtimeStats, useRealtimeNewRule } from './services/realtimeSync.js';
import { Sparkles, Radio } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('translator');
  const [rulesCount, setRulesCount] = useState(5);
  const [corpusCount, setCorpusCount] = useState(6);
  const [docsCount, setDocsCount] = useState(2);
  const [recentlyLearnedNotification, setRecentlyLearnedNotification] = useState<GrammarRule | null>(null);

  // Authentication States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('admin');
  const [googleUser, setGoogleUserState] = useState<GoogleUserProfile | null>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'google' | 'admin'>('google');

  const refreshStats = async () => {
    try {
      const res = await safeFetchJson<{ rulesCount: number; corpusCount: number; docsCount: number }>('/api/public/stats');
      if (res.ok && res.data) {
        setRulesCount(res.data.rulesCount ?? 0);
        setCorpusCount(res.data.corpusCount ?? 0);
        setDocsCount(res.data.docsCount ?? 0);
      }
    } catch (err) {
      console.warn('Failed to refresh public stats from server:', err);
    }
  };

  // URL Hash Handler (#admin)
  const checkUrlHash = useCallback((isAdmin: boolean) => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.toLowerCase();

    if (hash === '#admin') {
      if (isAdmin) {
        setActiveTab('admin');
      } else {
        // Prompt Admin Login Modal
        setAuthModalTab('admin');
        setIsAuthModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    refreshStats();

    // Subscribe to real-time cross-device Firebase Firestore synchronizer
    const unsubStats = useRealtimeStats((stats) => {
      setRulesCount(stats.rulesCount);
      setCorpusCount(stats.corpusCount);
      if (stats.docsCount > 0) setDocsCount(stats.docsCount);
    });

    const unsubNewRule = useRealtimeNewRule((newRule) => {
      setRecentlyLearnedNotification(newRule);
      setTimeout(() => setRecentlyLearnedNotification(null), 7000);
    });

    // Check for existing Google User session
    const existingGoogleUser = getGoogleUser();
    if (existingGoogleUser) {
      setGoogleUserState(existingGoogleUser);
    }

    // Check if valid admin session token already exists in localStorage
    const token = getAdminToken();
    if (token) {
      safeFetchJson<{ authenticated: boolean; admin?: { username: string } }>('/api/admin/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok && res.data && res.data.authenticated) {
            setIsAdminAuthenticated(true);
            setAdminUsername(res.data.admin?.username || getAdminUsername() || 'admin');
            checkUrlHash(true);
          } else {
            clearAdminSession();
            setIsAdminAuthenticated(false);
            checkUrlHash(false);
          }
        })
        .catch(() => {
          clearAdminSession();
          setIsAdminAuthenticated(false);
          checkUrlHash(false);
        });
    } else {
      checkUrlHash(false);
    }

    // Listen for URL hash changes (e.g. user manually types #admin in address bar)
    const handleHashChange = () => {
      const currentToken = getAdminToken();
      checkUrlHash(Boolean(currentToken));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubStats();
      unsubNewRule();
    };
  }, [checkUrlHash]);

  const handleAdminLoginSuccess = (username: string) => {
    setIsAdminAuthenticated(true);
    setAdminUsername(username);
    setActiveTab('admin');
    window.location.hash = '#admin';
    refreshStats();
  };

  const handleGoogleLoginSuccess = (user: GoogleUserProfile) => {
    setGoogleUserState(user);
    // Regular user remains on the clean translator
    setActiveTab('translator');
  };

  const handleAdminLogout = async () => {
    const token = getAdminToken();
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        // ignore network error on logout
      }
    }
    clearAdminSession();
    setIsAdminAuthenticated(false);
    setActiveTab('translator');
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleGoogleLogout = () => {
    clearGoogleUser();
    setGoogleUserState(null);
  };

  const handleOpenAuthModal = (tab: 'google' | 'admin' = 'google') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
    // If not authenticated as admin and hash is #admin, reset hash
    if (!isAdminAuthenticated && window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleRuleInduced = (newRule: GrammarRule) => {
    refreshStats();
    setRecentlyLearnedNotification(newRule);
    setTimeout(() => {
      setRecentlyLearnedNotification(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Header Bar & Navigation Frame */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rulesCount={rulesCount}
        corpusCount={corpusCount}
        docsCount={docsCount}
        isAdminAuthenticated={isAdminAuthenticated}
        adminUsername={adminUsername}
        onAdminLogout={handleAdminLogout}
        googleUser={googleUser}
        onGoogleLogout={handleGoogleLogout}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Auth Modal for Google and Admin */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={handleCloseAuthModal}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onGoogleLoginSuccess={handleGoogleLoginSuccess}
      />

      {/* Floating Global Learning Toast Notification */}
      {recentlyLearnedNotification && (
        <div className="fixed bottom-5 right-5 max-w-md bg-emerald-950 text-white p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-300 border border-emerald-500/50 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">
                  Real-Time Cloud Sync (attalibrary-1761f)
                </span>
              </div>
              <p className="font-bold text-white text-sm">
                &ldquo;{recentlyLearnedNotification.title}&rdquo;
              </p>
              <p className="text-emerald-200 text-[11px] mt-1 font-mono bg-emerald-900/60 p-1.5 rounded border border-emerald-700/50">
                Pattern: {recentlyLearnedNotification.pattern}
              </p>
              <p className="text-[10px] text-emerald-400 mt-1">
                Synced in real-time across all connected devices and active in translation memory.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* PUBLIC TRANSLATOR & CORRECTION INTERFACE */}
        {activeTab === 'translator' && (
          <TranslationView
            onRuleInduced={handleRuleInduced}
            activeRulesCount={rulesCount}
            corpusCount={corpusCount}
            docsCount={docsCount}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* ADMIN DAILY REPORT (PROTECTED: ONLY ACCESSIBLE IF ADMIN IS AUTHENTICATED) */}
        {activeTab === 'admin' && (
          isAdminAuthenticated ? (
            <AdminDashboard
              onRefreshData={refreshStats}
              onLogout={handleAdminLogout}
              adminUsername={adminUsername}
              onAdminUsernameChange={(newUsername) => setAdminUsername(newUsername)}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500 mb-4">Administrator access required.</p>
              <button
                type="button"
                onClick={() => handleOpenAuthModal('admin')}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl"
              >
                Sign In as Admin
              </button>
            </div>
          )
        )}

        {/* PDF KNOWLEDGE BASE (PROTECTED) */}
        {activeTab === 'knowledge' && (
          isAdminAuthenticated ? (
            <KnowledgeBaseView
              onDocsChanged={refreshStats}
              onLogout={handleAdminLogout}
              adminUsername={adminUsername}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500 mb-4">Administrator access required.</p>
              <button
                type="button"
                onClick={() => handleOpenAuthModal('admin')}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl"
              >
                Sign In as Admin
              </button>
            </div>
          )
        )}

        {/* LEARNED RULES CATALOG (PROTECTED) */}
        {activeTab === 'rules' && (
          isAdminAuthenticated ? (
            <RulesCatalogView
              onRefreshData={refreshStats}
              onLogout={handleAdminLogout}
              adminUsername={adminUsername}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500 mb-4">Administrator access required.</p>
              <button
                type="button"
                onClick={() => handleOpenAuthModal('admin')}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl"
              >
                Sign In as Admin
              </button>
            </div>
          )
        )}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-nastaliq text-base sm:text-lg text-slate-700" dir="rtl">
            دا آن لائن ایپ و آئیڈیا عطاء الرحمٰن عطاء نا تخلیق ءِ
          </p>
        </div>
      </footer>
    </div>
  );
}
