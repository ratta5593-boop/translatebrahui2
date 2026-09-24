import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Send, BookOpen, Lightbulb, ChevronDown, ChevronUp, Copy, Check, ClipboardPaste } from 'lucide-react';
import { Language, TranslationResult, GrammarRule } from '../types/index.js';
import { safeFetchJson } from '../utils/api.js';

interface UserCorrectionFormProps {
  translationResult: TranslationResult;
  onCorrectionSuccess: (rule: GrammarRule) => void;
}

export type UserCorrectionDialect =
  | 'Sarawani (ساراوانی)'
  | 'Jhalawani (جالاوانی)'
  | 'Rakhshani (رخشانی)'
  | 'Malook Af (معلوک اف)';

export const UserCorrectionForm: React.FC<UserCorrectionFormProps> = ({
  translationResult,
  onCorrectionSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const isArabicTarget = translationResult.targetLang === 'brahui-arabic';
  const [correctedText, setCorrectedText] = useState(translationResult.translatedText);
  const [alternativeScript, setAlternativeScript] = useState(translationResult.alternativeScript || '');
  const [dialect, setDialect] = useState<UserCorrectionDialect>('Sarawani (ساراوانی)');
  const [userNotes, setUserNotes] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [contributorRole, setContributorRole] = useState<'Native Speaker' | 'Linguist' | 'User'>('Native Speaker');

  // Copy/Paste states
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inducedResult, setInducedResult] = useState<{
    rule: GrammarRule;
    explanation: string;
  } | null>(null);

  // Sync state if initial translated text changes
  React.useEffect(() => {
    setCorrectedText(translationResult.translatedText);
    setAlternativeScript(translationResult.alternativeScript || '');
    setInducedResult(null);
    setErrorMessage(null);
  }, [translationResult.translatedText, translationResult.sourceText]);

  const handleCopy = async () => {
    if (!correctedText) return;
    try {
      await navigator.clipboard.writeText(correctedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy error:', err);
    }
  };

  const handlePaste = async () => {
    let clipText = '';
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipText = await navigator.clipboard.readText();
      }
    } catch (err) {
      console.warn('Paste error:', err);
    }
    if (!clipText) {
      const fallback = window.prompt('Paste corrected text here (براہوئی متن چسپاں کریں):');
      if (fallback) clipText = fallback;
    }
    if (clipText) {
      setCorrectedText(clipText);
      setPasted(true);
      setTimeout(() => setPasted(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedText.trim()) {
      setErrorMessage('Please enter the corrected Brahui translation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await safeFetchJson<any>('/api/corrections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: translationResult.sourceText,
          sourceLang: translationResult.sourceLang,
          targetLang: translationResult.targetLang,
          initialTranslation: translationResult.translatedText,
          correctedTranslation: correctedText.trim(),
          alternativeScript: alternativeScript.trim(),
          userNotes: userNotes.trim(),
          dialect,
          contributorName: contributorName.trim() || 'Community Contributor',
          contributorRole,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Failed to submit correction');
      }

      const data = res.data || {};
      setInducedResult({
        rule: data.inducedRule,
        explanation: data.explanation || data.inducedRule?.explanation,
      });

      if (data.inducedRule) {
        onCorrectionSuccess(data.inducedRule);
      }
    } catch (err: any) {
      console.error('Correction submission error:', err);
      setErrorMessage(err.message || 'Error communicating with active learning service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="user-correction-active-learning"
      className="mt-4 bg-gradient-to-br from-white via-indigo-50/20 to-emerald-50/30 border-2 border-indigo-200/80 rounded-xl shadow-sm overflow-hidden transition-all"
    >
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between cursor-pointer hover:bg-indigo-100/60 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              User Correction & Active Learning Induction
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                Self-Learning Engine
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Edit any incorrect word to teach the AI. A new grammar rule will be induced and persisted immediately!
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Toggle correction form"
          className="text-indigo-600 hover:text-indigo-900 p-1"
        >
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-5">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success banner with induced rule card */}
          {inducedResult && (
            <div className="mb-5 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl shadow-xs animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      New Grammar Rule Successfully Induced & Learned!
                    </h4>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                      {inducedResult.rule.category} • {inducedResult.rule.confidence}% Confidence
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-emerald-800 mt-1">
                    Rule Title: &ldquo;{inducedResult.rule.title}&rdquo;
                  </p>

                  <div className="mt-2.5 p-2.5 bg-white/90 border border-emerald-200 rounded-lg font-mono text-xs text-slate-800">
                    <span className="text-emerald-700 font-bold block text-[11px] mb-0.5">
                      EXTRACTED GRAMMATICAL PATTERN:
                    </span>
                    {inducedResult.rule.pattern}
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    <strong className="text-slate-800">AI Induction Rationale: </strong>
                    {inducedResult.explanation}
                  </p>

                  <div className="mt-2 text-[11px] text-emerald-700 font-medium">
                    ✓ Saved to persistent database. This rule is now actively applied to all subsequent translations.
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* 1. Authoritative Translation Input Box (COMPACT) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label htmlFor="corrected-brahui-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Authoritative Brahui Translation (درست براہوئی ترجمہ):</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!correctedText.trim()}
                    className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    title="Copy text"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Paste text"
                  >
                    <ClipboardPaste className="w-3 h-3 text-blue-600" />
                    <span>{pasted ? 'Pasted' : 'Paste'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorrectedText(translationResult.translatedText)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer ml-1"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Compact Correction Text Area with Native Keyboard Attributes */}
              <textarea
                key={`user-correction-text-${isArabicTarget ? 'brh' : 'en'}`}
                id="corrected-brahui-input"
                rows={2}
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                lang={isArabicTarget ? 'brh' : 'en'}
                dir={isArabicTarget ? 'rtl' : 'ltr'}
                inputMode="text"
                autoCapitalize={isArabicTarget ? 'off' : 'sentences'}
                autoCorrect="off"
                spellCheck={false}
                placeholder={isArabicTarget ? 'یہاں 100% درست براہوئی ترجمہ درج کریں...' : 'Enter 100% correct Brahui translation here...'}
                className={`w-full px-3 py-2 border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed bg-white resize-none ${
                  isArabicTarget ? 'font-nastaliq text-xl leading-[2.1] min-h-[58px]' : 'font-sans text-sm min-h-[50px]'
                }`}
              />
            </div>

            {/* 2. DIALECT SELECTION DROPDOWN DIRECTLY UNDERNEATH CORRECTION BOX */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <label htmlFor="user-correction-dialect-select" className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                  <span>براہوئی لہجہ منتخب کریں (Select Brahui Dialect):</span>
                  <span className="text-rose-500 font-bold" title="Mandatory">*</span>
                </label>
              </div>
              <select
                id="user-correction-dialect-select"
                value={dialect}
                onChange={(e) => setDialect(e.target.value as UserCorrectionDialect)}
                required
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-indigo-300 rounded-lg text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="Sarawani (ساراوانی)">Sarawani (ساراوانی)</option>
                <option value="Jhalawani (جالاوانی)">Jhalawani (جالاوانی)</option>
                <option value="Rakhshani (رخشانی)">Rakhshani (رخشانی)</option>
                <option value="Malook Af (معلوک اف)">Malook Af (معلوک اف)</option>
              </select>
            </div>

            {/* 3. Parallel Script / Transliteration (Optional) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Alternative Script Transliteration ({isArabicTarget ? 'Roman (Brolikwar)' : 'Perso-Arabic'}):
                </label>
                <span className="text-[11px] text-slate-400">Optional (مددگار)</span>
              </div>
              <input
                key={`user-correction-alt-${isArabicTarget ? 'en' : 'brh'}`}
                type="text"
                value={alternativeScript}
                onChange={(e) => setAlternativeScript(e.target.value)}
                lang={isArabicTarget ? 'en' : 'brh'}
                dir={isArabicTarget ? 'ltr' : 'rtl'}
                inputMode="text"
                autoCapitalize={isArabicTarget ? 'sentences' : 'off'}
                autoCorrect="off"
                spellCheck={false}
                placeholder={isArabicTarget ? 'e.g., Kan-na pin Ahmad e' : 'مثال: کنا پِن احمد ءِ'}
                className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* 4. Contributor Role & Name Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your Role:
                </label>
                <select
                  value={contributorRole}
                  onChange={(e) => setContributorRole(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Native Speaker">Native Speaker</option>
                  <option value="Linguist">Linguist / Academic</option>
                  <option value="User">Language Learner / User</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contributor Name:
                </label>
                <input
                  type="text"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  placeholder="e.g. Dr. Brahui / Anonymous"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Linguistic notes / explanation */}
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span>Linguistic Explanation / Reason for Correction (Optional):</span>
              </label>
              <input
                type="text"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="e.g. In negative past tense, Brahui uses the -pa- infix rather than external negation."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submission button */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Your correction will be indexed into the permanent corpus for Google integration.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Inducing Grammar Rule...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit 100% Correct Brahui & Induce Rule</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
