import React, { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  FileText,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  UserCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Inbox,
  RefreshCw,
  CheckCheck,
  Globe,
  Plus,
  Trash2,
  Sliders,
  BookMarked,
  ClipboardPaste,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';
import { DailyReport, GrammarRule, CorpusEntry, DynamicLanguage, DictionaryEntry } from '../types/index.js';
import { authFetch, authSafeFetchJson, setAdminSession, getAdminToken } from '../utils/auth.js';
import { safeFetchJson } from '../utils/api.js';

interface AdminDashboardProps {
  onRefreshData?: () => void;
  onLogout?: () => void;
  adminUsername?: string;
  onAdminUsernameChange?: (newUsername: string) => void;
}

interface ReviewQueueData {
  pendingRules: GrammarRule[];
  pendingCorpusEntries: CorpusEntry[];
  pendingRulesCount: number;
  pendingCorpusCount: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onRefreshData,
  onLogout,
  adminUsername = 'admin',
  onAdminUsernameChange
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'review' | 'rules' | 'dictionary' | 'corpus' | 'security' | 'languages'>('review');

  // Dynamic Dictionary State (Requirements 3 & 4)
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryEntry[]>([]);
  const [isDictLoading, setIsDictLoading] = useState(false);
  const [dictSearchQuery, setDictSearchQuery] = useState('');
  const [dictPosFilter, setDictPosFilter] = useState('all');
  const [dictDialectFilter, setDictDialectFilter] = useState('all');
  const [isExportingDictExcel, setIsExportingDictExcel] = useState(false);
  const [isExportingDictCsv, setIsExportingDictCsv] = useState(false);
  const [isExportingGrammarExcel, setIsExportingGrammarExcel] = useState(false);
  const [isExportingSyntaxExcel, setIsExportingSyntaxExcel] = useState(false);
  const [dictStats, setDictStats] = useState<any>(null);
  const [dictFeedback, setDictFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Fast Bulk Add Dictionary State (Requirement 2 & 3: Automated POS Detection)
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkDialect, setBulkDialect] = useState('Standard');
  const [isBulkPanelOpen, setIsBulkPanelOpen] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dictionary Selection & Bulk Delete State (Requirement 4)
  const [selectedDictIds, setSelectedDictIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'selected' | 'all';
    count: number;
  }>({ isOpen: false, mode: 'selected', count: 0 });

  // Dynamic Language & Settings State
  const [allowDynamicLanguages, setAllowDynamicLanguages] = useState<boolean>(true);
  const [activeLanguages, setActiveLanguages] = useState<DynamicLanguage[]>([]);
  const [catalogLanguages, setCatalogLanguages] = useState<DynamicLanguage[]>([]);
  const [isLanguagesLoading, setIsLanguagesLoading] = useState(false);
  const [isUpdatingLangSetting, setIsUpdatingLangSetting] = useState(false);
  const [langFeedback, setLangFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [catalogFilterQuery, setCatalogFilterQuery] = useState('');

  // Review Queue State
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueData>({
    pendingRules: [],
    pendingCorpusEntries: [],
    pendingRulesCount: 0,
    pendingCorpusCount: 0,
  });
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Credentials Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(adminUsername);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsSuccess, setCredsSuccess] = useState<string | null>(null);
  const [credsError, setCredsError] = useState<string | null>(null);

  // Sync newUsername with adminUsername prop if changed externally
  useEffect(() => {
    if (adminUsername) {
      setNewUsername(adminUsername);
    }
  }, [adminUsername]);

  const fetchDailyReport = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await authSafeFetchJson<DailyReport>(`/api/admin/report?date=${dateStr}`);
      if (res.ok && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch daily report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviewQueue = async () => {
    setIsQueueLoading(true);
    try {
      const res = await authSafeFetchJson<any>('/api/admin/review-queue');
      if (res.ok && res.data) {
        setReviewQueue({
          pendingRules: res.data.pendingRules || [],
          pendingCorpusEntries: res.data.pendingCorpusEntries || res.data.pendingCorpus || [],
          pendingRulesCount: res.data.counts?.rules ?? (res.data.pendingRules?.length || 0),
          pendingCorpusCount: res.data.counts?.corpus ?? ((res.data.pendingCorpusEntries || res.data.pendingCorpus)?.length || 0),
        });
      }
    } catch (err) {
      console.error('Failed to fetch review queue:', err);
    } finally {
      setIsQueueLoading(false);
    }
  };

  const fetchLanguageSettings = async () => {
    setIsLanguagesLoading(true);
    try {
      const res = await safeFetchJson<{
        allowDynamicLanguages: boolean;
        activeLanguages: DynamicLanguage[];
        catalog: DynamicLanguage[];
      }>('/api/languages');
      if (res.ok && res.data) {
        setAllowDynamicLanguages(res.data.allowDynamicLanguages ?? true);
        setActiveLanguages(res.data.activeLanguages || []);
        setCatalogLanguages(res.data.catalog || []);
      }
    } catch (err) {
      console.error('Failed to load language settings:', err);
    } finally {
      setIsLanguagesLoading(false);
    }
  };

  const handleToggleAllowDynamicLanguages = async (newVal: boolean) => {
    setIsUpdatingLangSetting(true);
    setLangFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean; settings: { allowDynamicLanguages: boolean } }>(
        '/api/admin/languages/settings',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allowDynamicLanguages: newVal }),
        }
      );
      if (res.ok) {
        setAllowDynamicLanguages(newVal);
        setLangFeedback({
          type: 'success',
          message: newVal
            ? 'Dynamic "Add Language" feature is now GLOBALLY ENABLED for the main translation toolbar.'
            : 'Dynamic "Add Language" feature is now GLOBALLY DISABLED (Hidden from users).',
        });
      } else {
        setLangFeedback({
          type: 'error',
          message: res.error || 'Failed to update dynamic language settings.',
        });
      }
    } catch (err: any) {
      setLangFeedback({
        type: 'error',
        message: err.message || 'Error communicating with server.',
      });
    } finally {
      setIsUpdatingLangSetting(false);
    }
  };

  const handleAddLanguageFromCatalog = async (langItem: DynamicLanguage) => {
    setIsLanguagesLoading(true);
    setLangFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean; activeLanguages: DynamicLanguage[] }>(
        '/api/languages/add',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(langItem),
        }
      );
      if (res.ok && res.data?.activeLanguages) {
        setActiveLanguages(res.data.activeLanguages);
        setLangFeedback({
          type: 'success',
          message: `Successfully added ${langItem.label} (${langItem.native}) to active languages.`,
        });
      } else {
        setLangFeedback({
          type: 'error',
          message: res.error || 'Failed to add language.',
        });
      }
    } catch (err: any) {
      setLangFeedback({ type: 'error', message: err.message || 'Failed to add language.' });
    } finally {
      setIsLanguagesLoading(false);
    }
  };

  const handleRemoveLanguage = async (code: string, label: string) => {
    setIsLanguagesLoading(true);
    setLangFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean; activeLanguages: DynamicLanguage[] }>(
        `/api/admin/languages/${code}`,
        { method: 'DELETE' }
      );
      if (res.ok && res.data?.activeLanguages) {
        setActiveLanguages(res.data.activeLanguages);
        setLangFeedback({
          type: 'success',
          message: `Removed ${label} from active languages.`,
        });
      } else {
        setLangFeedback({
          type: 'error',
          message: res.error || 'Failed to remove language.',
        });
      }
    } catch (err: any) {
      setLangFeedback({ type: 'error', message: err.message || 'Failed to remove language.' });
    } finally {
      setIsLanguagesLoading(false);
    }
  };

  const fetchDictionary = async () => {
    setIsDictLoading(true);
    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        total: number;
        entries: DictionaryEntry[];
        stats: any;
      }>('/api/dictionary');
      if (res.ok && res.data) {
        setDictionaryEntries(res.data.entries || []);
        setDictStats(res.data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching dictionary:', err);
    } finally {
      setIsDictLoading(false);
    }
  };

  const handleExportDictionary = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (format === 'xlsx') setIsExportingDictExcel(true);
    else setIsExportingDictCsv(true);
    setDictFeedback(null);
    try {
      const res = await authFetch(`/api/dictionary/export?format=${format}`);
      if (!res.ok) throw new Error('Failed to export dictionary');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brahui_Dictionary_Synchronized_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDictFeedback({
        type: 'success',
        message: `Dictionary successfully exported to ${format.toUpperCase()}! Download started.`,
      });
    } catch (err: any) {
      console.error('Export error:', err);
      setDictFeedback({
        type: 'error',
        message: err.message || 'Error downloading dictionary export.',
      });
    } finally {
      setIsExportingDictExcel(false);
      setIsExportingDictCsv(false);
    }
  };

  const handleExportGrammarRules = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setIsExportingGrammarExcel(true);
    try {
      const res = await authFetch(`/api/grammar/export?format=${format}`);
      if (!res.ok) throw new Error('Failed to export grammar rules');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brahui_Grammar_Rules_Morphology_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Grammar rules export error:', err);
    } finally {
      setIsExportingGrammarExcel(false);
    }
  };

  const handleExportSyntaxPatterns = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setIsExportingSyntaxExcel(true);
    try {
      const res = await authFetch(`/api/syntax/export?format=${format}`);
      if (!res.ok) throw new Error('Failed to export syntax patterns');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brahui_Syntax_Patterns_SOV_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Syntax patterns export error:', err);
    } finally {
      setIsExportingSyntaxExcel(false);
    }
  };

  const handleBulkAddDictionary = async () => {
    if (!bulkText.trim()) return;
    setIsBulkAdding(true);
    setBulkFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean; message: string; addedCount: number; skippedCount: number }>('/api/dictionary/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulkText,
          dialect: bulkDialect,
        }),
      });
      if (res.ok && res.data) {
        setBulkFeedback({
          type: 'success',
          message: res.data.message || `Successfully added ${res.data.addedCount} words to Dictionary!`,
        });
        setBulkText('');
        fetchDictionary();
      } else {
        throw new Error(res.error || 'Failed to bulk add dictionary words');
      }
    } catch (err: any) {
      setBulkFeedback({
        type: 'error',
        message: err.message || 'Error processing bulk dictionary words.',
      });
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleDeleteDictionaryEntry = async (id: string, term: string) => {
    if (!confirm(`Are you sure you want to remove "${term}" from the dynamic dictionary?`)) return;
    try {
      const res = await authSafeFetchJson(`/api/dictionary/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDictionaryEntries(prev => prev.filter(e => e.id !== id));
        setSelectedDictIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setDictFeedback({ type: 'success', message: `Term "${term}" removed from dictionary.` });
      }
    } catch (err) {
      console.error('Failed to delete dictionary entry:', err);
    }
  };

  // Bulk Selection & Deletion Handlers (Requirement 4)
  const handleToggleSelectRow = (id: string) => {
    setSelectedDictIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (filteredItems: DictionaryEntry[]) => {
    if (selectedDictIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedDictIds(new Set());
    } else {
      setSelectedDictIds(new Set(filteredItems.map(e => e.id)));
    }
  };

  const handlePromptBulkDelete = (mode: 'selected' | 'all', count: number) => {
    if (count <= 0) return;
    setConfirmDeleteModal({ isOpen: true, mode, count });
  };

  const handleExecuteBulkDelete = async () => {
    const { mode } = confirmDeleteModal;
    setIsBulkDeleting(true);
    setDictFeedback(null);
    try {
      const body = mode === 'all' ? { deleteAll: true } : { ids: Array.from(selectedDictIds) };
      const res = await authSafeFetchJson<{ success: boolean; message: string; deletedCount: number }>('/api/admin/dictionary/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok && res.data) {
        setDictFeedback({
          type: 'success',
          message: res.data.message || `Successfully deleted ${res.data.deletedCount} dictionary entries.`,
        });
        setSelectedDictIds(new Set());
        setConfirmDeleteModal({ isOpen: false, mode: 'selected', count: 0 });
        await fetchDictionary();
      } else {
        throw new Error(res.error || 'Failed to bulk delete dictionary entries');
      }
    } catch (err: any) {
      setDictFeedback({
        type: 'error',
        message: err.message || 'Error executing bulk delete.',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Clean and map dictionary entry columns without overlapping or duplicated strings (Requirement 1)
  const cleanDisplayEntry = (entry: DictionaryEntry) => {
    let term = (entry.term || '').trim();
    let latinTerm = (entry.latinTerm || '').trim();
    let english = (entry.englishMeaning || entry.meaning || '').trim();
    let urdu = (entry.urduMeaning || '').trim();

    // Check if any field contains delimiters ('=', '\t', '|', '::')
    const hasDelimiter = (s: string) => /[=\t|]|::/.test(s);
    if (hasDelimiter(term) || hasDelimiter(latinTerm) || hasDelimiter(english) || hasDelimiter(urdu)) {
      // Gather all distinct raw tokens
      const rawTokens: string[] = [];
      const fields = [term, latinTerm, english, urdu];
      for (const f of fields) {
        if (!f) continue;
        if (hasDelimiter(f)) {
          const parts = f.split(/[=\t|]|::/).map(p => p.trim()).filter(Boolean);
          for (const p of parts) {
            if (!rawTokens.includes(p)) rawTokens.push(p);
          }
        } else if (!rawTokens.includes(f)) {
          rawTokens.push(f);
        }
      }

      if (rawTokens.length >= 2) {
        const arabic = rawTokens.filter(p => /[\u0600-\u06FF]/.test(p));
        const latin = rawTokens.filter(p => !/[\u0600-\u06FF]/.test(p));

        if (arabic.length >= 1) term = arabic[0];
        if (arabic.length >= 2) urdu = arabic[1];
        else if (urdu === term) urdu = '';

        if (latin.length === 1) {
          english = latin[0];
          latinTerm = '';
        } else if (latin.length >= 2) {
          // Typically shorter Latin string is romanized Brahui (e.g. "Tark"), longer is English definition ("Abandonment")
          const sorted = [...latin].sort((a, b) => a.length - b.length);
          latinTerm = sorted[0];
          english = sorted.slice(1).join(' / ');
        }
      }
    }

    // Strip any remaining lingering delimiters in individual fields
    const strip = (s: string) => s.replace(/^[=\t|:;\s]+|[=\t|:;\s]+$/g, '').trim();
    term = strip(term);
    latinTerm = strip(latinTerm);
    english = strip(english);
    urdu = strip(urdu);

    // Cross-column deduplication:
    // 1. If Urdu is identical to the Brahui term (e.g. both are "ترک"), clear Urdu
    if (urdu === term) {
      urdu = '';
    }
    // 2. If Latin term is identical to English definition (e.g. both are "Abandonment"), clear Latin
    if (latinTerm.toLowerCase() === english.toLowerCase()) {
      latinTerm = '';
    }
    // 3. If English accidentally captured the Brahui term
    if (english === term) {
      english = '';
    }
    // 4. If Latin term contains Arabic characters, it shouldn't be in Latin column
    if (/[\u0600-\u06FF]/.test(latinTerm)) {
      if (!urdu && latinTerm !== term) urdu = latinTerm;
      latinTerm = '';
    }

    return {
      term: term || '-',
      latinTerm,
      english: english || '-',
      urdu: urdu || '-',
    };
  };

  useEffect(() => {
    fetchDailyReport(selectedDate);
    fetchReviewQueue();
    fetchLanguageSettings();
    fetchDictionary();
  }, [selectedDate]);

  const handleApproveRule = async (ruleId: string) => {
    setActionInProgress(ruleId);
    setQueueFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean; rule: GrammarRule }>(`/api/admin/rules/${ruleId}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setQueueFeedback({ type: 'success', message: 'اصول منظور ہو گیا اور باقاعدہ ڈیٹا بیس میں فعال کر دیا گیا! (Rule approved & activated)' });
        await Promise.all([fetchReviewQueue(), fetchDailyReport(selectedDate)]);
        if (onRefreshData) onRefreshData();
      } else {
        setQueueFeedback({ type: 'error', message: res.error || 'Failed to approve rule' });
      }
    } catch (err: any) {
      setQueueFeedback({ type: 'error', message: err.message || 'Error approving rule' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectRule = async (ruleId: string) => {
    setActionInProgress(ruleId);
    setQueueFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean }>(`/api/admin/rules/${ruleId}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        setQueueFeedback({ type: 'success', message: 'اصول مسترد کر دیا گیا اور لسٹ سے ہٹا دیا گیا۔ (Rule rejected & removed)' });
        await Promise.all([fetchReviewQueue(), fetchDailyReport(selectedDate)]);
        if (onRefreshData) onRefreshData();
      } else {
        setQueueFeedback({ type: 'error', message: res.error || 'Failed to reject rule' });
      }
    } catch (err: any) {
      setQueueFeedback({ type: 'error', message: err.message || 'Error rejecting rule' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApproveCorpus = async (corpusId: string) => {
    setActionInProgress(corpusId);
    setQueueFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean; entry: CorpusEntry }>(`/api/admin/corpus/${corpusId}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setQueueFeedback({ type: 'success', message: 'ترجمہ کا جوڑا منظور ہو گیا اور ماڈل میں فعال کر دیا گیا! (Corpus pair approved & activated)' });
        await Promise.all([fetchReviewQueue(), fetchDailyReport(selectedDate)]);
        if (onRefreshData) onRefreshData();
      } else {
        setQueueFeedback({ type: 'error', message: res.error || 'Failed to approve corpus entry' });
      }
    } catch (err: any) {
      setQueueFeedback({ type: 'error', message: err.message || 'Error approving corpus entry' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectCorpus = async (corpusId: string) => {
    setActionInProgress(corpusId);
    setQueueFeedback(null);
    try {
      const res = await authSafeFetchJson<{ success: boolean }>(`/api/admin/corpus/${corpusId}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        setQueueFeedback({ type: 'success', message: 'اندراج مسترد کر دیا گیا اور کیو سے ہٹا دیا گیا۔ (Corpus entry rejected)' });
        await Promise.all([fetchReviewQueue(), fetchDailyReport(selectedDate)]);
        if (onRefreshData) onRefreshData();
      } else {
        setQueueFeedback({ type: 'error', message: res.error || 'Failed to reject corpus entry' });
      }
    } catch (err: any) {
      setQueueFeedback({ type: 'error', message: err.message || 'Error rejecting corpus entry' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdateRuleStatus = async (ruleId: string, status: GrammarRule['status']) => {
    try {
      const res = await authSafeFetchJson(`/api/admin/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, verifiedBy: 'Super Admin Linguist' }),
      });

      if (res.ok) {
        fetchDailyReport(selectedDate);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Error updating rule status:', err);
    }
  };

  const handleDownloadJSON = async () => {
    try {
      const res = await authFetch('/api/admin/export');
      if (!res.ok) throw new Error('Failed to export JSON');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brahui_corpus_grammar_rules_${selectedDate}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDownloadTSV = async () => {
    try {
      const res = await authFetch('/api/admin/export-tsv');
      if (!res.ok) throw new Error('Failed to export TSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'brahui_parallel_corpus.tsv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError(null);
    setCredsSuccess(null);

    if (!currentPassword) {
      setCredsError('Please enter your current password.');
      return;
    }
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      setCredsError('New username must be at least 3 characters long.');
      return;
    }
    if (!newPassword || newPassword.length < 5) {
      setCredsError('New password must be at least 5 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setCredsError('New passwords do not match. Please re-enter.');
      return;
    }

    setCredsLoading(true);
    try {
      const res = await authSafeFetchJson<{ success: boolean; message: string; username: string }>('/api/admin/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim(),
          newPassword,
        }),
      });

      if (res.ok && res.data && res.data.success) {
        setCredsSuccess(res.data.message || 'Admin credentials updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        const updatedName = res.data.username || newUsername.trim();
        const currentToken = getAdminToken();
        if (currentToken) {
          setAdminSession(currentToken, updatedName);
        }
        if (onAdminUsernameChange) {
          onAdminUsernameChange(updatedName);
        }
      } else {
        setCredsError(res.error || 'Failed to update admin credentials. Check current password.');
      }
    } catch (err: any) {
      console.error('Credentials update error:', err);
      setCredsError(err.message || 'Network error updating credentials.');
    } finally {
      setCredsLoading(false);
    }
  };

  // Quick date shortcuts
  const setDateToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const setDateYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const filteredRules = (report?.newRules || []).filter((rule) => {
    const matchesSearch =
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.pattern.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || rule.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredCorpus = (report?.newCorpusEntries || []).filter((entry) => {
    return (
      entry.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.targetText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.contributorName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredDictionary = dictionaryEntries.filter((entry) => {
    const q = dictSearchQuery.toLowerCase();
    const matchesQ =
      !q ||
      entry.term.toLowerCase().includes(q) ||
      (entry.latinTerm && entry.latinTerm.toLowerCase().includes(q)) ||
      entry.meaning.toLowerCase().includes(q) ||
      (entry.englishMeaning && entry.englishMeaning.toLowerCase().includes(q)) ||
      (entry.urduMeaning && entry.urduMeaning.toLowerCase().includes(q));

    const matchesPos = dictPosFilter === 'all' || (entry.partOfSpeech || '').toLowerCase() === dictPosFilter.toLowerCase();
    const matchesDialect = dictDialectFilter === 'all' || (entry.dialect || '').toLowerCase().includes(dictDialectFilter.toLowerCase());

    return matchesQ && matchesPos && matchesDialect;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Governance Controls - Fully Responsive on Mobile & Desktop */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <span className="p-2 sm:p-2.5 rounded-lg bg-indigo-600 text-white shadow-2xs shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">Admin Control Panel: Daily Report &amp; Governance</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                User: {adminUsername}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review induced grammar rules, verify community corrections, update credentials, and export datasets.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* TRI-EXPORT SYSTEM: Dedicated Excel (.xlsx) Download for Dictionary, Grammar, & Syntax (Requirement 3) */}
          <button
            type="button"
            id="admin-export-dictionary-excel-btn"
            onClick={() => handleExportDictionary('xlsx')}
            disabled={isExportingDictExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
            title="Export complete single-word Brahui vocabulary database directly to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExportingDictExcel ? 'Exporting...' : 'Export Dictionary (.xlsx)'}</span>
          </button>

          <button
            type="button"
            id="admin-export-grammar-excel-btn"
            onClick={() => handleExportGrammarRules('xlsx')}
            disabled={isExportingGrammarExcel}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
            title="Export morphological and postpositional grammar rules directly to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExportingGrammarExcel ? 'Exporting...' : 'Export Grammar Rules (.xlsx)'}</span>
          </button>

          <button
            type="button"
            id="admin-export-syntax-excel-btn"
            onClick={() => handleExportSyntaxPatterns('xlsx')}
            disabled={isExportingSyntaxExcel}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
            title="Export sentence structural rules, SOV alignments, and clause ordering directly to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExportingSyntaxExcel ? 'Exporting...' : 'Export Syntax Patterns (.xlsx)'}</span>
          </button>

          <button
            type="button"
            id="admin-languages-top-btn"
            onClick={() => setActiveTab('languages')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial ${
              activeTab === 'languages'
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700'
            }`}
            title="Configure Dynamic Languages & Add Language Control"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Languages &amp; Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial ${
              activeTab === 'security'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700'
            }`}
            title="Update Admin Username and Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin Credentials</span>
          </button>

          <button
            type="button"
            id="download-corpus-json-btn"
            onClick={handleDownloadJSON}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>TSV</span>
          </button>

          {onLogout && (
            <button
              type="button"
              id="admin-logout-btn"
              onClick={onLogout}
              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer flex-1 sm:flex-initial"
              title="Sign out of Admin Session"
            >
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Filter & KPI Metrics */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Select Report Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={setDateToday}
              className={`px-3 py-1 rounded-md font-medium border cursor-pointer transition-colors ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={setDateYesterday}
              className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-md font-medium text-slate-600 cursor-pointer transition-colors"
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* 5 Key Metric Cards - Mobile Stack / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-700 block">Rules Learned on Date</span>
            <span className="text-2xl font-bold text-indigo-950 mt-1 block">
              {report?.rulesLearnedToday ?? 0}
            </span>
            <span className="text-[10px] text-indigo-600">Induced via active learning</span>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
            <span className="text-[11px] font-semibold text-emerald-700 block">Corrections Ingested</span>
            <span className="text-2xl font-bold text-emerald-950 mt-1 block">
              {report?.correctionsIngestedToday ?? 0}
            </span>
            <span className="text-[10px] text-emerald-600">Community verified pairs</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-600 block">Total Active Rules</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {report?.totalActiveRules ?? 0}
            </span>
            <span className="text-[10px] text-slate-500">System-wide knowledge</span>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg">
            <span className="text-[11px] font-semibold text-amber-700 block">Total Parallel Corpus</span>
            <span className="text-2xl font-bold text-amber-950 mt-1 block">
              {report?.totalCorpusEntries ?? 0}
            </span>
            <span className="text-[10px] text-amber-600">Google contribution ready</span>
          </div>

          <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-lg">
            <span className="text-[11px] font-semibold text-purple-700 block">Reference Books Ingested</span>
            <span className="text-2xl font-bold text-purple-950 mt-1 block">
              {report?.totalKnowledgeDocs ?? 0}
            </span>
            <span className="text-[10px] text-purple-600">PDF Lexicons &amp; Grammars</span>
          </div>
        </div>
      </div>

      {/* Main Admin Body */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Responsive Tabs & Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'review'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Review Queue</span>
              {((reviewQueue?.pendingRules?.length || 0) + (reviewQueue?.pendingCorpusEntries?.length || 0)) > 0 ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'review' ? 'bg-amber-800 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {(reviewQueue?.pendingRules?.length || 0) + (reviewQueue?.pendingCorpusEntries?.length || 0)}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-600">0</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Learned Grammar Rules ({filteredRules.length})
            </button>

            <button
              id="admin-dictionary-tab-btn"
              onClick={() => setActiveTab('dictionary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'dictionary'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5 text-blue-500" />
              <span>Dynamic Dictionary ({dictionaryEntries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('corpus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'corpus'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Dataset Additions ({filteredCorpus.length})
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin Credentials</span>
            </button>

            <button
              id="admin-languages-tab-btn"
              onClick={() => setActiveTab('languages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'languages'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Language Controls &amp; Settings</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  allowDynamicLanguages ? 'bg-emerald-400' : 'bg-slate-400'
                }`}
                title={allowDynamicLanguages ? 'Add Language is Globally Enabled' : 'Add Language is Globally Disabled'}
              />
            </button>
          </div>

          {activeTab !== 'security' && activeTab !== 'languages' && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'review' && (
                <button
                  type="button"
                  onClick={fetchReviewQueue}
                  disabled={isQueueLoading}
                  className="px-2.5 py-1 text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="Refresh Review Queue"
                >
                  <RefreshCw className={`w-3 h-3 ${isQueueLoading ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
                  <span>Refresh Queue</span>
                </button>
              )}

              {activeTab === 'rules' && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg cursor-pointer flex-1 sm:flex-initial"
                >
                  <option value="all">All Categories</option>
                  <option value="Syntax">Syntax</option>
                  <option value="Morphology">Morphology</option>
                  <option value="Lexical">Lexical</option>
                  <option value="Orthography">Orthography</option>
                  <option value="Phonology">Phonology</option>
                </select>
              )}

              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg bg-white w-full sm:w-44 focus:sm:w-60 transition-all focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* TAB 0: REVIEW QUEUE (PDF EXTRACTIONS & USER CORRECTIONS) */}
        {activeTab === 'review' && (
          <div className="p-4 sm:p-5 space-y-6">
            {/* Feedback notice if any */}
            {queueFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                  queueFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <span>{queueFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setQueueFeedback(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Inbox className="w-4 h-4 text-amber-600" />
                  <span>Admin Review Queue: Quality Assurance &amp; Approval</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rules extracted from uploaded PDFs and user-submitted translations remain here in 'pending' status until explicitly approved.
                </p>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Total Pending Items: <span className="font-bold text-amber-700">{reviewQueue.pendingRules.length + reviewQueue.pendingCorpusEntries.length}</span>
              </div>
            </div>

            {isQueueLoading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>Checking review queue...</span>
              </div>
            ) : reviewQueue.pendingRules.length === 0 && reviewQueue.pendingCorpusEntries.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Review Queue is Clear!</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  All PDF extracted grammar rules and user-submitted corrections have been approved or rejected. Newly uploaded PDFs or corrections will appear here for verification.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Pending Grammar Rules */}
                {reviewQueue.pendingRules.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        1. Grammar Rules Awaiting Approval ({reviewQueue.pendingRules.length})
                      </span>
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Pending Admin Verification
                      </span>
                    </div>

                    <div className="space-y-3">
                      {reviewQueue.pendingRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-4 bg-white border-2 border-amber-200/80 hover:border-amber-400 rounded-xl shadow-xs transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{rule.title}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {rule.category}
                              </span>
                              {rule.dialect && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                  {rule.dialect}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500">
                                Source: {rule.source}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={actionInProgress === rule.id}
                                onClick={() => handleApproveRule(rule.id)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                title="Approve and activate this rule"
                              >
                                {actionInProgress === rule.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Approve (منظور کریں)</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionInProgress === rule.id}
                                onClick={() => handleRejectRule(rule.id)}
                                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:border-rose-300 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                title="Reject and remove from queue"
                              >
                                <X className="w-3.5 h-3.5 text-rose-500" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 leading-relaxed">
                            <span className="font-semibold text-slate-900">Explanation: </span>
                            {rule.explanation}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-[10px] font-semibold text-slate-500 block uppercase">Grammar Pattern:</span>
                              <code className="text-indigo-700 font-mono text-[11px] font-bold">{rule.pattern}</code>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-slate-500 block uppercase">Confidence / Match:</span>
                              <span className="text-slate-800 font-medium">
                                {rule.confidence}% • Regex: <code className="text-slate-600 font-mono">{rule.regexRule || 'N/A'}</code>
                              </span>
                            </div>
                          </div>

                          {rule.exampleSentences && rule.exampleSentences.length > 0 && (
                            <div className="text-xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Example Sentence:</span>
                              <div className="p-2 bg-indigo-50/50 rounded border border-indigo-100 font-nastaliq text-base text-right leading-loose" dir="rtl">
                                {rule.exampleSentences[0].brahui}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Pending Corpus Entries */}
                {reviewQueue.pendingCorpusEntries.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        2. User Translation Corrections Awaiting Approval ({reviewQueue.pendingCorpusEntries.length})
                      </span>
                      <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Community Submissions
                      </span>
                    </div>

                    <div className="space-y-3">
                      {reviewQueue.pendingCorpusEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 bg-white border border-slate-300 rounded-xl shadow-xs space-y-3 hover:border-slate-400 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-semibold text-slate-700">Contributor: {entry.contributorName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {entry.contributorRole}
                              </span>
                              {entry.dialect && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                  {entry.dialect}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">
                                {new Date(entry.timestamp || entry.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={actionInProgress === entry.id}
                                onClick={() => handleApproveCorpus(entry.id)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                title="Approve this parallel pair"
                              >
                                {actionInProgress === entry.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Approve (منظور کریں)</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionInProgress === entry.id}
                                onClick={() => handleRejectCorpus(entry.id)}
                                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:border-rose-300 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                title="Reject and remove"
                              >
                                <X className="w-3.5 h-3.5 text-rose-500" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Source Text ({entry.sourceLang}):</span>
                              <div className="text-slate-900 font-medium text-sm">{entry.sourceText}</div>
                            </div>
                            <div className="p-2.5 bg-blue-50/40 rounded-lg border border-blue-200/60">
                              <span className="text-[10px] font-bold text-blue-700 block uppercase mb-1">User Ground Truth ({entry.targetLang}):</span>
                              <div className="text-slate-900 font-nastaliq text-xl text-right leading-loose" dir="rtl">
                                {entry.targetText}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Newly Learned Grammar Rules */}
        {activeTab === 'rules' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Header & Tri-Export Strip for Rules (Requirement 3) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Grammar &amp; Syntax Linguistic Modules</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export morphological suffix paradigms and strict Dravidian SOV syntax patterns directly into Microsoft Excel (.xlsx).
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="tab-export-grammar-excel-btn"
                  onClick={() => handleExportGrammarRules('xlsx')}
                  disabled={isExportingGrammarExcel}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Export morphological and postpositional grammar rules to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{isExportingGrammarExcel ? 'Exporting...' : 'Export Grammar Rules (.xlsx)'}</span>
                </button>
                <button
                  type="button"
                  id="tab-export-syntax-excel-btn"
                  onClick={() => handleExportSyntaxPatterns('xlsx')}
                  disabled={isExportingSyntaxExcel}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Export sentence structural rules & SOV alignments to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{isExportingSyntaxExcel ? 'Exporting...' : 'Export Syntax Patterns (.xlsx)'}</span>
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading daily report...</div>
            ) : filteredRules.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No grammar rules recorded on {selectedDate}. Use the Translation View to submit corrections and induce new rules!
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              rule.category === 'Syntax'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : rule.category === 'Morphology'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : rule.category === 'Orthography'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {rule.category}
                          </span>

                          <h3 className="text-sm font-bold text-slate-900">{rule.title}</h3>

                          <span className="text-[11px] text-slate-400 font-mono">
                            {rule.confidence}% confidence
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(rule.createdAt).toLocaleTimeString()}
                          </span>
                          <span>•</span>
                          <span>Dialect: {rule.dialect || 'Standard'}</span>
                          {rule.verifiedBy && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">Verified by: {rule.verifiedBy}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Admin Verification Controls */}
                      <div className="flex items-center gap-1.5 self-start">
                        {rule.status === 'verified' ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUpdateRuleStatus(rule.id, 'verified')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve &amp; Verify
                          </button>
                        )}

                        {rule.status !== 'deprecated' && (
                          <button
                            onClick={() => handleUpdateRuleStatus(rule.id, 'deprecated')}
                            className="px-2 py-1 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-700 rounded-md text-[11px] cursor-pointer"
                            title="Deactivate this rule"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Extracted Pattern */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 break-words">
                      <span className="text-indigo-600 font-bold block text-[10px] mb-0.5">
                        FORMAL PATTERN:
                      </span>
                      {rule.pattern}
                    </div>

                    {/* Linguistic Explanation */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Linguistic Analysis: </strong>
                      {rule.explanation}
                    </p>

                    {/* Before / After Diff Examples */}
                    {rule.examples && rule.examples.length > 0 && (
                      <div className="p-2.5 bg-white/70 border border-slate-200 rounded-lg text-xs space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Induction Exemplar:</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="line-through text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 break-all">
                            {rule.examples[0].incorrect}
                          </span>
                          <span className="text-slate-400 font-bold">&rarr;</span>
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 break-all">
                            {rule.examples[0].correct}
                          </span>
                          <span className="text-slate-500 text-[11px] italic">
                            ({rule.examples[0].englishGloss})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Dynamic Dictionary & Vocabulary (Requirements 3 & 4) */}
        {activeTab === 'dictionary' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Header & Controls Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Synchronized Dynamic Vocabulary Database</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-300">
                    {dictionaryEntries.length} Terms
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Vocabulary terms extracted strictly from PDF lexicons and automatically synchronized in real-time from user translation corrections.
                </p>
              </div>

              {/* Excel & CSV Export Feature for Dictionary (Requirement 4) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="tab-toggle-bulk-dict-btn"
                  onClick={() => setIsBulkPanelOpen(!isBulkPanelOpen)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isBulkPanelOpen
                      ? 'bg-indigo-700 text-white border border-indigo-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  title="Toggle Admin Fast Bulk Add Words (Copy-Paste Option)"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>{isBulkPanelOpen ? 'Close Bulk Input' : 'Bulk Add Words'}</span>
                </button>

                <button
                  type="button"
                  id="tab-export-dictionary-excel-btn"
                  onClick={() => handleExportDictionary('xlsx')}
                  disabled={isExportingDictExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Export complete synchronized Brahui vocabulary database directly to Microsoft Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isExportingDictExcel ? 'Exporting...' : 'Export Dictionary to Excel (.xlsx)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportDictionary('csv')}
                  disabled={isExportingDictCsv}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Export complete vocabulary database as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={fetchDictionary}
                  disabled={isDictLoading}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded-lg cursor-pointer"
                  title="Refresh Dictionary"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDictLoading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Admin Fast Bulk Dictionary Input (Copy-Paste Option) (Requirement 4) */}
            {isBulkPanelOpen && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4 text-indigo-700" />
                    <h4 className="text-xs font-bold text-slate-900">Admin Bulk Dictionary Input (Copy-Paste Option)</h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                      Single-Word Lexicon Populator
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBulkPanelOpen(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer font-bold px-1.5 py-0.5"
                  >
                    &times;
                  </button>
                </div>
                <p className="text-[11px] text-slate-600">
                  Paste bulk word pairs directly into this field. Accepts <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">Word = Meaning</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">Word - Meaning</code>, or Tab-separated tabular columns (<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">Term \t Meaning \t Latin \t Urdu \t POS</code>). Strict single-word extraction enforces that full sentences are never saved as dictionary entries.
                </p>
                <textarea
                  id="admin-bulk-dictionary-textarea"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Paste word pairs here (one pair per line):
شاہر = City (Urdu: شہر, Latin: shahr)
اُرا = House (Urdu: گھر, Latin: urā)
کتاب = Book (Urdu: کتاب, Latin: kitāb)
صبح = Dawn / Morning
خوانِنگ = To read / To study`}
                  rows={5}
                  className="w-full text-xs font-mono p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-inner"
                />
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={bulkDialect}
                      onChange={(e) => setBulkDialect(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer font-medium text-slate-700"
                    >
                      <option value="Standard">Dialect: Standard</option>
                      <option value="Sarawan">Dialect: Sarawani</option>
                      <option value="Jhalawan">Dialect: Jhalawani</option>
                    </select>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Automated POS Detection</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkText('')}
                      disabled={!bulkText || isBulkAdding}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      id="admin-bulk-populate-btn"
                      onClick={handleBulkAddDictionary}
                      disabled={!bulkText.trim() || isBulkAdding}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isBulkAdding ? 'Processing Words...' : 'Populate Dictionary'}</span>
                    </button>
                  </div>
                </div>
                {bulkFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                    bulkFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}>
                    <span>{bulkFeedback.message}</span>
                    <button onClick={() => setBulkFeedback(null)} className="cursor-pointer font-bold ml-2">&times;</button>
                  </div>
                )}
              </div>
            )}

            {dictFeedback && (
              <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                dictFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <span>{dictFeedback.message}</span>
                <button onClick={() => setDictFeedback(null)} className="cursor-pointer font-bold text-slate-500 hover:text-slate-900">&times;</button>
              </div>
            )}

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                <span className="text-[11px] font-semibold text-blue-700 block">Total Synced Terms</span>
                <span className="text-xl font-bold text-blue-950 mt-0.5 block">{dictionaryEntries.length}</span>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="text-[11px] font-semibold text-emerald-700 block">Verified Terms</span>
                <span className="text-xl font-bold text-emerald-950 mt-0.5 block">
                  {dictionaryEntries.filter(e => e.verified).length}
                </span>
              </div>
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg">
                <span className="text-[11px] font-semibold text-indigo-700 block">From PDF Lexicons</span>
                <span className="text-xl font-bold text-indigo-950 mt-0.5 block">
                  {dictionaryEntries.filter(e => e.sourceType === 'pdf_extraction').length}
                </span>
              </div>
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg">
                <span className="text-[11px] font-semibold text-purple-700 block">From Corrections</span>
                <span className="text-xl font-bold text-purple-950 mt-0.5 block">
                  {dictionaryEntries.filter(e => e.sourceType === 'user_correction').length}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={dictSearchQuery}
                  onChange={(e) => setDictSearchQuery(e.target.value)}
                  placeholder="Search Brahui term, Latin transliteration, English, or Urdu meaning..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-full focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={dictPosFilter}
                  onChange={(e) => setDictPosFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer"
                >
                  <option value="all">All Parts of Speech</option>
                  <option value="noun">Noun</option>
                  <option value="verb">Verb</option>
                  <option value="adjective">Adjective</option>
                  <option value="postposition">Postposition</option>
                  <option value="adverb">Adverb</option>
                  <option value="idiom">Idiom</option>
                </select>

                <select
                  value={dictDialectFilter}
                  onChange={(e) => setDictDialectFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer"
                >
                  <option value="all">All Dialects</option>
                  <option value="standard">Standard</option>
                  <option value="sarawan">Sarawani</option>
                  <option value="jhalawan">Jhalawani</option>
                </select>
              </div>
            </div>

            {/* Bulk Selection Action Toolbar (Requirement 4) */}
            <div className="flex items-center justify-between flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="admin-toggle-select-all-btn"
                  onClick={() => handleToggleSelectAll(filteredDictionary)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Toggle Select All filtered terms"
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={selectedDictIds.size > 0 && selectedDictIds.size === filteredDictionary.length}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                  />
                  <span>
                    {selectedDictIds.size > 0 && selectedDictIds.size === filteredDictionary.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </button>

                {selectedDictIds.size > 0 && (
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    {selectedDictIds.size} of {filteredDictionary.length} selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedDictIds.size > 0 && (
                  <button
                    type="button"
                    id="admin-delete-selected-dict-btn"
                    onClick={() => handlePromptBulkDelete('selected', selectedDictIds.size)}
                    disabled={isBulkDeleting}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Delete all selected dictionary entries"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedDictIds.size})</span>
                  </button>
                )}

                <button
                  type="button"
                  id="admin-clear-all-dict-btn"
                  onClick={() => handlePromptBulkDelete('all', dictionaryEntries.length)}
                  disabled={isBulkDeleting || dictionaryEntries.length === 0}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 hover:border-rose-300 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  title="Delete all dictionary entries with confirmation"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete All ({dictionaryEntries.length})</span>
                </button>
              </div>
            </div>

            {/* Terms Table */}
            {isDictLoading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading synchronized dictionary...</span>
              </div>
            ) : filteredDictionary.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No matching vocabulary terms found in dictionary.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedDictIds.size > 0 && selectedDictIds.size === filteredDictionary.length}
                          onChange={() => handleToggleSelectAll(filteredDictionary)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Select / Deselect All Filtered Terms"
                        />
                      </th>
                      <th className="p-3">Brahui Term</th>
                      <th className="p-3">Meaning / English</th>
                      <th className="p-3">Urdu Definition (اردو)</th>
                      <th className="p-3">Part of Speech</th>
                      <th className="p-3">Dialect</th>
                      <th className="p-3">Source Origin</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDictionary.map((entry) => {
                      const display = cleanDisplayEntry(entry);
                      const isSelected = selectedDictIds.has(entry.id);
                      return (
                        <tr key={entry.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(entry.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 text-sm font-amiri">
                              {display.term}
                            </div>
                            {display.latinTerm && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                {display.latinTerm}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-slate-800">{display.english}</span>
                          </td>
                          <td className="p-3 font-amiri text-slate-700 text-xs">
                            {display.urdu}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {entry.partOfSpeech || 'Noun'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                              {entry.dialect || 'Standard'}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">
                            <div className="truncate max-w-[180px]" title={entry.sourceDocTitle || entry.sourceType}>
                              {entry.sourceDocTitle || (entry.sourceType === 'user_correction' ? 'Translation Correction' : 'Lexicon PDF')}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteDictionaryEntry(entry.id, display.term)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Remove term"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bulk Delete Confirmation Modal (Requirement 4) */}
            {confirmDeleteModal.isOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {confirmDeleteModal.mode === 'all' ? 'Delete Entire Dictionary?' : 'Delete Selected Terms?'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {confirmDeleteModal.mode === 'all'
                          ? `This will permanently delete all ${confirmDeleteModal.count} vocabulary entries in the dictionary across all devices.`
                          : `Are you sure you want to permanently delete ${confirmDeleteModal.count} selected terms?`}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                    <strong>Warning:</strong> This deletion will be synchronized instantly to Firebase Firestore and across all connected devices.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteModal({ isOpen: false, mode: 'selected', count: 0 })}
                      disabled={isBulkDeleting}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="confirm-bulk-delete-action-btn"
                      onClick={handleExecuteBulkDelete}
                      disabled={isBulkDeleting}
                      className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isBulkDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>
                        {isBulkDeleting
                          ? 'Deleting...'
                          : confirmDeleteModal.mode === 'all'
                          ? `Delete All (${confirmDeleteModal.count})`
                          : `Delete Selected (${confirmDeleteModal.count})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Today's Dataset Additions */}
        {activeTab === 'corpus' && (
          <div className="p-4 sm:p-5">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading dataset...</div>
            ) : filteredCorpus.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No corpus pairs recorded on {selectedDate}. Submit corrections to enrich the corpus!
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Source Language &amp; Text</th>
                      <th className="p-3">Brahui Target</th>
                      <th className="p-3">Alternative Script</th>
                      <th className="p-3">Dialect</th>
                      <th className="p-3">Contributor</th>
                      <th className="p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCorpus.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            {entry.sourceLang}
                          </span>
                          <span className="font-medium text-slate-800">{entry.sourceText}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold uppercase text-indigo-500 block">
                            {entry.targetLang}
                          </span>
                          <span className="font-bold text-slate-900 text-sm font-amiri">
                            {entry.targetText}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 text-[11px]">
                          {entry.alternativeScript || '-'}
                        </td>
                        <td className="p-3 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                            {entry.dialect || 'Standard'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{entry.contributorName}</div>
                          <span className="text-[10px] text-slate-400">{entry.contributorRole}</span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Admin Credentials & Security (Requirement 2) */}
        {activeTab === 'security' && (
          <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
            <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Admin Account Security &amp; Credentials</h3>
              </div>
              <p className="text-xs text-slate-500">
                Update the primary Admin Username and Password. Changes are persisted permanently in the server storage.
              </p>
            </div>

            {credsError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{credsError}</span>
              </div>
            )}

            {credsSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-bold block">Update Successful</span>
                  <span>{credsSuccess}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Admin Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current admin password"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10 bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Default initial password is: admin123</span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Admin Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new admin username"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Admin Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new admin password (minimum 5 characters)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10 bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new admin password"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={credsLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {credsLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Update Admin Username &amp; Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: DYNAMIC LANGUAGES & GLOBAL "ADD LANGUAGE" SETTINGS */}
        {activeTab === 'languages' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Feedback notification */}
            {langFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
                  langFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {langFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-medium">{langFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLangFeedback(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span>Dynamic Language Governance &amp; Google Translate Controls</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Control the availability of the &ldquo;Add Language&rdquo; feature in the main translation toolbar. When enabled, users can dynamically fetch and add languages from Google Translate into the Brahui English-bridge pipeline.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchLanguageSettings}
                disabled={isLanguagesLoading}
                className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs self-start sm:self-auto"
                title="Refresh Language Settings"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLanguagesLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                <span>Refresh Settings</span>
              </button>
            </div>

            {/* FEATURE TOGGLE CARD (REQUIREMENT 1: Global Toggle Switch / Checkbox) */}
            <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 p-5 rounded-2xl border-2 border-blue-200/80 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded">
                      Global Control Switch
                    </span>
                    {allowDynamicLanguages ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        FEATURE GLOBALLY ENABLED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-full border border-slate-300">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        FEATURE GLOBALLY DISABLED
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">
                    Enable &ldquo;Add Language&rdquo; Button in Translation Toolbar
                  </h4>
                  <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                    When <strong>Enabled</strong>, a prominent <em>&ldquo;+ Add Language&rdquo;</em> button will be rendered in the main application translation toolbar and language selector tabs. Users or admins can click it to add any language from Google Translate into the Brahui translation pipeline.
                  </p>
                </div>

                {/* Clear Toggle Switch / Interactive Checkbox */}
                <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs self-start md:self-auto shrink-0">
                  <label htmlFor="global-allow-languages-toggle" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                    {allowDynamicLanguages ? 'Enabled' : 'Disabled'}
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="global-allow-languages-toggle"
                      checked={allowDynamicLanguages}
                      disabled={isUpdatingLangSetting}
                      onChange={(e) => handleToggleAllowDynamicLanguages(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Currently Active Dynamic Languages */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Currently Active Dynamic Languages ({activeLanguages.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    These languages are currently active alongside core English, Urdu, Brahui Nastaliq, and Brahui Roman.
                  </p>
                </div>
              </div>

              {activeLanguages.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  No extra dynamic languages active. Only core languages (English, Urdu, Brahui, Brahui Roman) are active.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeLanguages.map((lang) => (
                    <div
                      key={lang.code}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{lang.label}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {lang.code}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {lang.dir.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium" dir={lang.dir}>
                          {lang.native}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium">
                          ✓ English Bridge Pipeline Ready
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(lang.code, lang.label)}
                        disabled={isLanguagesLoading}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={`Remove ${lang.label} from active translator`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Google Translate Catalog Browser (Quick-add from catalog) */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Official Google Translate Language Catalog ({catalogLanguages.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Select any language from the standard Google Translate catalog to instantly activate it in the app.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={catalogFilterQuery}
                    onChange={(e) => setCatalogFilterQuery(e.target.value)}
                    placeholder="Search catalog (e.g. Persian, Turkish)..."
                    className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg bg-white w-full focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[360px] overflow-y-auto p-1">
                {catalogLanguages
                  .filter((item) =>
                    item.label.toLowerCase().includes(catalogFilterQuery.toLowerCase()) ||
                    item.native.toLowerCase().includes(catalogFilterQuery.toLowerCase()) ||
                    item.code.toLowerCase().includes(catalogFilterQuery.toLowerCase())
                  )
                  .map((catalogItem) => {
                    const isAlreadyActive = activeLanguages.some((a) => a.code === catalogItem.code);
                    return (
                      <div
                        key={catalogItem.code}
                        className={`p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between gap-2 ${
                          isAlreadyActive
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-slate-800 truncate" title={catalogItem.label}>
                              {catalogItem.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">{catalogItem.code}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 truncate" dir={catalogItem.dir} title={catalogItem.native}>
                            {catalogItem.native}
                          </div>
                        </div>

                        {isAlreadyActive ? (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Active in App</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddLanguageFromCatalog(catalogItem)}
                            disabled={isLanguagesLoading}
                            className="w-full py-1 px-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Language</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
