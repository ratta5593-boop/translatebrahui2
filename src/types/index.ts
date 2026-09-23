export type Language = 'brahui-arabic' | 'brahui-latin' | 'brahui-roman' | 'urdu' | 'english' | string;

export interface DynamicLanguage {
  code: string;
  label: string;
  native: string;
  dir: 'ltr' | 'rtl';
  isCustom?: boolean;
}

export interface DatasetExportStats {
  totalPairs: number;
  verifiedPairs: number;
  dialectCoverage: {
    sarawani: number;
    jhalawani: number;
    rakhshani: number;
    malookAf?: number;
    standard: number;
  };
  grammarRulesCount: number;
  readinessScore: number;
}

export type RuleCategory = 'Syntax' | 'Morphology' | 'Lexical' | 'Phonology' | 'Orthography' | 'Honorifics';

export type RuleStatus = 'active' | 'verified' | 'pending' | 'deprecated';

export interface GrammarRule {
  id: string;
  title: string;
  category: RuleCategory;
  pattern: string;
  explanation: string;
  confidence: number;
  status: RuleStatus;
  examples: {
    incorrect: string;
    correct: string;
    englishGloss: string;
  }[];
  inducedFrom?: {
    sourceText: string;
    initialTranslation: string;
    correctedTranslation: string;
    sourceLang: Language;
    targetLang: Language;
  };
  dialect?: string;
  sourceType?: 'pdf_extraction' | 'user_correction' | 'admin_direct' | 'initial_seed';
  source?: string;
  regexRule?: string;
  exampleSentences?: { brahui: string; english?: string }[];
  sourceDocId?: string;
  sourceDocTitle?: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface CorpusEntry {
  id: string;
  sourceText: string;
  sourceLang: Language;
  targetText: string;
  targetLang: Language;
  alternativeScript?: string;
  dialect?: string;
  contextNotes?: string;
  contributorName: string;
  contributorRole: 'User' | 'Linguist' | 'Native Speaker' | 'Admin';
  verified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  sourceType?: 'pdf_extraction' | 'user_correction' | 'admin_direct' | 'initial_seed';
  createdAt: string;
  timestamp?: string;
  inducedRuleId?: string;
}

export interface KnowledgeDocument {
  id: string;
  filename: string;
  title: string;
  fileSize: number;
  uploadedAt: string;
  type: 'dictionary' | 'grammar' | 'literature' | 'corpus';
  pageCount?: number;
  chunksCount: number;
  sampleSummary: string;
  chunks: string[];
}

export interface DialectVariant {
  dialect: string;
  text: string;
  alternativeScript?: string;
}

export interface TranslationResult {
  sourceText: string;
  sourceLang: Language;
  targetLang: Language;
  translatedText: string;
  alternativeScript?: string; // e.g., Roman if Perso-Arabic selected, or vice versa
  phoneticPronunciation?: string;
  grammaticalNotes?: string[];
  morphemeBreakdown?: {
    word: string;
    root: string;
    partOfSpeech: string;
    meaning: string;
  }[];
  rulesApplied?: {
    id: string;
    title: string;
    category: string;
  }[];
  dictionaryMatches?: {
    term: string;
    meaning: string;
    sourceDoc: string;
  }[];
  consultedKnowledgeDocs?: string[];
  confidence: number;
  paragraphCount?: number;
  wordCount?: number;
  dialectVariants?: DialectVariant[];
}

export interface DailyReport {
  date: string;
  totalTranslationsToday: number;
  rulesLearnedToday: number;
  correctionsIngestedToday: number;
  totalActiveRules: number;
  totalCorpusEntries: number;
  totalKnowledgeDocs: number;
  newRules: GrammarRule[];
  newCorpusEntries: CorpusEntry[];
  categoryBreakdown: Record<string, number>;
}
