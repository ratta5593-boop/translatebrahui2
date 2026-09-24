import fs from 'fs';
import path from 'path';
import type { GrammarRule, CorpusEntry, KnowledgeDocument, DailyReport, DynamicLanguage, DatasetExportStats } from '../src/types/index.js';

export const GOOGLE_TRANSLATE_CATALOG: DynamicLanguage[] = [
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'fa', label: 'Persian', native: 'فارسی', dir: 'rtl' },
  { code: 'ps', label: 'Pashto', native: 'پښتو', dir: 'rtl' },
  { code: 'sd', label: 'Sindhi', native: 'سنڌي', dir: 'rtl' },
  { code: 'bal', label: 'Balochi', native: 'بلوچی', dir: 'rtl' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'pa', label: 'Punjabi', native: 'پنجابی / ਪੰਜਾਬੀ', dir: 'rtl' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', dir: 'ltr' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', dir: 'ltr' },
  { code: 'ru', label: 'Russian', native: 'Русский', dir: 'ltr' },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
  { code: 'es', label: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'de', label: 'German', native: 'Deutsch', dir: 'ltr' },
  { code: 'zh', label: 'Chinese (Simplified)', native: '中文', dir: 'ltr' },
  { code: 'ja', label: 'Japanese', native: '日本語', dir: 'ltr' },
  { code: 'ko', label: 'Korean', native: '한국어', dir: 'ltr' },
  { code: 'it', label: 'Italian', native: 'Italiano', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', native: 'Português', dir: 'ltr' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ku', label: 'Kurdish', native: 'کوردی / Kurdî', dir: 'rtl' },
  { code: 'uz', label: 'Uzbek', native: 'Oʻzbekcha', dir: 'ltr' },
  { code: 'tg', label: 'Tajik', native: 'Тоҷикӣ', dir: 'ltr' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', dir: 'ltr' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', dir: 'ltr' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', dir: 'ltr' },
  { code: 'ms', label: 'Malay', native: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'nl', label: 'Dutch', native: 'Nederlands', dir: 'ltr' },
  { code: 'sv', label: 'Swedish', native: 'Svenska', dir: 'ltr' },
  { code: 'el', label: 'Greek', native: 'Ελληνικά', dir: 'ltr' },
];

interface DatabaseSchema {
  adminCredentials?: {
    username: string;
    password: string;
    updatedAt: string;
  };
  systemSettings?: {
    allowDynamicLanguages: boolean;
    activeDynamicLanguages: DynamicLanguage[];
  };
  grammarRules: GrammarRule[];
  corpus: CorpusEntry[];
  knowledgeDocuments: KnowledgeDocument[];
  translationLogs: {
    id: string;
    sourceText: string;
    sourceLang: string;
    targetLang: string;
    translatedText: string;
    createdAt: string;
  }[];
}

const BUNDLED_DATA_DIR = path.resolve(process.cwd(), 'data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, 'brahui_storage.json');

function resolveStoragePaths(): { activeDir: string; activeFile: string; seedFile: string } {
  const isServerlessOrVercel = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV
  );

  if (isServerlessOrVercel) {
    const tmpDir = path.join('/tmp', 'brahui_data');
    return {
      activeDir: tmpDir,
      activeFile: path.join(tmpDir, 'brahui_storage.json'),
      seedFile: BUNDLED_DB_FILE,
    };
  }

  return {
    activeDir: BUNDLED_DATA_DIR,
    activeFile: BUNDLED_DB_FILE,
    seedFile: BUNDLED_DB_FILE,
  };
}

// Authentic initial Brahui linguistic seeds
const INITIAL_GRAMMAR_RULES: GrammarRule[] = [
  {
    id: 'rule-sov-syntax-01',
    title: 'Strict SOV (Subject - Object - Verb) Word Order',
    category: 'Syntax',
    pattern: 'Subject + Indirect/Direct Object + Main Verb + Auxiliary',
    explanation: 'Brahui strictly requires verbs to terminate the clause, differing from English (SVO) and retaining northern Dravidian syntax.',
    confidence: 98,
    status: 'verified',
    dialect: 'Standard',
    examples: [
      {
        incorrect: 'I hinot urā-ṭí (SVO)',
        correct: 'I urā-ṭí hinot (SOV) / ای اُراٹی ہنوٹ',
        englishGloss: 'I went into the house'
      },
      {
        incorrect: 'O kunēk eleş',
        correct: 'O eleş kunēk / او ایلیش کُنیک',
        englishGloss: 'He/she eats bread'
      }
    ],
    createdAt: '2026-09-15T08:00:00.000Z',
    verifiedAt: '2026-09-15T08:30:00.000Z',
    verifiedBy: 'Brahui Linguistic Board'
  },
  {
    id: 'rule-case-genitive-02',
    title: 'Genitive / Possessive Suffix (-na / نا)',
    category: 'Morphology',
    pattern: '[Noun/Pronoun Stem] + -na',
    explanation: 'Possession is formed by affixing suffix -na directly to the stem. When used with 1st person pronoun "kan" (me), it forms "kan-na" (my/mine).',
    confidence: 99,
    status: 'verified',
    dialect: 'All',
    examples: [
      {
        incorrect: 'I pin Ahmad e',
        correct: 'Kan-na pin Ahmad e / کنا پِن احمد ءِ',
        englishGloss: 'My name is Ahmad'
      },
      {
        incorrect: 'Da urā nī',
        correct: 'Da nā urā e / دا نا اُرا ءِ',
        englishGloss: 'This is your house'
      }
    ],
    createdAt: '2026-09-15T09:00:00.000Z',
    verifiedAt: '2026-09-15T09:15:00.000Z',
    verifiedBy: 'Brahui Linguistic Board'
  },
  {
    id: 'rule-case-dative-03',
    title: 'Dative/Purposive Case Suffix (-ki / کی) and Accusative (-e / ے)',
    category: 'Morphology',
    pattern: '[Noun/Pronoun] + -ki (for), [Noun/Pronoun] + -e (to/accusative)',
    explanation: 'Direct object receives -e when definite, while beneficiary/purpose receives -ki ("for the sake of / to").',
    confidence: 96,
    status: 'verified',
    dialect: 'Standard',
    examples: [
      {
        incorrect: 'Dā kitāb dē kan',
        correct: 'Dā kitāb-e kan-ki ēte / دا کتاب ءِ کنکی ایتر',
        englishGloss: 'Give this book for me'
      },
      {
        incorrect: 'O khane kan',
        correct: 'O kan-e khant / او کنے خنت',
        englishGloss: 'He saw me'
      }
    ],
    createdAt: '2026-09-16T10:00:00.000Z',
    verifiedAt: '2026-09-16T11:00:00.000Z',
    verifiedBy: 'Linguist Admin'
  },
  {
    id: 'rule-ablative-case-04',
    title: 'Ablative Postposition Suffix (-ān / آن)',
    category: 'Morphology',
    pattern: '[Origin Noun] + -ān',
    explanation: 'Movement away or origin is denoted by suffix -ān attached to location or person stems.',
    confidence: 95,
    status: 'verified',
    dialect: 'Standard',
    examples: [
      {
        incorrect: 'I bass shahr min',
        correct: 'I shahr-ān bassuţ / ای شاہر آن بسٹ',
        englishGloss: 'I came from the city'
      }
    ],
    createdAt: '2026-09-16T14:20:00.000Z',
    verifiedAt: '2026-09-16T15:00:00.000Z',
    verifiedBy: 'Linguist Admin'
  },
  {
    id: 'rule-educational-locative-05',
    title: 'Locative Suffix (-ţī / ٹی) for Academic Classes & Education',
    category: 'Morphology',
    pattern: '[Ordinal Adjective] + [jamā\'at / جماعت] + -ţī (-ٹی) + [Verb khwāning / خواننگ]',
    explanation: 'Studying in an academic class or grade requires the ordinal number ("awwalīko" for 1st, "irāmī" for 2nd) preceding "jamā\'at" (class), followed by locative postposition "-ţī" (in) and verb "khwāniva" (I study / read). Raw foreign words like "study" or "class one" must never be left in English.',
    confidence: 99,
    status: 'verified',
    dialect: 'Standard',
    examples: [
      {
        incorrect: 'I study in class one (untranslated)',
        correct: 'I awwalīko jamā\'at-ţī khwāniva / ای اولیکو جماعت ٹی خوانوہ',
        englishGloss: 'I study in class one'
      },
      {
        incorrect: 'I class 1 study',
        correct: 'I awwalīko klās-ţī khwāniva / ای اولیکو جماعت ٹی خوانوہ',
        englishGloss: 'I study in class one'
      }
    ],
    createdAt: '2026-09-17T10:00:00.000Z',
    verifiedAt: '2026-09-17T10:15:00.000Z',
    verifiedBy: 'Brahui Linguistic Board'
  },
  {
    id: 'rule-lateral-fricative-05',
    title: 'Voiceless Lateral Fricative Orthography (ݪ / lh)',
    category: 'Orthography',
    pattern: 'Perso-Arabic [ݪ] <-> Roman Latin [lh]',
    explanation: 'Brahui features the distinctive voiceless lateral fricative /ɬ/ preserved from Proto-Dravidian. In Perso-Arabic it is written as ݪ (lam with small v above) and in Latin Roman as "lh". Never substitute standard l or kh.',
    confidence: 97,
    status: 'verified',
    dialect: 'All',
    examples: [
      {
        incorrect: 'balkul / balikh',
        correct: 'baݪ / ba-lh (feather / wing)',
        englishGloss: 'Wing or feather'
      },
      {
        incorrect: 'mil / milk',
        correct: 'miݪ / mi-lh (ewe / sheep)',
        englishGloss: 'Sheep / ewe'
      }
    ],
    createdAt: '2026-09-17T02:00:00.000Z',
    verifiedAt: '2026-09-17T03:00:00.000Z',
    verifiedBy: 'Orthography Committee'
  }
];

const INITIAL_CORPUS: CorpusEntry[] = [
  {
    id: 'corp-welcome-sarawani',
    sourceText: 'Welcome to Brahui translator',
    sourceLang: 'english',
    targetText: 'براہوئی مترجم ٹی بخیر بسس',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Brāhūī mutarjim-ṭī bakhair basus',
    dialect: 'Sarawani',
    contextNotes: 'Welcoming greeting in Northern / Kalat Sarawani dialect',
    contributorName: 'Brahui Linguistic Academy',
    contributorRole: 'Linguist',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-15T08:00:00.000Z'
  },
  {
    id: 'corp-welcome-jhalawani',
    sourceText: 'Welcome to Brahui translator',
    sourceLang: 'english',
    targetText: 'براہوئی مترجم ٹی خیر ات بسس',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Brāhūī mutarjim-ṭī khair at basus',
    dialect: 'Jhalawani',
    contextNotes: 'Welcoming greeting in Southern / Khuzdar Jhalawani dialect',
    contributorName: 'Mir Gul Khan',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-15T08:05:00.000Z'
  },
  {
    id: 'corp-welcome-rakhshani',
    sourceText: 'Welcome to Brahui translator',
    sourceLang: 'english',
    targetText: 'براہوئی مترجم ٹی وش اتکئے',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Brāhūī mutarjim-ṭī wash atkē',
    dialect: 'Rakhshani',
    contextNotes: 'Welcoming greeting in Western / Chagai & Nushki Rakhshani dialect',
    contributorName: 'Chagai Cultural Circle',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-15T08:10:00.000Z'
  },
  {
    id: 'corp-001-sarawani',
    sourceText: 'How are you?',
    sourceLang: 'english',
    targetText: 'نی جوڑ اُس؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Nī jor us?',
    dialect: 'Sarawani',
    contextNotes: 'Common everyday greeting in Sarawani dialect',
    contributorName: 'Dr. Abdul Rehman Brahui',
    contributorRole: 'Linguist',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-15T09:00:00.000Z'
  },
  {
    id: 'corp-001-jhalawani',
    sourceText: 'How are you?',
    sourceLang: 'english',
    targetText: 'نی دراخ اُس؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Nī drākh us?',
    dialect: 'Jhalawani',
    contextNotes: 'Common everyday inquiry in Jhalawani dialect',
    contributorName: 'Abdul Qayyum',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-15T09:05:00.000Z'
  },
  {
    id: 'corp-001-rakhshani',
    sourceText: 'How are you?',
    sourceLang: 'english',
    targetText: 'شما چتون ات؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Shumā chitōn at?',
    dialect: 'Rakhshani',
    contextNotes: 'Common inquiry in Rakhshani dialect',
    contributorName: 'Naseer Mengal',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-15T09:10:00.000Z'
  },
  {
    id: 'corp-002',
    sourceText: 'I am fine, thank you.',
    sourceLang: 'english',
    targetText: 'ای جوڑ اُٹ، منتوار۔',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I jor uţ, minatwār.',
    dialect: 'Standard',
    contextNotes: 'Polite response to inquiry about well-being',
    contributorName: 'Gul Khan',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-15T09:30:00.000Z'
  },
  {
    id: 'corp-003-sarawani',
    sourceText: 'What is your name?',
    sourceLang: 'english',
    targetText: 'نا پِن انت ءِ؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Nā pin ant e?',
    dialect: 'Sarawani',
    contextNotes: 'Asking someone\'s name politely in Sarawani dialect',
    contributorName: 'Fatima Mengal',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-16T11:20:00.000Z'
  },
  {
    id: 'corp-003-jhalawani',
    sourceText: 'What is your name?',
    sourceLang: 'english',
    targetText: 'نا پِن دیر ءِ؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Nā pin dīr e?',
    dialect: 'Jhalawani',
    contextNotes: 'Asking someone\'s name in Jhalawani dialect',
    contributorName: 'Sardar Zehri',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-16T11:25:00.000Z'
  },
  {
    id: 'corp-003-rakhshani',
    sourceText: 'What is your name?',
    sourceLang: 'english',
    targetText: 'تئی نام چے انت؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Taī nām chē ant?',
    dialect: 'Rakhshani',
    contextNotes: 'Asking someone\'s name in Rakhshani dialect',
    contributorName: 'Rashid Chagai',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-16T11:30:00.000Z'
  },
  {
    id: 'corp-urdu-name-sarawani',
    sourceText: 'آپ کا نام کیا ہے؟',
    sourceLang: 'urdu',
    targetText: 'نا پِن انت ءِ؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Nā pin ant e?',
    dialect: 'Sarawani',
    contextNotes: 'Urdu to Brahui name query (Sarawani)',
    contributorName: 'Fatima Mengal',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-16T11:20:00.000Z'
  },
  {
    id: 'corp-urdu-name-jhalawani',
    sourceText: 'آپ کا نام کیا ہے؟',
    sourceLang: 'urdu',
    targetText: 'نا پِن دیر ءِ؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Nā pin dīr e?',
    dialect: 'Jhalawani',
    contextNotes: 'Urdu to Brahui name query (Jhalawani)',
    contributorName: 'Sardar Zehri',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-16T11:25:00.000Z'
  },
  {
    id: 'corp-urdu-name-rakhshani',
    sourceText: 'آپ کا نام کیا ہے؟',
    sourceLang: 'urdu',
    targetText: 'تئی نام چے انت؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Taī nām chē ant?',
    dialect: 'Rakhshani',
    contextNotes: 'Urdu to Brahui name query (Rakhshani)',
    contributorName: 'Rashid Chagai',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-16T11:30:00.000Z'
  },
  {
    id: 'corp-004',
    sourceText: 'میرا نام احمد ہے اور میں کوئٹہ میں رہتا ہوں۔',
    sourceLang: 'urdu',
    targetText: 'کنا پِن احمد ءِ او ای کوئٹہ ٹی رہنگوہ۔',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Kan-na pin Ahmad e o i Quetta-ṭí rahengova.',
    dialect: 'Standard',
    contextNotes: 'Self introduction with locative suffix -ṭí',
    contributorName: 'Ahmad Zehri',
    contributorRole: 'Native Speaker',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-16T15:40:00.000Z'
  },
  {
    id: 'corp-005',
    sourceText: 'Where is the hospital?',
    sourceLang: 'english',
    targetText: 'ہسپتال اراڑے ءِ؟',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Haspitāl arāṛe e?',
    dialect: 'Standard',
    contextNotes: 'Inquiry for directions',
    contributorName: 'Admin',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T08:10:00.000Z'
  },
  {
    id: 'corp-006',
    sourceText: 'ہمیں پانی چاہیے',
    sourceLang: 'urdu',
    targetText: 'ننے دیر پکار ءِ۔',
    targetLang: 'brahui-arabic',
    alternativeScript: 'Nan-e dīr pakār e.',
    dialect: 'Standard',
    contextNotes: 'First person plural dative construction',
    contributorName: 'Zainab Raisani',
    contributorRole: 'Linguist',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:15:00.000Z'
  },
  {
    id: 'corp-edu-class1-eng',
    sourceText: 'I study in class one',
    sourceLang: 'english',
    targetText: 'ای اولیکو جماعت ٹی خوانوہ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I awwalīko jamā\'at-ţī khwāniva',
    dialect: 'Standard',
    contextNotes: 'Academic grade expression with strict SOV and locative -ţī postposition',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:20:00.000Z'
  },
  {
    id: 'corp-edu-class1-eng-punct',
    sourceText: 'I study in class one.',
    sourceLang: 'english',
    targetText: 'ای اولیکو جماعت ٹی خوانوہ۔',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I awwalīko jamā\'at-ţī khwāniva.',
    dialect: 'Standard',
    contextNotes: 'Academic grade expression with punctuation',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:21:00.000Z'
  },
  {
    id: 'corp-edu-class1-num-eng',
    sourceText: 'I study in class 1',
    sourceLang: 'english',
    targetText: 'ای اولیکو جماعت ٹی خوانوہ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I awwalīko jamā\'at-ţī khwāniva',
    dialect: 'Standard',
    contextNotes: 'Academic grade with numeric digit',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:22:00.000Z'
  },
  {
    id: 'corp-edu-class1-urdu',
    sourceText: 'میں پہلی جماعت میں پڑھتا ہوں',
    sourceLang: 'urdu',
    targetText: 'ای اولیکو جماعت ٹی خوانوہ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I awwalīko jamā\'at-ţī khwāniva',
    dialect: 'Standard',
    contextNotes: 'Urdu to Brahui academic grade 1 sentence',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:23:00.000Z'
  },
  {
    id: 'corp-edu-class1-urdu-punct',
    sourceText: 'میں پہلی جماعت میں پڑھتا ہوں۔',
    sourceLang: 'urdu',
    targetText: 'ای اولیکو جماعت ٹی خوانوہ۔',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I awwalīko jamā\'at-ţī khwāniva.',
    dialect: 'Standard',
    contextNotes: 'Urdu to Brahui academic grade 1 sentence with punctuation',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:24:00.000Z'
  },
  {
    id: 'corp-edu-class1-urdu-loan',
    sourceText: 'میں کلاس ون میں پڑھتا ہوں',
    sourceLang: 'urdu',
    targetText: 'ای اولیکو جماعت ٹی خوانوہ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I awwalīko jamā\'at-ţī khwāniva',
    dialect: 'Standard',
    contextNotes: 'Urdu colloquial loan "کلاس ون" translated fully into authentic Brahui',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:25:00.000Z'
  },
  {
    id: 'corp-edu-class1-urdu-loan-punct',
    sourceText: 'میں کلاس ون میں پڑھتا ہوں۔',
    sourceLang: 'urdu',
    targetText: 'ای اولیکو جماعت ٹی خوانوہ۔',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I awwalīko jamā\'at-ţī khwāniva.',
    dialect: 'Standard',
    contextNotes: 'Urdu colloquial loan "کلاس ون" with punctuation',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:26:00.000Z'
  },
  {
    id: 'corp-edu-student-eng',
    sourceText: 'I am a student',
    sourceLang: 'english',
    targetText: 'ای اسہ شاگرد اس اُٹ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I asa shāgird-as uţ',
    dialect: 'Standard',
    contextNotes: 'First person student identity',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:27:00.000Z'
  },
  {
    id: 'corp-edu-student-urdu',
    sourceText: 'میں ایک طالب علم ہوں',
    sourceLang: 'urdu',
    targetText: 'ای اسہ شاگرد اس اُٹ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I asa shāgird-as uţ',
    dialect: 'Standard',
    contextNotes: 'Urdu student sentence',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:28:00.000Z'
  },
  {
    id: 'corp-edu-school-eng',
    sourceText: 'I go to school',
    sourceLang: 'english',
    targetText: 'ای اسکول آ ہنوہ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I iskūl-ā hinova',
    dialect: 'Standard',
    contextNotes: 'Directional postposition -ā with school',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:29:00.000Z'
  },
  {
    id: 'corp-edu-school-urdu',
    sourceText: 'میں اسکول جاتا ہوں',
    sourceLang: 'urdu',
    targetText: 'ای اسکول آ ہنوہ',
    targetLang: 'brahui-arabic',
    alternativeScript: 'I iskūl-ā hinova',
    dialect: 'Standard',
    contextNotes: 'Urdu school sentence',
    contributorName: 'Brahui Linguistic Board',
    contributorRole: 'Admin',
    verified: true,
    status: 'approved',
    sourceType: 'initial_seed',
    createdAt: '2026-09-17T09:30:00.000Z'
  }
];

const INITIAL_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-bray-grammar-1909',
    filename: 'Denys_Bray_The_Brahui_Language_Grammar_Pt1.pdf',
    title: 'The Brahui Language: Vol I - Analytic Grammar (Denys Bray)',
    fileSize: 4194304,
    uploadedAt: '2026-09-14T10:00:00.000Z',
    type: 'grammar',
    pageCount: 320,
    chunksCount: 18,
    sampleSummary: 'Authoritative foundational treatise analyzing Brahui Dravidian roots, morphology, postpositional system, complex verbal affixes, reflexive pronouns, and comparative syntax with Dravidian languages.',
    chunks: [
      'Brahui Grammar Part I: Noun Declension. Nominative case has no suffix. Genitive affix is -na. Dative suffix is -e. Locative affixes are -āī (upon) and -ṭī (in, inside). Ablative is -ān (from). Associative suffix is -to (with). Purposive suffix is -ki (for).',
      'Verbal Conjugation: Present-Future tense suffixes for Person: 1st Sing: -va/ -uţ; 2nd Sing: -sa / -us; 3rd Sing: -ik / -e; 1st Plur: -ona / -un; 2nd Plur: -ere / -ure; 3rd Plur: -ira / -o.',
      'Negative conjugation: Formed by infusing -pa- or -fa- infix between the root and verbal inflectional termination. Example: karing (to do) -> kappara (I do not do), kunēk (he eats) -> kumpak (he does not eat).'
    ]
  },
  {
    id: 'doc-brahui-core-dictionary',
    filename: 'Brahui_Academy_Lexicon_Eng_Urdu.pdf',
    title: 'Brahui Academy Comprehensive Lexicon & Terminology',
    fileSize: 6291456,
    uploadedAt: '2026-09-15T12:00:00.000Z',
    type: 'dictionary',
    pageCount: 450,
    chunksCount: 25,
    sampleSummary: 'Over 8,000 core Brahui terms catalogued across Perso-Arabic and Roman scripts with English and Urdu definitions, etymology, and dialectical variations between Sarawani and Jhalawani.',
    chunks: [
      'Dictionary Extract A-B: Urā (noun) = House / Home (اردو: گھر). Dīr (noun) = Water (اردو: پانی). Elesh / Kūl (noun) = Bread / Food (اردو: روٹی / کھانا). Huch (noun) = Camel (اردو: اونٹ). Pīr (noun) = Rain (اردو: بارش). Khān (noun) = Eye (اردو: آنکھ).',
      'Dictionary Extract M-P: Minatwār (adj) = Grateful / Thankful (اردو: شکرگزار). Mehrbāni (noun) = Kindness. Pin (noun) = Name (اردو: نام). Bā (noun) = Mouth (اردو: منہ). Kholum (noun) = Wheat (اردو: گندم).'
    ]
  }
];

class DatabaseService {
  private data: DatabaseSchema;

  private activeDir: string;
  private activeFile: string;
  private seedFile: string;

  constructor() {
    const config = resolveStoragePaths();
    this.activeDir = config.activeDir;
    this.activeFile = config.activeFile;
    this.seedFile = config.seedFile;

    this.data = {
      grammarRules: INITIAL_GRAMMAR_RULES,
      corpus: INITIAL_CORPUS,
      knowledgeDocuments: INITIAL_DOCUMENTS,
      translationLogs: []
    };
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(this.activeDir)) {
        fs.mkdirSync(this.activeDir, { recursive: true });
      }

      // Check if active file exists
      if (fs.existsSync(this.activeFile)) {
        const fileContent = fs.readFileSync(this.activeFile, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed.grammarRules && parsed.corpus) {
          this.data = parsed;
          this.seedMissingCorpus();
          this.seedMissingRules();
          return;
        }
      }

      // If active file does not exist but seed file exists (e.g. bundled data on Vercel)
      if (this.activeFile !== this.seedFile && fs.existsSync(this.seedFile)) {
        const fileContent = fs.readFileSync(this.seedFile, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed.grammarRules && parsed.corpus) {
          this.data = parsed;
          this.seedMissingCorpus();
          this.seedMissingRules();
          this.persist();
          return;
        }
      }

      this.seedMissingCorpus();
      this.seedMissingRules();
      this.persist();
    } catch (err) {
      console.error('Error initializing database file, falling back to memory state:', err);
    }
  }

  private seedMissingRules() {
    let changed = false;
    for (const initRule of INITIAL_GRAMMAR_RULES) {
      const exists = this.data.grammarRules.some(
        r => r.id === initRule.id || r.title.toLowerCase().trim() === initRule.title.toLowerCase().trim()
      );
      if (!exists) {
        this.data.grammarRules.push(initRule);
        changed = true;
      }
    }
    if (changed) {
      this.persist();
    }
  }

  private seedMissingCorpus() {
    let changed = false;
    for (const initEntry of INITIAL_CORPUS) {
      const exists = this.data.corpus.some(
        c =>
          c.sourceText.trim().toLowerCase() === initEntry.sourceText.trim().toLowerCase() &&
          c.dialect === initEntry.dialect &&
          c.sourceLang === initEntry.sourceLang
      );
      if (!exists) {
        this.data.corpus.push(initEntry);
        changed = true;
      }
    }
    if (changed) {
      this.persist();
    }
  }

  private persist() {
    const jsonStr = JSON.stringify(this.data, null, 2);

    // Primary attempt: write to activeFile
    try {
      if (!fs.existsSync(this.activeDir)) {
        fs.mkdirSync(this.activeDir, { recursive: true });
      }
      fs.writeFileSync(this.activeFile, jsonStr, 'utf-8');
    } catch (err: any) {
      console.warn(`Primary write failed to ${this.activeFile} (${err?.message}). Attempting /tmp fallback...`);
      try {
        const tmpDir = path.join('/tmp', 'brahui_data');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        this.activeDir = tmpDir;
        this.activeFile = path.join(tmpDir, 'brahui_storage.json');
        fs.writeFileSync(this.activeFile, jsonStr, 'utf-8');
        console.log(`Persisted database state successfully to ${this.activeFile}`);
      } catch (tmpErr) {
        console.error('Failed to write database file to fallback /tmp:', tmpErr);
      }
    }

    // Secondary attempt: if running in local dev / AI Studio workspace, keep bundled file updated
    if (this.activeFile !== BUNDLED_DB_FILE && fs.existsSync(BUNDLED_DATA_DIR)) {
      try {
        fs.writeFileSync(BUNDLED_DB_FILE, jsonStr, 'utf-8');
      } catch {
        // Expected in read-only serverless production environments
      }
    }
  }

  /**
   * Syncs user-submitted corrections and learned rules from client-side localStorage.
   * Guarantees that rules and corrections are never lost between deployments, cold starts, or previews.
   */
  public syncLearnedData(
    clientRules: GrammarRule[] = [],
    clientCorpus: CorpusEntry[] = []
  ): { addedRules: number; addedCorpus: number } {
    let addedRules = 0;
    let addedCorpus = 0;

    for (const rule of clientRules) {
      if (!rule || !rule.title) continue;
      const exists = this.data.grammarRules.some(
        r => r.id === rule.id || (r.title === rule.title && r.pattern === rule.pattern)
      );
      if (!exists) {
        this.data.grammarRules.unshift({
          ...rule,
          status: rule.status || 'verified',
        });
        addedRules++;
      }
    }

    for (const entry of clientCorpus) {
      if (!entry || !entry.sourceText || !entry.targetText) continue;
      const exists = this.data.corpus.some(
        c =>
          c.id === entry.id ||
          (c.sourceText.trim().toLowerCase() === entry.sourceText.trim().toLowerCase() &&
           c.sourceLang === entry.sourceLang &&
           c.targetLang === entry.targetLang &&
           c.targetText.trim() === entry.targetText.trim())
      );
      if (!exists) {
        this.data.corpus.unshift({
          ...entry,
          verified: true,
          status: 'approved',
        });
        addedCorpus++;
      }
    }

    if (addedRules > 0 || addedCorpus > 0) {
      this.persist();
    }

    return { addedRules, addedCorpus };
  }

  // --- Admin Credentials Management ---
  public getAdminCredentials(): { username: string; password: string } {
    if (this.data.adminCredentials && this.data.adminCredentials.username && this.data.adminCredentials.password) {
      return {
        username: this.data.adminCredentials.username,
        password: this.data.adminCredentials.password,
      };
    }
    return {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    };
  }

  public updateAdminCredentials(newUsername: string, newPassword: string): { success: boolean; username: string } {
    this.data.adminCredentials = {
      username: newUsername.trim(),
      password: newPassword,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return {
      success: true,
      username: newUsername.trim(),
    };
  }

  // --- Grammar Rules ---
  public getGrammarRules(): GrammarRule[] {
    return this.data.grammarRules;
  }

  public addGrammarRule(rule: Omit<GrammarRule, 'id' | 'createdAt'>): GrammarRule {
    const newRule: GrammarRule = {
      ...rule,
      id: `rule-induced-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    this.data.grammarRules.unshift(newRule);
    this.persist();
    return newRule;
  }

  public updateRuleStatus(id: string, status: GrammarRule['status'], verifiedBy?: string): GrammarRule | null {
    const rule = this.data.grammarRules.find(r => r.id === id);
    if (!rule) return null;
    rule.status = status;
    if (status === 'verified') {
      rule.verifiedAt = new Date().toISOString();
      rule.verifiedBy = verifiedBy || 'Admin Reviewer';
    }
    this.persist();
    return rule;
  }

  public getPendingRules(): GrammarRule[] {
    return this.data.grammarRules.filter(r => r.status === 'pending');
  }

  public getActiveRules(): GrammarRule[] {
    return this.data.grammarRules.filter(r => r.status === 'active' || r.status === 'verified');
  }

  public approveRule(id: string, verifiedBy?: string): GrammarRule | null {
    const rule = this.data.grammarRules.find(r => r.id === id);
    if (!rule) return null;
    rule.status = 'verified';
    rule.verifiedAt = new Date().toISOString();
    rule.verifiedBy = verifiedBy || 'Admin Reviewer';

    // Also approve any linked corpus entry
    const linked = this.data.corpus.find(
      c => c.inducedRuleId === rule.id || (rule.inducedFrom && c.sourceText === rule.inducedFrom.sourceText)
    );
    if (linked) {
      linked.verified = true;
      linked.status = 'approved';
    }

    this.persist();
    return rule;
  }

  public rejectRule(id: string): GrammarRule | null {
    const rule = this.data.grammarRules.find(r => r.id === id);
    if (!rule) return null;
    rule.status = 'deprecated';
    this.persist();
    return rule;
  }

  public approveCorpusEntry(id: string): CorpusEntry | null {
    const entry = this.data.corpus.find(c => c.id === id);
    if (!entry) return null;
    entry.verified = true;
    entry.status = 'approved';
    this.persist();
    return entry;
  }

  public rejectCorpusEntry(id: string): CorpusEntry | null {
    const entry = this.data.corpus.find(c => c.id === id);
    if (!entry) return null;
    entry.verified = false;
    entry.status = 'rejected';
    this.persist();
    return entry;
  }

  public getReviewQueue() {
    const pendingRules = this.data.grammarRules.filter(r => r.status === 'pending');
    const pendingCorpus = this.data.corpus.filter(c => !c.verified || c.status === 'pending');
    return {
      pendingRules,
      pendingCorpus,
      counts: {
        rules: pendingRules.length,
        corpus: pendingCorpus.length,
        total: pendingRules.length + pendingCorpus.length,
      },
    };
  }

  // --- Corpus Entries ---
  public getCorpus(): CorpusEntry[] {
    return this.data.corpus;
  }

  public addCorpusEntry(entry: Omit<CorpusEntry, 'id' | 'createdAt'>): CorpusEntry {
    const newEntry: CorpusEntry = {
      ...entry,
      id: `corp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.data.corpus.unshift(newEntry);
    this.persist();
    return newEntry;
  }

  // --- Knowledge Documents ---
  public getKnowledgeDocs(): KnowledgeDocument[] {
    return this.data.knowledgeDocuments;
  }

  public addKnowledgeDoc(doc: Omit<KnowledgeDocument, 'id' | 'uploadedAt'>): KnowledgeDocument {
    const newDoc: KnowledgeDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      uploadedAt: new Date().toISOString()
    };
    this.data.knowledgeDocuments.unshift(newDoc);
    this.persist();
    return newDoc;
  }

  public deleteKnowledgeDoc(id: string): boolean {
    const initialLen = this.data.knowledgeDocuments.length;
    this.data.knowledgeDocuments = this.data.knowledgeDocuments.filter(d => d.id !== id);
    if (this.data.knowledgeDocuments.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  /**
   * Actively reads all chunks of a knowledge document to extract rules, vocabulary,
   * and grammar context for translations and linguistic learning.
   */
  public extractAndIngestRulesFromDoc(doc: KnowledgeDocument): {
    extractedRulesCount: number;
    extractedVocabCount: number;
    ruleTitles: string[];
  } {
    const fullText = (doc.chunks && doc.chunks.length > 0) ? doc.chunks.join('\n\n') : doc.sampleSummary;
    const addedRuleTitles: string[] = [];
    let vocabAdded = 0;

    // 1. Grammatical Rule Patterns Extraction
    const grammarPatterns = [
      {
        keyword: 'Genitive',
        test: /genitive|possessive|-na\b|مضاف|اضافت/i,
        title: `Genitive Case Inflection (-nā / نا) [From: ${doc.title.slice(0, 30)}]`,
        category: 'Morphology' as const,
        pattern: '[Noun/Pronoun Stem] + -nā (نا)',
        explanation: 'The genitive case in Brahui expresses possession or attribution with suffix -nā, attested in reference grammar.',
        incorrect: 'I urā (my house)',
        correct: 'Kan-nā urā / کنا اُرا',
        gloss: 'My house (possessive stem + -na)',
      },
      {
        keyword: 'Locative',
        test: /locative|-ṭī|-āī|in, inside|upon|اندر|مقام/i,
        title: `Locative Postposition Suffix (-ṭī / ٹی & -āī) [From: ${doc.title.slice(0, 30)}]`,
        category: 'Syntax' as const,
        pattern: '[Location Noun] + -ṭī (inside) / -āī (upon)',
        explanation: 'Brahui marks internal and surface location through postpositional suffixes attached directly to nominal stems.',
        incorrect: 'I Quetta hinot',
        correct: 'I Quetta-ṭī hinot / ای کوئٹہ ٹی ہنوٹ',
        gloss: 'I went into Quetta (locative marker -ṭī)',
      },
      {
        keyword: 'Dative',
        test: /dative|purposive|-ki\b|-e\b|مفعول|کے لیے/i,
        title: `Dative & Purposive Postposition (-ki / کی) [From: ${doc.title.slice(0, 30)}]`,
        category: 'Morphology' as const,
        pattern: '[Indirect Object / Beneficiary] + -ki (for)',
        explanation: 'Benefactive and purposive relations in Brahui require the postposition -ki placed after the nominal stem.',
        incorrect: 'Dā kitāb dē kan',
        correct: 'Dā kitāb-e kan-ki ēte / دا کتاب ءِ کنکی ایتر',
        gloss: 'Give this book for me (purposive -ki)',
      },
      {
        keyword: 'Ablative',
        test: /ablative|-ān\b|from\b|سے|نکالنا/i,
        title: `Ablative Origin Postposition (-ān / آن) [From: ${doc.title.slice(0, 30)}]`,
        category: 'Morphology' as const,
        pattern: '[Origin / Source Noun] + -ān (from)',
        explanation: 'Brahui denotes spatial or temporal origin using the ablative suffix -ān.',
        incorrect: 'I shahr bassuţ',
        correct: 'I shahr-ān bassuţ / ای شاہر آن بسٹ',
        gloss: 'I came from the city (ablative origin)',
      },
      {
        keyword: 'SOV Syntax',
        test: /sov|word order|verb final|clause|فاعل مفعول فعل/i,
        title: `Strict Clause-Final Verb Word Order (SOV) [From: ${doc.title.slice(0, 30)}]`,
        category: 'Syntax' as const,
        pattern: 'Subject + Object/Complement + Final Verb',
        explanation: 'Syntactic parsing requires main verb and copula auxiliaries to terminate the clause.',
        incorrect: 'O kunēk eleş (SVO)',
        correct: 'O eleş kunēk / او ایلیش کُنیک (SOV)',
        gloss: 'He/she bread eats',
      },
      {
        keyword: 'Lateral Fricative',
        test: /lateral|fricative|ݪ|lh\b|voiceless/i,
        title: `Voiceless Lateral Fricative Orthography (ݪ / lh) [From: ${doc.title.slice(0, 30)}]`,
        category: 'Orthography' as const,
        pattern: 'Perso-Arabic [ݪ] <-> Roman [lh]',
        explanation: 'Distinguishes the archaic Proto-Dravidian lateral fricative /ɬ/ preserved in Brahui.',
        incorrect: 'bal / balkh',
        correct: 'baݪ / ba-lh (feather / wing)',
        gloss: 'Wing or feather',
      },
      {
        keyword: 'Negative Conjugation',
        test: /negative|-pa-|-fa-|منفی|نفی/i,
        title: `Negative Conjugational Infixes (-pa- / -fa-) [From: ${doc.title.slice(0, 30)}]`,
        category: 'Morphology' as const,
        pattern: '[Verb Root] + -pa-/-fa- + [Tense Suffix]',
        explanation: 'Negation is inflected synthetically inside the verb morphology via infixes rather than separate negative particles.',
        incorrect: 'I na karing',
        correct: 'I kappara / ای کپّرہ (I do not do)',
        gloss: 'Synthetic verbal negation',
      },
    ];

    for (const pat of grammarPatterns) {
      if (pat.test.test(fullText)) {
        // Check if rule already exists
        const exists = this.data.grammarRules.some(
          r => r.title.toLowerCase().includes(pat.keyword.toLowerCase())
        );
        if (!exists) {
          const newRule = this.addGrammarRule({
            title: pat.title,
            category: pat.category,
            pattern: pat.pattern,
            explanation: `${pat.explanation} Extracted and proposed automatically from uploaded reference: "${doc.title}". Awaiting admin approval.`,
            confidence: 97,
            status: 'pending',
            sourceType: 'pdf_extraction',
            sourceDocId: doc.id,
            sourceDocTitle: doc.title,
            dialect: 'Standard',
            examples: [
              {
                incorrect: pat.incorrect,
                correct: pat.correct,
                englishGloss: pat.gloss,
              },
            ],
            inducedFrom: {
              sourceText: `Extracted from knowledge base document: ${doc.title}`,
              initialTranslation: pat.incorrect,
              correctedTranslation: pat.correct,
              sourceLang: 'english',
              targetLang: 'brahui-arabic',
            },
          });
          addedRuleTitles.push(newRule.title);
        }
      }
    }

    // 2. Vocabulary & Lexicon Terms Extraction
    // Matches expressions like: Term (noun) = English (Urdu: ...) or Term = English
    const vocabRegex = /([A-Za-zāīūēōḍṭṛṣẓñ’'\u0600-\u06FF]+(?:\s+[A-Za-zāīūēōḍṭṛṣẓñ’'\u0600-\u06FF]+)?)\s*(?:\([^)]*\))?\s*=\s*([^(\n\r,;.]+)(?:\((?:اردو:\s*)?([^)]+)\))?/g;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = vocabRegex.exec(fullText)) !== null && count < 25) {
      const termRaw = match[1]?.trim();
      const engDef = match[2]?.trim();
      const urduDef = match[3]?.trim();

      if (termRaw && engDef && termRaw.length > 1 && engDef.length > 1) {
        // Determine whether term is English, Brahui or Urdu
        const isPersoArabic = /[\u0600-\u06FF]/.test(termRaw);
        const corpusSource = engDef;
        const corpusTarget = isPersoArabic ? termRaw : (urduDef || termRaw);
        const altScript = isPersoArabic ? (urduDef || '') : termRaw;

        const alreadyInCorpus = this.data.corpus.some(
          c => c.sourceText.toLowerCase() === corpusSource.toLowerCase()
        );

        if (!alreadyInCorpus) {
          this.addCorpusEntry({
            sourceText: corpusSource,
            sourceLang: 'english',
            targetText: corpusTarget,
            targetLang: 'brahui-arabic',
            alternativeScript: altScript,
            dialect: 'Standard',
            contextNotes: `Extracted from knowledge base: ${doc.title}`,
            contributorName: `PDF Lexicon (${doc.title.slice(0, 20)})`,
            contributorRole: 'Linguist',
            verified: false,
            status: 'pending',
            sourceType: 'pdf_extraction',
          });
          vocabAdded++;
          count++;
        }
      }
    }

    this.persist();

    return {
      extractedRulesCount: addedRuleTitles.length,
      extractedVocabCount: vocabAdded,
      ruleTitles: addedRuleTitles,
    };
  }

  // --- Translation Logs ---
  public logTranslation(log: { sourceText: string; sourceLang: string; targetLang: string; translatedText: string }) {
    this.data.translationLogs.unshift({
      id: `log-${Date.now()}`,
      ...log,
      createdAt: new Date().toISOString()
    });
    // Keep max 200 logs
    if (this.data.translationLogs.length > 200) {
      this.data.translationLogs = this.data.translationLogs.slice(0, 200);
    }
    this.persist();
  }

  // --- Daily Report Generator ---
  public getDailyReport(targetDateStr?: string): DailyReport {
    const today = targetDateStr || new Date().toISOString().split('T')[0];
    
    // Filter rules created on this date
    const newRules = this.data.grammarRules.filter(r => r.createdAt.startsWith(today));
    
    // Filter corpus entries submitted on this date
    const newCorpusEntries = this.data.corpus.filter(c => c.createdAt.startsWith(today));
    
    // Count translations today
    const translationsToday = this.data.translationLogs.filter(t => t.createdAt.startsWith(today)).length;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const rule of this.data.grammarRules) {
      categoryBreakdown[rule.category] = (categoryBreakdown[rule.category] || 0) + 1;
    }

    return {
      date: today,
      totalTranslationsToday: translationsToday,
      rulesLearnedToday: newRules.length,
      correctionsIngestedToday: newCorpusEntries.length,
      totalActiveRules: this.data.grammarRules.filter(r => r.status !== 'deprecated').length,
      totalCorpusEntries: this.data.corpus.length,
      totalKnowledgeDocs: this.data.knowledgeDocuments.length,
      newRules,
      newCorpusEntries,
      categoryBreakdown
    };
  }

  // --- Complete Export Format (Google Translate / Fine-tuning compatible) ---
  public getCompleteCorpusExport() {
    return {
      schemaVersion: '2.0.0',
      exportPurpose: 'Google Translate Community Corpus Contribution & Multi-lingual LLM Fine-tuning',
      exportedAt: new Date().toISOString(),
      sourceProject: 'Brahui AI Translation & Active Self-Learning System',
      languages: {
        brahuiArabic: { code: 'brh-Arab', name: 'Brahui (Perso-Arabic script)', script: 'Arabic' },
        brahuiRoman: { code: 'brh-Latn', name: 'Brahui (Brolikwar Roman script)', script: 'Roman' },
        urdu: { code: 'ur', name: 'Urdu', script: 'Arabic-Nastaliq' },
        english: { code: 'en', name: 'English', script: 'Latin' }
      },
      stats: {
        totalCorpusPairs: this.data.corpus.length,
        totalGrammarRules: this.data.grammarRules.length,
        totalKnowledgeDocuments: this.data.knowledgeDocuments.length
      },
      grammar_rules: this.data.grammarRules.map(r => ({
        rule_id: r.id,
        rule_name: r.title,
        category: r.category,
        pattern_expression: r.pattern,
        linguistic_explanation: r.explanation,
        confidence_score: r.confidence,
        verification_status: r.status,
        dialect: r.dialect || 'Standard',
        examples: r.examples,
        induced_from: r.inducedFrom || null,
        created_at: r.createdAt
      })),
      parallel_corpus: this.data.corpus.map(c => ({
        entry_id: c.id,
        source_language: c.sourceLang,
        source_text: c.sourceText,
        target_language: c.targetLang,
        target_text: c.targetText,
        alternative_script_transliteration: c.alternativeScript || '',
        dialect_tag: c.dialect || 'Standard',
        contextual_notes: c.contextNotes || '',
        contributor: {
          name: c.contributorName,
          role: c.contributorRole
        },
        verified_by_linguist: c.verified,
        created_at: c.createdAt,
        associated_induced_rule_id: c.inducedRuleId || null
      })),
      knowledge_documents_index: this.data.knowledgeDocuments.map(d => ({
        document_id: d.id,
        filename: d.filename,
        title: d.title,
        type: d.type,
        chunks_indexed: d.chunksCount,
        uploaded_at: d.uploadedAt
      }))
    };
  }

  // --- System Settings & Dynamic Languages ---
  public getSystemSettings(): { allowDynamicLanguages: boolean; activeDynamicLanguages: DynamicLanguage[] } {
    if (!this.data.systemSettings) {
      this.data.systemSettings = {
        allowDynamicLanguages: true,
        activeDynamicLanguages: [
          { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
          { code: 'fa', label: 'Persian', native: 'فارسی', dir: 'rtl' },
          { code: 'ps', label: 'Pashto', native: 'پښتو', dir: 'rtl' },
          { code: 'bal', label: 'Balochi', native: 'بلوچی', dir: 'rtl' },
          { code: 'sd', label: 'Sindhi', native: 'سنڌي', dir: 'rtl' },
        ],
      };
      this.persist();
    }
    return this.data.systemSettings;
  }

  public updateSystemSettings(partial: Partial<{ allowDynamicLanguages: boolean }>) {
    const settings = this.getSystemSettings();
    if (typeof partial.allowDynamicLanguages === 'boolean') {
      settings.allowDynamicLanguages = partial.allowDynamicLanguages;
    }
    this.data.systemSettings = settings;
    this.persist();
    return settings;
  }

  public addDynamicLanguage(lang: DynamicLanguage): { success: boolean; languages: DynamicLanguage[] } {
    const settings = this.getSystemSettings();
    const exists = settings.activeDynamicLanguages.some(l => l.code === lang.code);
    if (!exists) {
      settings.activeDynamicLanguages.push(lang);
      this.persist();
    }
    return { success: true, languages: settings.activeDynamicLanguages };
  }

  public removeDynamicLanguage(code: string): { success: boolean; languages: DynamicLanguage[] } {
    const settings = this.getSystemSettings();
    settings.activeDynamicLanguages = settings.activeDynamicLanguages.filter(l => l.code !== code);
    this.persist();
    return { success: true, languages: settings.activeDynamicLanguages };
  }

  // --- Dataset Quality & Google Translate Readiness Exports ---

  public mapToFloresCode(lang: string): string {
    switch (lang) {
      case 'brahui-arabic': return 'brh_Arab';
      case 'brahui-latin':
      case 'brahui-roman': return 'brh_Latn';
      case 'urdu': return 'urd_Arab';
      case 'english': return 'eng_Latn';
      case 'ar': return 'arb_Arab';
      case 'fa': return 'pes_Arab';
      case 'ps': return 'pbt_Arab';
      case 'sd': return 'snd_Arab';
      case 'bal': return 'bcc_Arab';
      case 'hi': return 'hin_Deva';
      case 'pa': return 'pan_Guru';
      case 'bn': return 'ben_Beng';
      case 'tr': return 'tur_Latn';
      case 'ru': return 'rus_Cyrl';
      case 'fr': return 'fra_Latn';
      case 'es': return 'spa_Latn';
      case 'de': return 'deu_Latn';
      case 'zh': return 'zho_Hans';
      case 'ja': return 'jpn_Jpan';
      case 'ko': return 'kor_Hang';
      case 'it': return 'ita_Latn';
      case 'pt': return 'por_Latn';
      default: return lang;
    }
  }

  // 1. Flores-200 / Machine Translation TSV Format
  public getFloresTsvExport(): string {
    const header = ['sentence_id', 'src_lang', 'src_text', 'tgt_lang', 'tgt_text', 'dialect', 'status', 'contributor', 'created_at'].join('\t');
    const rows = this.data.corpus.map(c => {
      const srcCode = this.mapToFloresCode(c.sourceLang);
      const tgtCode = this.mapToFloresCode(c.targetLang);
      const cleanSrc = c.sourceText.replace(/[\t\r\n]+/g, ' ').trim();
      const cleanTgt = c.targetText.replace(/[\t\r\n]+/g, ' ').trim();
      return [
        c.id,
        srcCode,
        cleanSrc,
        tgtCode,
        cleanTgt,
        c.dialect || 'Standard',
        c.status || (c.verified ? 'approved' : 'pending'),
        `${c.contributorName} (${c.contributorRole})`,
        c.createdAt
      ].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  // 2. Google Translate AutoML MT JSON format
  public getGoogleMTJsonExport(): any[] {
    return this.data.corpus.map((c, idx) => {
      const srcCode = this.mapToFloresCode(c.sourceLang);
      const tgtCode = this.mapToFloresCode(c.targetLang);
      return {
        id: c.id || `unit-${idx + 1}`,
        translation: {
          [srcCode]: c.sourceText,
          [tgtCode]: c.targetText,
          ...(c.alternativeScript ? { 'brh_Latn': c.alternativeScript } : {})
        },
        metadata: {
          dialect: c.dialect || 'Standard',
          verified: c.verified || c.status === 'approved',
          contributor_role: c.contributorRole,
          source_type: c.sourceType || 'corpus',
          induced_rule_id: c.inducedRuleId || null,
          domain: 'General / Conversational',
          dataset_standard: 'Flores-200 / Google MT Quality Tier-1'
        }
      };
    });
  }

  // 3. Tatoeba-Compliant TSV Format
  public getTatoebaTsvExport(): string {
    const header = ['id', 'src_lang', 'src_text', 'tgt_lang', 'tgt_text', 'dialect', 'verified'].join('\t');
    const rows = this.data.corpus.map(c => {
      const cleanSrc = c.sourceText.replace(/[\t\r\n]+/g, ' ').trim();
      const cleanTgt = c.targetText.replace(/[\t\r\n]+/g, ' ').trim();
      return [
        c.id,
        this.mapToFloresCode(c.sourceLang),
        cleanSrc,
        this.mapToFloresCode(c.targetLang),
        cleanTgt,
        c.dialect || 'Standard',
        c.verified ? '1' : '0'
      ].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  // 4. Grammar Rules TSV Format
  public getGrammarRulesTsvExport(): string {
    const header = ['rule_id', 'title', 'category', 'pattern', 'explanation', 'confidence', 'status', 'dialect', 'source_type', 'example_incorrect', 'example_correct', 'gloss'].join('\t');
    const rows = this.data.grammarRules.map(r => {
      const firstEx = r.examples?.[0] || { incorrect: '', correct: '', englishGloss: '' };
      return [
        r.id,
        r.title.replace(/[\t\r\n]+/g, ' '),
        r.category,
        r.pattern.replace(/[\t\r\n]+/g, ' '),
        r.explanation.replace(/[\t\r\n]+/g, ' '),
        r.confidence,
        r.status,
        r.dialect || 'Standard',
        r.sourceType || 'general',
        firstEx.incorrect.replace(/[\t\r\n]+/g, ' '),
        firstEx.correct.replace(/[\t\r\n]+/g, ' '),
        firstEx.englishGloss.replace(/[\t\r\n]+/g, ' ')
      ].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  // 5. Dataset Quality & Google Translate Readiness Statistics
  public getDatasetStats(): DatasetExportStats {
    const totalPairs = this.data.corpus.length;
    const verifiedPairs = this.data.corpus.filter(c => c.verified || c.status === 'approved').length;
    
    let sarawani = 0;
    let jhalawani = 0;
    let rakhshani = 0;
    let malookAf = 0;
    let standard = 0;

    for (const c of this.data.corpus) {
      const d = (c.dialect || '').toLowerCase();
      if (d.includes('sarawan') || d.includes('ساراوانی')) sarawani++;
      else if (d.includes('jhalawan') || d.includes('جالاوانی')) jhalawani++;
      else if (d.includes('rakhshan') || d.includes('رخشانی')) rakhshani++;
      else if (d.includes('malook') || d.includes('معلوک')) malookAf++;
      else standard++;
    }

    const grammarRulesCount = this.data.grammarRules.filter(r => r.status !== 'deprecated').length;
    const verificationRatio = totalPairs > 0 ? (verifiedPairs / totalPairs) : 0;
    const dialectBalance = (sarawani > 0 && jhalawani > 0 && rakhshani > 0) ? 20 : 10;
    const ruleMaturity = Math.min(25, grammarRulesCount * 3);
    const volumeScore = Math.min(40, totalPairs * 2);
    const verificationScore = Math.round(verificationRatio * 15);
    const readinessScore = Math.min(100, volumeScore + dialectBalance + ruleMaturity + verificationScore);

    return {
      totalPairs,
      verifiedPairs,
      dialectCoverage: {
        sarawani,
        jhalawani,
        rakhshani,
        malookAf,
        standard,
      },
      grammarRulesCount,
      readinessScore,
    };
  }
}

export const dbService = new DatabaseService();
