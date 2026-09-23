import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Copy,
  Check,
  Volume2,
  X,
  Languages,
  CheckCircle2,
  Edit3,
  Columns,
  Rows,
  AlertCircle,
  ClipboardPaste,
  Globe,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { Language, TranslationResult, GrammarRule, DynamicLanguage } from '../types/index.js';
import { safeFetchJson } from '../utils/api.js';
import { dynamicTranslateSentence } from '../utils/dynamicTranslator.js';

export type BrahuiDialectOption =
  | 'Sarawani (ساراوانی)'
  | 'Jhalawani (جالاوانی)'
  | 'Rakhshani (رخشانی)'
  | 'Malook Af (معلوک اف)';

export const getNativeInputAttrs = (lang: Language, dynamicLangs?: DynamicLanguage[]) => {
  switch (lang) {
    case 'urdu':
      return {
        lang: 'ur',
        dir: 'rtl' as const,
        inputMode: 'text' as const,
        autoCapitalize: 'off',
        autoCorrect: 'off',
        spellCheck: false,
      };
    case 'brahui-arabic':
      return {
        lang: 'brh',
        dir: 'rtl' as const,
        inputMode: 'text' as const,
        autoCapitalize: 'off',
        autoCorrect: 'off',
        spellCheck: false,
      };
    case 'brahui-latin':
    case 'brahui-roman':
      return {
        lang: 'brh',
        dir: 'ltr' as const,
        inputMode: 'text' as const,
        autoCapitalize: 'sentences',
        autoCorrect: 'off',
        spellCheck: false,
      };
    case 'english':
      return {
        lang: 'en',
        dir: 'ltr' as const,
        inputMode: 'text' as const,
        autoCapitalize: 'sentences',
        autoCorrect: 'on',
        spellCheck: true,
      };
    default: {
      const match = dynamicLangs?.find((d) => d.code === lang);
      if (match) {
        return {
          lang: match.code,
          dir: match.dir,
          inputMode: 'text' as const,
          autoCapitalize: match.dir === 'rtl' ? 'off' : 'sentences',
          autoCorrect: 'off',
          spellCheck: false,
        };
      }
      return {
        lang: 'en',
        dir: 'ltr' as const,
        inputMode: 'text' as const,
        autoCapitalize: 'sentences',
        autoCorrect: 'on',
        spellCheck: true,
      };
    }
  }
};

interface TranslationViewProps {
  onRuleInduced: (rule: GrammarRule) => void;
  activeRulesCount?: number;
  corpusCount?: number;
  docsCount?: number;
  onNavigateToTab?: (tab: 'translator' | 'admin' | 'knowledge' | 'rules') => void;
}

export const TranslationView: React.FC<TranslationViewProps> = ({
  onRuleInduced,
}) => {
  const [sourceLang, setSourceLang] = useState<Language>('english');
  const [targetLang, setTargetLang] = useState<Language>('brahui-arabic');
  const [sourceText, setSourceText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAltScript, setShowAltScript] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'side-by-side'>('stacked');

  // Dynamic Languages & Google Translate integration state
  const [allowDynamicLanguages, setAllowDynamicLanguages] = useState<boolean>(true);
  const [activeDynamicLanguages, setActiveDynamicLanguages] = useState<DynamicLanguage[]>([]);
  const [catalogLanguages, setCatalogLanguages] = useState<DynamicLanguage[]>([]);
  const [isAddLanguageModalOpen, setIsAddLanguageModalOpen] = useState(false);
  const [addLanguageTarget, setAddLanguageTarget] = useState<'source' | 'target'>('target');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isAddingDynamicLang, setIsAddingDynamicLang] = useState(false);
  const [languageNotice, setLanguageNotice] = useState<string | null>(null);

  // Copy and Paste feedback states for Input and Output blocks
  const [inputCopied, setInputCopied] = useState(false);
  const [inputPasted, setInputPasted] = useState(false);
  const [outputCopied, setOutputCopied] = useState(false);
  const [outputPasted, setOutputPasted] = useState(false);

  // Correction Panel State
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [selectedDialect, setSelectedDialect] = useState<BrahuiDialectOption>('Sarawani (ساراوانی)');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionSuccessMsg, setCorrectionSuccessMsg] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Fetch dynamic language configuration and active dynamic languages from server
  const fetchDynamicLanguages = async () => {
    try {
      const res = await safeFetchJson<{
        allowDynamicLanguages: boolean;
        activeLanguages: DynamicLanguage[];
        catalog: DynamicLanguage[];
      }>('/api/languages');
      if (res.ok && res.data) {
        setAllowDynamicLanguages(res.data.allowDynamicLanguages ?? true);
        setActiveDynamicLanguages(res.data.activeLanguages || []);
        setCatalogLanguages(res.data.catalog || []);
      }
    } catch (err) {
      console.warn('Failed to fetch dynamic languages:', err);
    }
  };

  // Sync user-submitted corrections and active learned rules across environments
  const syncCorrectionsAndRules = async () => {
    try {
      let localRules: GrammarRule[] = [];
      let localCorpus: any[] = [];
      try {
        const storedRules = localStorage.getItem('brahui_cached_rules');
        if (storedRules) localRules = JSON.parse(storedRules);
        const storedCorpus = localStorage.getItem('brahui_cached_corrections');
        if (storedCorpus) localCorpus = JSON.parse(storedCorpus);
      } catch (e) {
        console.warn('Failed to parse local storage rules:', e);
      }

      const res = await safeFetchJson<{
        success: boolean;
        addedRules: number;
        addedCorpus: number;
        rules: GrammarRule[];
        corpus: any[];
      }>('/api/corrections/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: localRules,
          corpus: localCorpus,
        }),
      });

      if (res.ok && res.data) {
        if (Array.isArray(res.data.rules)) {
          localStorage.setItem('brahui_cached_rules', JSON.stringify(res.data.rules.slice(0, 100)));
        }
        if (Array.isArray(res.data.corpus)) {
          localStorage.setItem('brahui_cached_corrections', JSON.stringify(res.data.corpus.slice(0, 100)));
        }
      }
    } catch (err) {
      console.warn('Failed to sync corrections and rules:', err);
    }
  };

  useEffect(() => {
    fetchDynamicLanguages();
    syncCorrectionsAndRules();
  }, []);

  const handleAddDynamicLanguage = async (item: DynamicLanguage) => {
    setIsAddingDynamicLang(true);
    try {
      const res = await safeFetchJson<{ success: boolean; activeLanguages: DynamicLanguage[] }>('/api/languages/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok && res.data?.activeLanguages) {
        setActiveDynamicLanguages(res.data.activeLanguages);
        if (addLanguageTarget === 'source') {
          setSourceLang(item.code);
        } else {
          setTargetLang(item.code);
        }
        setIsAddLanguageModalOpen(false);
        setLanguageNotice(`${item.label} (${item.native}) added and integrated with the English bridge pipeline!`);
        setTimeout(() => setLanguageNotice(null), 5000);
      } else {
        alert(res.error || 'Dynamic language addition is currently restricted by the administrator.');
      }
    } catch (err: any) {
      console.error('Failed to add dynamic language:', err);
    } finally {
      setIsAddingDynamicLang(false);
    }
  };

  const isSourceArabic =
    sourceLang === 'brahui-arabic' ||
    sourceLang === 'urdu' ||
    activeDynamicLanguages.find((d) => d.code === sourceLang)?.dir === 'rtl';
  const isTargetArabic =
    targetLang === 'brahui-arabic' ||
    targetLang === 'urdu' ||
    activeDynamicLanguages.find((d) => d.code === targetLang)?.dir === 'rtl';

  const baseSourceLanguages: { id: Language; label: string; native: string }[] = [
    { id: 'english', label: 'English', native: 'English' },
    { id: 'urdu', label: 'Urdu', native: 'اردو' },
    { id: 'brahui-arabic', label: 'Brahui', native: 'براہوئی' },
    { id: 'brahui-latin', label: 'Brahui Roman', native: 'Brolikwar' },
  ];

  const baseTargetLanguages: { id: Language; label: string; native: string }[] = [
    { id: 'brahui-arabic', label: 'Brahui', native: 'براہوئی' },
    { id: 'brahui-latin', label: 'Brahui Roman', native: 'Brolikwar' },
    { id: 'urdu', label: 'Urdu', native: 'اردو' },
    { id: 'english', label: 'English', native: 'English' },
  ];

  // Merge core languages with active dynamic languages added by user or admin
  const sourceLanguages = [
    ...baseSourceLanguages,
    ...activeDynamicLanguages.map((dl) => ({
      id: dl.code as Language,
      label: dl.label,
      native: dl.native,
    })),
  ];

  const targetLanguages = [
    ...baseTargetLanguages,
    ...activeDynamicLanguages.map((dl) => ({
      id: dl.code as Language,
      label: dl.label,
      native: dl.native,
    })),
  ];

  const handleSelectSourceLang = (lang: Language) => {
    setSourceLang(lang);
  };

  const handleCopyInput = async () => {
    if (!sourceText.trim()) return;
    try {
      await navigator.clipboard.writeText(sourceText);
      setInputCopied(true);
      setTimeout(() => setInputCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy input:', err);
    }
  };

  const handlePasteInput = async () => {
    let clipText = '';
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipText = await navigator.clipboard.readText();
      }
    } catch (err) {
      console.warn('Clipboard read failed or permission denied:', err);
    }
    if (!clipText) {
      const fallback = window.prompt('Paste your text here (یہاں متن چسپاں کریں):');
      if (fallback) clipText = fallback;
    }

    if (clipText) {
      setSourceText((prev) => (prev ? `${prev}\n${clipText}` : clipText));
      setInputPasted(true);
      setTimeout(() => setInputPasted(false), 2000);
    }
  };

  const handleCopyOutput = async () => {
    const textToCopy = showAltScript && result?.alternativeScript ? result.alternativeScript : result?.translatedText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setOutputCopied(true);
      setCopied(true);
      setTimeout(() => {
        setOutputCopied(false);
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.warn('Output copy failed:', err);
    }
  };

  const handlePasteOutput = async () => {
    let clipText = '';
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipText = await navigator.clipboard.readText();
      }
    } catch (err) {
      console.warn('Clipboard read failed or permission denied:', err);
    }
    if (!clipText) {
      const fallback = window.prompt('Paste translated/corrected text here (براہوئی ترجمہ چسپاں کریں):');
      if (fallback) clipText = fallback;
    }

    if (clipText) {
      setCorrectionText(clipText);
      setIsCorrectionOpen(true);
      setOutputPasted(true);
      setTimeout(() => setOutputPasted(false), 2000);
      if (result) {
        setResult({
          ...result,
          translatedText: clipText,
        });
      } else {
        setResult({
          sourceText: sourceText || clipText,
          sourceLang,
          targetLang,
          translatedText: clipText,
          confidence: 100,
        });
      }
    }
  };

  const handleTranslate = async () => {
    const textToTranslate = sourceText.trim();
    if (!textToTranslate) return;

    setIsTranslating(true);
    setCorrectionSuccessMsg(null);
    setCorrectionError(null);
    setTranslationError(null);

    try {
      // 1. Send request to translation backend endpoint
      const res = await safeFetchJson<TranslationResult>('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceText: textToTranslate,
          sourceLang,
          targetLang,
        }),
      });

      if (res.ok && res.data && res.data.translatedText) {
        setResult(res.data);
        setCorrectionText(res.data.translatedText);
        setTranslationError(null);
        return;
      }

      if (!res.ok && res.error) {
        setTranslationError(res.error);
      }

      // 2. Fallback dynamically translates the ACTUAL input text sentence
      const dynamicFallback = dynamicTranslateSentence(textToTranslate, sourceLang, targetLang);
      setResult(dynamicFallback);
      setCorrectionText(dynamicFallback.translatedText);
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslationError(err?.message || 'Network error occurred during translation');
      const dynamicFallback = dynamicTranslateSentence(textToTranslate, sourceLang, targetLang);
      setResult(dynamicFallback);
      setCorrectionText(dynamicFallback.translatedText);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);

    if (result?.translatedText) {
      setSourceText(result.translatedText);
      setResult(null);
      setCorrectionText('');
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = showAltScript && result.alternativeScript ? result.alternativeScript : result.translatedText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeech = (text: string, lang: Language) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'urdu' || lang === 'brahui-arabic') {
      utterance.lang = 'ur-PK';
    } else {
      utterance.lang = 'en-US';
    }
    window.speechSynthesis.speak(utterance);
  };

  const handleOpenCorrection = () => {
    if (!isCorrectionOpen && result?.translatedText) {
      setCorrectionText(result.translatedText);
    }
    setIsCorrectionOpen(!isCorrectionOpen);
    setCorrectionSuccessMsg(null);
    setCorrectionError(null);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionText.trim()) {
      setCorrectionError('براہ کرم درست جملہ درج کریں۔ / Please type the corrected sentence.');
      return;
    }

    setIsSubmittingCorrection(true);
    setCorrectionError(null);

    try {
      const res = await safeFetchJson<any>('/api/corrections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: result ? result.sourceText : sourceText.trim(),
          sourceLang,
          targetLang,
          initialTranslation: result ? result.translatedText : '',
          correctedTranslation: correctionText.trim(),
          dialect: selectedDialect,
          contributorName: 'Community Contributor',
          contributorRole: 'User',
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Failed to submit correction');
      }

      const data = res.data || {};

      // If user result, update displayed text with bracketed dialect indicator
      const dialectSuffix = ` (${selectedDialect})`;
      const displayedCorrection = correctionText.includes('(') ? correctionText.trim() : `${correctionText.trim()}${dialectSuffix}`;

      if (result) {
        setResult({
          ...result,
          translatedText: displayedCorrection,
          confidence: 99,
        });
      } else {
        setResult({
          sourceText,
          sourceLang,
          targetLang,
          translatedText: displayedCorrection,
          confidence: 99,
        });
      }

      if (data.inducedRule) {
        onRuleInduced(data.inducedRule);
        try {
          const storedRules = JSON.parse(localStorage.getItem('brahui_cached_rules') || '[]');
          storedRules.unshift(data.inducedRule);
          localStorage.setItem('brahui_cached_rules', JSON.stringify(storedRules.slice(0, 100)));
        } catch (e) {
          console.warn('Failed to cache rule in localStorage:', e);
        }
      }

      if (data.corpusEntry) {
        try {
          const storedCorpus = JSON.parse(localStorage.getItem('brahui_cached_corrections') || '[]');
          storedCorpus.unshift(data.corpusEntry);
          localStorage.setItem('brahui_cached_corrections', JSON.stringify(storedCorpus.slice(0, 100)));
        } catch (e) {
          console.warn('Failed to cache corpus in localStorage:', e);
        }
      }

      // Background sync to ensure persistence across Vercel and preview restarts
      syncCorrectionsAndRules();

      if (data.requiresApproval) {
        setCorrectionSuccessMsg(
          data.message ||
          'تصحیح موصول ہو گئی۔ ایڈمن کی منظوری کے بعد یہ باقاعدہ فعال ہو جائے گی۔ (Correction queued for Admin Review and will become active once approved)'
        );
      } else {
        setCorrectionSuccessMsg('ترجمہ کامیابی سے درست ہو گیا! ماڈل نے نیا اصول سیکھ لیا۔ (Correction learned)');
      }

      setTimeout(() => {
        setIsCorrectionOpen(false);
        setCorrectionSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      console.error('Correction submission error:', err);
      setCorrectionError(err.message || 'تصحیح جمع کرنے میں مسئلہ پیش آیا۔');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4">
      {/* View Switcher & Translation Engine Status */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Brahui Translate Engine</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Active Learning System</span>
          {allowDynamicLanguages && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              <Globe className="w-3 h-3 text-blue-500" />
              Dynamic Languages Enabled
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Requirement 2: Main translation toolbar Add Language button rendered when enabled by admin */}
          {allowDynamicLanguages && (
            <button
              type="button"
              id="main-toolbar-add-language-btn"
              onClick={() => {
                setAddLanguageTarget('target');
                setIsAddLanguageModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs hover:shadow cursor-pointer"
              title="Add language from Google Translate catalog"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>+ Add Language</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setLayoutMode(layoutMode === 'stacked' ? 'side-by-side' : 'stacked')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Toggle between Stacked and Side-by-Side view"
          >
            {layoutMode === 'stacked' ? (
              <>
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Side-by-side</span>
              </>
            ) : (
              <>
                <Rows className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stacked</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Language Feedback Banner */}
      {languageNotice && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{languageNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setLanguageNotice(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Translation Container */}
      <div className={`grid gap-4 ${layoutMode === 'side-by-side' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* ================= 1. SOURCE LANGUAGE BOX (ON TOP) ================= */}
        <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all">
          {/* Source Language Header Tabs */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {sourceLanguages.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleSelectSourceLang(lang.id)}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                    sourceLang === lang.id
                      ? 'bg-blue-50 text-blue-600 font-semibold border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}

              {/* Requirement 2: Add Language Button in Source Tabs */}
              {allowDynamicLanguages && (
                <button
                  type="button"
                  id="source-add-language-btn"
                  onClick={() => {
                    setAddLanguageTarget('source');
                    setIsAddLanguageModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50/80 rounded-md border border-dashed border-blue-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title="Add language from Google Translate catalog"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Language</span>
                </button>
              )}
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwapLanguages}
              aria-label="Swap Languages"
              title="Swap languages"
              className="p-1.5 rounded-full text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 ml-1"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Source Text Area with Native Keyboard Attributes */}
          <div className="relative p-4 flex-1 flex flex-col min-h-[160px]">
            <textarea
              id="source-text-input"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
              lang={getNativeInputAttrs(sourceLang, activeDynamicLanguages).lang}
              dir={getNativeInputAttrs(sourceLang, activeDynamicLanguages).dir}
              inputMode={getNativeInputAttrs(sourceLang, activeDynamicLanguages).inputMode}
              autoCapitalize={getNativeInputAttrs(sourceLang, activeDynamicLanguages).autoCapitalize}
              autoCorrect={getNativeInputAttrs(sourceLang, activeDynamicLanguages).autoCorrect}
              spellCheck={getNativeInputAttrs(sourceLang, activeDynamicLanguages).spellCheck}
              placeholder={
                sourceLang === 'urdu'
                  ? 'یہاں اردو متن درج کریں...'
                  : sourceLang === 'brahui-arabic'
                  ? 'داڑے براہوئی متن نوشتہ کبو...'
                  : sourceLang === 'brahui-latin' || sourceLang === 'brahui-roman'
                  ? 'Dáre Brahui text brolikwar ti nibishte kabo...'
                  : 'Type or paste text to translate...'
              }
              rows={4}
              className={`w-full flex-1 border-0 focus:ring-0 focus:outline-hidden resize-none text-slate-800 placeholder-slate-400 bg-transparent ${
                isSourceArabic
                  ? 'font-nastaliq text-2xl leading-[2.3] text-right'
                  : 'font-sans text-lg sm:text-xl'
              }`}
            />

            {/* Source Box Bottom Toolbar with Copy & Paste */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-500 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Explicit Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyInput}
                  disabled={!sourceText.trim()}
                  title="Copy source text (متن کاپی کریں)"
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  {inputCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copy (کاپی)</span>
                    </>
                  )}
                </button>

                {/* Explicit Paste Button */}
                <button
                  type="button"
                  onClick={handlePasteInput}
                  title="Paste from clipboard (کلپ بورڈ سے چسپاں کریں)"
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                  <span>{inputPasted ? 'Pasted!' : 'Paste (چسپاں)'}</span>
                </button>

                {sourceText.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSpeech(sourceText, sourceLang)}
                    title="Listen to source text"
                    className="p-1.5 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span>{sourceText.length} / 5,000</span>
                {sourceText && (
                  <button
                    type="button"
                    onClick={() => setSourceText('')}
                    title="Clear text"
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= CONTROLS ROW: PRIMARY TRANSLATE BUTTON ================= */}
        <div className={`flex items-center justify-center py-1 ${layoutMode === 'side-by-side' ? 'md:col-span-2' : ''}`}>
          <button
            type="button"
            id="translate-button"
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText.trim()}
            className="px-8 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-sm rounded-full shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isTranslating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ترجمہ ہو رہا ہے... / Translating...</span>
              </>
            ) : (
              <>
                <Languages className="w-4 h-4" />
                <span>Translate / ترجمہ کریں</span>
              </>
            )}
          </button>
        </div>

        {/* ================= 2. TRANSLATED BRAHUI BOX (AT THE BOTTOM) ================= */}
        <div className="flex flex-col gap-3">
          {translationError && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-amber-950">Notice: </span>
                <span>{translationError}</span>
                <span className="block text-amber-700/80 mt-0.5">Showing dynamic active-rule translation for your input.</span>
              </div>
              <button
                type="button"
                onClick={() => setTranslationError(null)}
                className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-[#f8f9fa] border border-slate-300 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all">
            {/* Target Language Header Tabs */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100/80 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {targetLanguages.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setTargetLang(lang.id)}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                      targetLang === lang.id
                        ? 'bg-white text-blue-600 font-semibold border-b-2 border-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}

                {/* Requirement 2: Add Language Button in Target Tabs */}
                {allowDynamicLanguages && (
                  <button
                    type="button"
                    id="target-add-language-btn"
                    onClick={() => {
                      setAddLanguageTarget('target');
                      setIsAddLanguageModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50/80 rounded-md border border-dashed border-blue-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title="Add language from Google Translate catalog"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Language</span>
                  </button>
                )}
              </div>

              {/* Script Toggle for Brahui */}
              {result?.alternativeScript && (
                <button
                  type="button"
                  onClick={() => setShowAltScript(!showAltScript)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {showAltScript ? 'Primary Script' : 'Parallel Script'}
                </button>
              )}
            </div>

            {/* Translated Output Display Area with Professional Nastaliq Font */}
            <div className="relative p-4 flex-1 flex flex-col justify-between min-h-[160px]">
              {isTranslating ? (
                <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Translating to {targetLang}...</span>
                </div>
              ) : result ? (
                <div>
                  {/* Multi-Dialect Formatted Translation Output */}
                  <div
                    id="translated-text-output"
                    dir={isTargetArabic && !showAltScript ? 'rtl' : !isTargetArabic && showAltScript ? 'rtl' : 'ltr'}
                    className={`select-text whitespace-pre-wrap ${
                      (isTargetArabic && !showAltScript) || (!isTargetArabic && showAltScript)
                        ? 'font-nastaliq text-2xl sm:text-3xl text-slate-900 font-normal leading-[2.3] text-right py-1'
                        : 'font-sans text-xl sm:text-2xl text-slate-900 font-normal leading-relaxed'
                    }`}
                  >
                    {showAltScript ? result.alternativeScript : result.translatedText}
                  </div>

                  {/* Multi-Dialect Individual Cards for convenient inspection and copying */}
                  {result.dialectVariants && result.dialectVariants.length > 1 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                        <span>لہجہ وار ترجمے (Dialect Variations):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {result.dialectVariants.map((variant, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                {variant.dialect}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${variant.text} (${variant.dialect})`);
                                }}
                                title="Copy dialect translation"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div
                              className="font-nastaliq text-xl text-slate-900 text-right leading-loose mt-1"
                              dir="rtl"
                            >
                              {variant.text}
                            </div>
                            {variant.alternativeScript && (
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                {variant.alternativeScript}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 font-normal text-lg sm:text-xl italic select-none">
                  {isTargetArabic ? 'ترجمہ...' : 'Translation...'}
                </div>
              )}

              {/* Target Box Bottom Toolbar with Copy & Paste */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-slate-500 text-xs mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Explicit Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    disabled={!result?.translatedText}
                    title="Copy translation (ترجمہ کاپی کریں)"
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-200/80 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    {outputCopied || copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copy (کاپی)</span>
                      </>
                    )}
                  </button>

                  {/* Explicit Paste Button */}
                  <button
                    type="button"
                    onClick={handlePasteOutput}
                    title="Paste translated text or correction (ترجمہ چسپاں کریں)"
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-200/80 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                    <span>{outputPasted ? 'Pasted!' : 'Paste (چسپاں)'}</span>
                  </button>

                  {result?.translatedText && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSpeech(
                          showAltScript && result.alternativeScript
                            ? result.alternativeScript
                            : result.translatedText,
                          targetLang
                        )
                      }
                      title="Listen to translation"
                      className="p-1.5 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {result && (
                  <div className="text-[11px] text-slate-400">
                    {result.wordCount ? `${result.wordCount} words` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= RELOCATED CORRECTION BUTTON DIRECTLY UNDERNEATH TRANSLATED RESULT ================= */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <button
                type="button"
                id="toggle-correction-btn"
                onClick={handleOpenCorrection}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                  isCorrectionOpen
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-blue-50 text-blue-700 border-slate-300 hover:border-blue-400'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ترجمہ درست کریں (Correct Translation)</span>
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ترجمہ میں کوئی غلطی ہو تو یہاں کلک کر کے فوری تصحیح درج کریں
              </span>
            </div>

            {/* CORRECTION PANEL WITH DIALECT SELECTION */}
            {isCorrectionOpen && (
              <div
                id="minimal-correction-panel"
                className="bg-white border-2 border-blue-500 rounded-2xl p-4 shadow-md transition-all animate-in fade-in-50 duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    درست براہوئی جملہ درج کریں (Correct Brahui Translation):
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCorrectionOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                    title="Cancel / Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitCorrection} className="space-y-2.5">
                  {/* Clean, compact text box to type the corrected Brahui sentence with Native Keyboard Attributes */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="corrected-sentence-input" className="block text-xs font-semibold text-slate-700">
                        درست براہوئی جملہ (Correct Brahui Translation):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!correctionText) return;
                            try {
                              await navigator.clipboard.writeText(correctionText);
                            } catch {}
                          }}
                          className="px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copy correction text"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            let text = '';
                            try {
                              if (navigator.clipboard?.readText) {
                                text = await navigator.clipboard.readText();
                              }
                            } catch {}
                            if (!text) {
                              const fallback = window.prompt('Paste text here:');
                              if (fallback) text = fallback;
                            }
                            if (text) setCorrectionText(text);
                          }}
                          className="px-2 py-0.5 text-[11px] rounded bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Paste into correction box"
                        >
                          <ClipboardPaste className="w-3 h-3" />
                          <span>Paste</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      id="corrected-sentence-input"
                      rows={2}
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      lang={getNativeInputAttrs(targetLang).lang}
                      dir={getNativeInputAttrs(targetLang).dir}
                      inputMode={getNativeInputAttrs(targetLang).inputMode}
                      autoCapitalize={getNativeInputAttrs(targetLang).autoCapitalize}
                      autoCorrect={getNativeInputAttrs(targetLang).autoCorrect}
                      spellCheck={getNativeInputAttrs(targetLang).spellCheck}
                      placeholder="درست براہوئی جملہ یہاں لکھیں... (Type corrected Brahui sentence here...)"
                      className={`w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none transition-all shadow-2xs ${
                        isTargetArabic
                          ? 'font-nastaliq text-xl leading-[2.1] text-right min-h-[52px] max-h-[85px]'
                          : 'font-sans text-sm sm:text-base min-h-[44px] max-h-[75px]'
                      }`}
                      autoFocus
                    />
                  </div>

                  {/* DIALECT SELECTION DROPDOWN DIRECTLY UNDERNEATH CORRECTION BOX */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      <label htmlFor="correction-dialect-select" className="text-xs font-bold text-blue-950 flex items-center gap-1">
                        <span>براہوئی لہجہ منتخب کریں (Select Brahui Dialect):</span>
                        <span className="text-rose-500 font-bold" title="Mandatory (لازمی)">*</span>
                      </label>
                    </div>
                    <select
                      id="correction-dialect-select"
                      value={selectedDialect}
                      onChange={(e) => setSelectedDialect(e.target.value as BrahuiDialectOption)}
                      required
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-300 rounded-lg text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Sarawani (ساراوانی)">Sarawani (ساراوانی)</option>
                      <option value="Jhalawani (جالاوانی)">Jhalawani (جالاوانی)</option>
                      <option value="Rakhshani (رخشانی)">Rakhshani (رخشانی)</option>
                      <option value="Malook Af (معلوک اف)">Malook Af (معلوک اف)</option>
                    </select>
                  </div>

                  {correctionError && (
                    <div className="text-xs text-rose-600 font-medium">
                      {correctionError}
                    </div>
                  )}

                  {correctionSuccessMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{correctionSuccessMsg}</span>
                    </div>
                  )}

                  {/* Simple "Submit Correction" button */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <span className="text-[11px] text-slate-500">
                      ایڈمن کی تصدیق کے بعد یہ اصول ڈیٹا بیس میں مستقل محفوظ ہوگا۔
                    </span>
                    <button
                      type="submit"
                      id="submit-correction-button"
                      disabled={isSubmittingCorrection || !correctionText.trim()}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {isSubmittingCorrection ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جمع ہو رہا ہے...</span>
                        </>
                      ) : (
                        <span>Submit Correction / تصحیح جمع کریں</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ================= MODAL: ADD LANGUAGE FROM GOOGLE TRANSLATE CATALOG ================= */}
      {isAddLanguageModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/40">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Globe className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Add Language from Google Translate Catalog
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select any language to dynamically connect it with the Brahui English-bridge pipeline.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddLanguageModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Selector & Search Filter Bar */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Assign added language to:</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 text-xs">
                    <button
                      type="button"
                      onClick={() => setAddLanguageTarget('source')}
                      className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        addLanguageTarget === 'source'
                          ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Source (Input)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddLanguageTarget('target')}
                      className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        addLanguageTarget === 'target'
                          ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Target (Output)
                    </button>
                  </div>
                </div>

                <span className="text-[11px] text-slate-500">
                  {catalogLanguages.length} Languages in catalog
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search languages by name, native script, or code (e.g. Persian, Arabic, Pashto, Balochi, Turkish)..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Language Catalog Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 max-h-[50vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {catalogLanguages
                  .filter(
                    (lang) =>
                      lang.label.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      lang.native.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      lang.code.toLowerCase().includes(catalogSearch.toLowerCase())
                  )
                  .map((item) => {
                    const isAlreadyActive = activeDynamicLanguages.some((a) => a.code === item.code);
                    return (
                      <div
                        key={item.code}
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-2.5 transition-all ${
                          isAlreadyActive
                            ? 'bg-blue-50/60 border-blue-200'
                            : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-2xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 truncate">{item.label}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.code}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium truncate" dir={item.dir}>
                            {item.native}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[9px] font-semibold uppercase">
                              {item.dir}
                            </span>
                            <span>• Google Translate Model</span>
                          </div>
                        </div>

                        {isAlreadyActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (addLanguageTarget === 'source') {
                                setSourceLang(item.code);
                              } else {
                                setTargetLang(item.code);
                              }
                              setIsAddLanguageModalOpen(false);
                            }}
                            className="w-full py-1.5 px-3 bg-white hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs border border-blue-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                            <span>Select for {addLanguageTarget === 'source' ? 'Input' : 'Output'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isAddingDynamicLang}
                            onClick={() => handleAddDynamicLanguage(item)}
                            className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isAddingDynamicLang ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>Add to Translator</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>

              {catalogLanguages.filter(
                (lang) =>
                  lang.label.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  lang.native.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  lang.code.toLowerCase().includes(catalogSearch.toLowerCase())
              ).length === 0 && (
                <div className="py-10 text-center text-xs text-slate-400">
                  No languages matching &ldquo;{catalogSearch}&rdquo; found in catalog.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-[11px] truncate">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Languages bridge via English to preserve authentic Brahui Dravidian morphology.</span>
              </span>

              <button
                type="button"
                onClick={() => setIsAddLanguageModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

