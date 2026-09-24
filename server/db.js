import fs from "fs";
import path from "path";
const GOOGLE_TRANSLATE_CATALOG = [
  { code: "ar", label: "Arabic", native: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", dir: "rtl" },
  { code: "fa", label: "Persian", native: "\u0641\u0627\u0631\u0633\u06CC", dir: "rtl" },
  { code: "ps", label: "Pashto", native: "\u067E\u069A\u062A\u0648", dir: "rtl" },
  { code: "sd", label: "Sindhi", native: "\u0633\u0646\u068C\u064A", dir: "rtl" },
  { code: "bal", label: "Balochi", native: "\u0628\u0644\u0648\u0686\u06CC", dir: "rtl" },
  { code: "hi", label: "Hindi", native: "\u0939\u093F\u0928\u094D\u0926\u0940", dir: "ltr" },
  { code: "pa", label: "Punjabi", native: "\u067E\u0646\u062C\u0627\u0628\u06CC / \u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", dir: "rtl" },
  { code: "bn", label: "Bengali", native: "\u09AC\u09BE\u0982\u09B2\u09BE", dir: "ltr" },
  { code: "tr", label: "Turkish", native: "T\xFCrk\xE7e", dir: "ltr" },
  { code: "ru", label: "Russian", native: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", dir: "ltr" },
  { code: "fr", label: "French", native: "Fran\xE7ais", dir: "ltr" },
  { code: "es", label: "Spanish", native: "Espa\xF1ol", dir: "ltr" },
  { code: "de", label: "German", native: "Deutsch", dir: "ltr" },
  { code: "zh", label: "Chinese (Simplified)", native: "\u4E2D\u6587", dir: "ltr" },
  { code: "ja", label: "Japanese", native: "\u65E5\u672C\u8A9E", dir: "ltr" },
  { code: "ko", label: "Korean", native: "\uD55C\uAD6D\uC5B4", dir: "ltr" },
  { code: "it", label: "Italian", native: "Italiano", dir: "ltr" },
  { code: "pt", label: "Portuguese", native: "Portugu\xEAs", dir: "ltr" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", dir: "ltr" },
  { code: "ku", label: "Kurdish", native: "\u06A9\u0648\u0631\u062F\u06CC / Kurd\xEE", dir: "rtl" },
  { code: "uz", label: "Uzbek", native: "O\u02BBzbekcha", dir: "ltr" },
  { code: "tg", label: "Tajik", native: "\u0422\u043E\u04B7\u0438\u043A\u04E3", dir: "ltr" },
  { code: "ta", label: "Tamil", native: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", dir: "ltr" },
  { code: "te", label: "Telugu", native: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", dir: "ltr" },
  { code: "gu", label: "Gujarati", native: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", dir: "ltr" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu", dir: "ltr" },
  { code: "nl", label: "Dutch", native: "Nederlands", dir: "ltr" },
  { code: "sv", label: "Swedish", native: "Svenska", dir: "ltr" },
  { code: "el", label: "Greek", native: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC", dir: "ltr" }
];
const BUNDLED_DATA_DIR = path.resolve(process.cwd(), "data");
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, "brahui_storage.json");
function resolveStoragePaths() {
  const isServerlessOrVercel = Boolean(
    process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV
  );
  if (isServerlessOrVercel) {
    const tmpDir = path.join("/tmp", "brahui_data");
    return {
      activeDir: tmpDir,
      activeFile: path.join(tmpDir, "brahui_storage.json"),
      seedFile: BUNDLED_DB_FILE
    };
  }
  return {
    activeDir: BUNDLED_DATA_DIR,
    activeFile: BUNDLED_DB_FILE,
    seedFile: BUNDLED_DB_FILE
  };
}
const INITIAL_GRAMMAR_RULES = [
  {
    id: "rule-sov-syntax-01",
    title: "Strict SOV (Subject - Object - Verb) Word Order",
    category: "Syntax",
    pattern: "Subject + Indirect/Direct Object + Main Verb + Auxiliary",
    explanation: "Brahui strictly requires verbs to terminate the clause, differing from English (SVO) and retaining northern Dravidian syntax.",
    confidence: 98,
    status: "verified",
    dialect: "Standard",
    examples: [
      {
        incorrect: "I hinot ur\u0101-\u1E6D\xED (SVO)",
        correct: "I ur\u0101-\u1E6D\xED hinot (SOV) / \u0627\u06CC \u0627\u064F\u0631\u0627\u0679\u06CC \u06C1\u0646\u0648\u0679",
        englishGloss: "I went into the house"
      },
      {
        incorrect: "O kun\u0113k ele\u015F",
        correct: "O ele\u015F kun\u0113k / \u0627\u0648 \u0627\u06CC\u0644\u06CC\u0634 \u06A9\u064F\u0646\u06CC\u06A9",
        englishGloss: "He/she eats bread"
      }
    ],
    createdAt: "2026-09-15T08:00:00.000Z",
    verifiedAt: "2026-09-15T08:30:00.000Z",
    verifiedBy: "Brahui Linguistic Board"
  },
  {
    id: "rule-case-genitive-02",
    title: "Genitive / Possessive Suffix (-na / \u0646\u0627)",
    category: "Morphology",
    pattern: "[Noun/Pronoun Stem] + -na",
    explanation: 'Possession is formed by affixing suffix -na directly to the stem. When used with 1st person pronoun "kan" (me), it forms "kan-na" (my/mine).',
    confidence: 99,
    status: "verified",
    dialect: "All",
    examples: [
      {
        incorrect: "I pin Ahmad e",
        correct: "Kan-na pin Ahmad e / \u06A9\u0646\u0627 \u067E\u0650\u0646 \u0627\u062D\u0645\u062F \u0621\u0650",
        englishGloss: "My name is Ahmad"
      },
      {
        incorrect: "Da ur\u0101 n\u012B",
        correct: "Da n\u0101 ur\u0101 e / \u062F\u0627 \u0646\u0627 \u0627\u064F\u0631\u0627 \u0621\u0650",
        englishGloss: "This is your house"
      }
    ],
    createdAt: "2026-09-15T09:00:00.000Z",
    verifiedAt: "2026-09-15T09:15:00.000Z",
    verifiedBy: "Brahui Linguistic Board"
  },
  {
    id: "rule-case-dative-03",
    title: "Dative/Purposive Case Suffix (-ki / \u06A9\u06CC) and Accusative (-e / \u06D2)",
    category: "Morphology",
    pattern: "[Noun/Pronoun] + -ki (for), [Noun/Pronoun] + -e (to/accusative)",
    explanation: 'Direct object receives -e when definite, while beneficiary/purpose receives -ki ("for the sake of / to").',
    confidence: 96,
    status: "verified",
    dialect: "Standard",
    examples: [
      {
        incorrect: "D\u0101 kit\u0101b d\u0113 kan",
        correct: "D\u0101 kit\u0101b-e kan-ki \u0113te / \u062F\u0627 \u06A9\u062A\u0627\u0628 \u0621\u0650 \u06A9\u0646\u06A9\u06CC \u0627\u06CC\u062A\u0631",
        englishGloss: "Give this book for me"
      },
      {
        incorrect: "O khane kan",
        correct: "O kan-e khant / \u0627\u0648 \u06A9\u0646\u06D2 \u062E\u0646\u062A",
        englishGloss: "He saw me"
      }
    ],
    createdAt: "2026-09-16T10:00:00.000Z",
    verifiedAt: "2026-09-16T11:00:00.000Z",
    verifiedBy: "Linguist Admin"
  },
  {
    id: "rule-ablative-case-04",
    title: "Ablative Postposition Suffix (-\u0101n / \u0622\u0646)",
    category: "Morphology",
    pattern: "[Origin Noun] + -\u0101n",
    explanation: "Movement away or origin is denoted by suffix -\u0101n attached to location or person stems.",
    confidence: 95,
    status: "verified",
    dialect: "Standard",
    examples: [
      {
        incorrect: "I bass shahr min",
        correct: "I shahr-\u0101n bassu\u0163 / \u0627\u06CC \u0634\u0627\u06C1\u0631 \u0622\u0646 \u0628\u0633\u0679",
        englishGloss: "I came from the city"
      }
    ],
    createdAt: "2026-09-16T14:20:00.000Z",
    verifiedAt: "2026-09-16T15:00:00.000Z",
    verifiedBy: "Linguist Admin"
  },
  {
    id: "rule-lateral-fricative-05",
    title: "Voiceless Lateral Fricative Orthography (\u076A / lh)",
    category: "Orthography",
    pattern: "Perso-Arabic [\u076A] <-> Roman Latin [lh]",
    explanation: 'Brahui features the distinctive voiceless lateral fricative /\u026C/ preserved from Proto-Dravidian. In Perso-Arabic it is written as \u076A (lam with small v above) and in Latin Roman as "lh". Never substitute standard l or kh.',
    confidence: 97,
    status: "verified",
    dialect: "All",
    examples: [
      {
        incorrect: "balkul / balikh",
        correct: "ba\u076A / ba-lh (feather / wing)",
        englishGloss: "Wing or feather"
      },
      {
        incorrect: "mil / milk",
        correct: "mi\u076A / mi-lh (ewe / sheep)",
        englishGloss: "Sheep / ewe"
      }
    ],
    createdAt: "2026-09-17T02:00:00.000Z",
    verifiedAt: "2026-09-17T03:00:00.000Z",
    verifiedBy: "Orthography Committee"
  }
];
const INITIAL_CORPUS = [
  {
    id: "corp-welcome-sarawani",
    sourceText: "Welcome to Brahui translator",
    sourceLang: "english",
    targetText: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u0628\u062E\u06CC\u0631 \u0628\u0633\u0633",
    targetLang: "brahui-arabic",
    alternativeScript: "Br\u0101h\u016B\u012B mutarjim-\u1E6D\u012B bakhair basus",
    dialect: "Sarawani",
    contextNotes: "Welcoming greeting in Northern / Kalat Sarawani dialect",
    contributorName: "Brahui Linguistic Academy",
    contributorRole: "Linguist",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-15T08:00:00.000Z"
  },
  {
    id: "corp-welcome-jhalawani",
    sourceText: "Welcome to Brahui translator",
    sourceLang: "english",
    targetText: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u062E\u06CC\u0631 \u0627\u062A \u0628\u0633\u0633",
    targetLang: "brahui-arabic",
    alternativeScript: "Br\u0101h\u016B\u012B mutarjim-\u1E6D\u012B khair at basus",
    dialect: "Jhalawani",
    contextNotes: "Welcoming greeting in Southern / Khuzdar Jhalawani dialect",
    contributorName: "Mir Gul Khan",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-15T08:05:00.000Z"
  },
  {
    id: "corp-welcome-rakhshani",
    sourceText: "Welcome to Brahui translator",
    sourceLang: "english",
    targetText: "\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC \u0645\u062A\u0631\u062C\u0645 \u0679\u06CC \u0648\u0634 \u0627\u062A\u06A9\u0626\u06D2",
    targetLang: "brahui-arabic",
    alternativeScript: "Br\u0101h\u016B\u012B mutarjim-\u1E6D\u012B wash atk\u0113",
    dialect: "Rakhshani",
    contextNotes: "Welcoming greeting in Western / Chagai & Nushki Rakhshani dialect",
    contributorName: "Chagai Cultural Circle",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-15T08:10:00.000Z"
  },
  {
    id: "corp-001-sarawani",
    sourceText: "How are you?",
    sourceLang: "english",
    targetText: "\u0646\u06CC \u062C\u0648\u0691 \u0627\u064F\u0633\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "N\u012B jor us?",
    dialect: "Sarawani",
    contextNotes: "Common everyday greeting in Sarawani dialect",
    contributorName: "Dr. Abdul Rehman Brahui",
    contributorRole: "Linguist",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-15T09:00:00.000Z"
  },
  {
    id: "corp-001-jhalawani",
    sourceText: "How are you?",
    sourceLang: "english",
    targetText: "\u0646\u06CC \u062F\u0631\u0627\u062E \u0627\u064F\u0633\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "N\u012B dr\u0101kh us?",
    dialect: "Jhalawani",
    contextNotes: "Common everyday inquiry in Jhalawani dialect",
    contributorName: "Abdul Qayyum",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-15T09:05:00.000Z"
  },
  {
    id: "corp-001-rakhshani",
    sourceText: "How are you?",
    sourceLang: "english",
    targetText: "\u0634\u0645\u0627 \u0686\u062A\u0648\u0646 \u0627\u062A\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "Shum\u0101 chit\u014Dn at?",
    dialect: "Rakhshani",
    contextNotes: "Common inquiry in Rakhshani dialect",
    contributorName: "Naseer Mengal",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-15T09:10:00.000Z"
  },
  {
    id: "corp-002",
    sourceText: "I am fine, thank you.",
    sourceLang: "english",
    targetText: "\u0627\u06CC \u062C\u0648\u0691 \u0627\u064F\u0679\u060C \u0645\u0646\u062A\u0648\u0627\u0631\u06D4",
    targetLang: "brahui-arabic",
    alternativeScript: "I jor u\u0163, minatw\u0101r.",
    dialect: "Standard",
    contextNotes: "Polite response to inquiry about well-being",
    contributorName: "Gul Khan",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-15T09:30:00.000Z"
  },
  {
    id: "corp-003-sarawani",
    sourceText: "What is your name?",
    sourceLang: "english",
    targetText: "\u0646\u0627 \u067E\u0650\u0646 \u0627\u0646\u062A \u0621\u0650\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "N\u0101 pin ant e?",
    dialect: "Sarawani",
    contextNotes: "Asking someone's name politely in Sarawani dialect",
    contributorName: "Fatima Mengal",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-16T11:20:00.000Z"
  },
  {
    id: "corp-003-jhalawani",
    sourceText: "What is your name?",
    sourceLang: "english",
    targetText: "\u0646\u0627 \u067E\u0650\u0646 \u062F\u06CC\u0631 \u0621\u0650\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "N\u0101 pin d\u012Br e?",
    dialect: "Jhalawani",
    contextNotes: "Asking someone's name in Jhalawani dialect",
    contributorName: "Sardar Zehri",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-16T11:25:00.000Z"
  },
  {
    id: "corp-003-rakhshani",
    sourceText: "What is your name?",
    sourceLang: "english",
    targetText: "\u062A\u0626\u06CC \u0646\u0627\u0645 \u0686\u06D2 \u0627\u0646\u062A\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "Ta\u012B n\u0101m ch\u0113 ant?",
    dialect: "Rakhshani",
    contextNotes: "Asking someone's name in Rakhshani dialect",
    contributorName: "Rashid Chagai",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-16T11:30:00.000Z"
  },
  {
    id: "corp-urdu-name-sarawani",
    sourceText: "\u0622\u067E \u06A9\u0627 \u0646\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u06D2\u061F",
    sourceLang: "urdu",
    targetText: "\u0646\u0627 \u067E\u0650\u0646 \u0627\u0646\u062A \u0621\u0650\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "N\u0101 pin ant e?",
    dialect: "Sarawani",
    contextNotes: "Urdu to Brahui name query (Sarawani)",
    contributorName: "Fatima Mengal",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-16T11:20:00.000Z"
  },
  {
    id: "corp-urdu-name-jhalawani",
    sourceText: "\u0622\u067E \u06A9\u0627 \u0646\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u06D2\u061F",
    sourceLang: "urdu",
    targetText: "\u0646\u0627 \u067E\u0650\u0646 \u062F\u06CC\u0631 \u0621\u0650\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "N\u0101 pin d\u012Br e?",
    dialect: "Jhalawani",
    contextNotes: "Urdu to Brahui name query (Jhalawani)",
    contributorName: "Sardar Zehri",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-16T11:25:00.000Z"
  },
  {
    id: "corp-urdu-name-rakhshani",
    sourceText: "\u0622\u067E \u06A9\u0627 \u0646\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u06D2\u061F",
    sourceLang: "urdu",
    targetText: "\u062A\u0626\u06CC \u0646\u0627\u0645 \u0686\u06D2 \u0627\u0646\u062A\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "Ta\u012B n\u0101m ch\u0113 ant?",
    dialect: "Rakhshani",
    contextNotes: "Urdu to Brahui name query (Rakhshani)",
    contributorName: "Rashid Chagai",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-16T11:30:00.000Z"
  },
  {
    id: "corp-004",
    sourceText: "\u0645\u06CC\u0631\u0627 \u0646\u0627\u0645 \u0627\u062D\u0645\u062F \u06C1\u06D2 \u0627\u0648\u0631 \u0645\u06CC\u06BA \u06A9\u0648\u0626\u0679\u06C1 \u0645\u06CC\u06BA \u0631\u06C1\u062A\u0627 \u06C1\u0648\u06BA\u06D4",
    sourceLang: "urdu",
    targetText: "\u06A9\u0646\u0627 \u067E\u0650\u0646 \u0627\u062D\u0645\u062F \u0621\u0650 \u0627\u0648 \u0627\u06CC \u06A9\u0648\u0626\u0679\u06C1 \u0679\u06CC \u0631\u06C1\u0646\u06AF\u0648\u06C1\u06D4",
    targetLang: "brahui-arabic",
    alternativeScript: "Kan-na pin Ahmad e o i Quetta-\u1E6D\xED rahengova.",
    dialect: "Standard",
    contextNotes: "Self introduction with locative suffix -\u1E6D\xED",
    contributorName: "Ahmad Zehri",
    contributorRole: "Native Speaker",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-16T15:40:00.000Z"
  },
  {
    id: "corp-005",
    sourceText: "Where is the hospital?",
    sourceLang: "english",
    targetText: "\u06C1\u0633\u067E\u062A\u0627\u0644 \u0627\u0631\u0627\u0691\u06D2 \u0621\u0650\u061F",
    targetLang: "brahui-arabic",
    alternativeScript: "Haspit\u0101l ar\u0101\u1E5Be e?",
    dialect: "Standard",
    contextNotes: "Inquiry for directions",
    contributorName: "Admin",
    contributorRole: "Admin",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-17T08:10:00.000Z"
  },
  {
    id: "corp-006",
    sourceText: "\u06C1\u0645\u06CC\u06BA \u067E\u0627\u0646\u06CC \u0686\u0627\u06C1\u06CC\u06D2",
    sourceLang: "urdu",
    targetText: "\u0646\u0646\u06D2 \u062F\u06CC\u0631 \u067E\u06A9\u0627\u0631 \u0621\u0650\u06D4",
    targetLang: "brahui-arabic",
    alternativeScript: "Nan-e d\u012Br pak\u0101r e.",
    dialect: "Standard",
    contextNotes: "First person plural dative construction",
    contributorName: "Zainab Raisani",
    contributorRole: "Linguist",
    verified: true,
    status: "approved",
    sourceType: "initial_seed",
    createdAt: "2026-09-17T09:15:00.000Z"
  }
];
const INITIAL_DOCUMENTS = [
  {
    id: "doc-bray-grammar-1909",
    filename: "Denys_Bray_The_Brahui_Language_Grammar_Pt1.pdf",
    title: "The Brahui Language: Vol I - Analytic Grammar (Denys Bray)",
    fileSize: 4194304,
    uploadedAt: "2026-09-14T10:00:00.000Z",
    type: "grammar",
    pageCount: 320,
    chunksCount: 18,
    sampleSummary: "Authoritative foundational treatise analyzing Brahui Dravidian roots, morphology, postpositional system, complex verbal affixes, reflexive pronouns, and comparative syntax with Dravidian languages.",
    chunks: [
      "Brahui Grammar Part I: Noun Declension. Nominative case has no suffix. Genitive affix is -na. Dative suffix is -e. Locative affixes are -\u0101\u012B (upon) and -\u1E6D\u012B (in, inside). Ablative is -\u0101n (from). Associative suffix is -to (with). Purposive suffix is -ki (for).",
      "Verbal Conjugation: Present-Future tense suffixes for Person: 1st Sing: -va/ -u\u0163; 2nd Sing: -sa / -us; 3rd Sing: -ik / -e; 1st Plur: -ona / -un; 2nd Plur: -ere / -ure; 3rd Plur: -ira / -o.",
      "Negative conjugation: Formed by infusing -pa- or -fa- infix between the root and verbal inflectional termination. Example: karing (to do) -> kappara (I do not do), kun\u0113k (he eats) -> kumpak (he does not eat)."
    ]
  },
  {
    id: "doc-brahui-core-dictionary",
    filename: "Brahui_Academy_Lexicon_Eng_Urdu.pdf",
    title: "Brahui Academy Comprehensive Lexicon & Terminology",
    fileSize: 6291456,
    uploadedAt: "2026-09-15T12:00:00.000Z",
    type: "dictionary",
    pageCount: 450,
    chunksCount: 25,
    sampleSummary: "Over 8,000 core Brahui terms catalogued across Perso-Arabic and Roman scripts with English and Urdu definitions, etymology, and dialectical variations between Sarawani and Jhalawani.",
    chunks: [
      "Dictionary Extract A-B: Ur\u0101 (noun) = House / Home (\u0627\u0631\u062F\u0648: \u06AF\u06BE\u0631). D\u012Br (noun) = Water (\u0627\u0631\u062F\u0648: \u067E\u0627\u0646\u06CC). Elesh / K\u016Bl (noun) = Bread / Food (\u0627\u0631\u062F\u0648: \u0631\u0648\u0679\u06CC / \u06A9\u06BE\u0627\u0646\u0627). Huch (noun) = Camel (\u0627\u0631\u062F\u0648: \u0627\u0648\u0646\u0679). P\u012Br (noun) = Rain (\u0627\u0631\u062F\u0648: \u0628\u0627\u0631\u0634). Kh\u0101n (noun) = Eye (\u0627\u0631\u062F\u0648: \u0622\u0646\u06A9\u06BE).",
      "Dictionary Extract M-P: Minatw\u0101r (adj) = Grateful / Thankful (\u0627\u0631\u062F\u0648: \u0634\u06A9\u0631\u06AF\u0632\u0627\u0631). Mehrb\u0101ni (noun) = Kindness. Pin (noun) = Name (\u0627\u0631\u062F\u0648: \u0646\u0627\u0645). B\u0101 (noun) = Mouth (\u0627\u0631\u062F\u0648: \u0645\u0646\u06C1). Kholum (noun) = Wheat (\u0627\u0631\u062F\u0648: \u06AF\u0646\u062F\u0645)."
    ]
  }
];
class DatabaseService {
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
  init() {
    try {
      if (!fs.existsSync(this.activeDir)) {
        fs.mkdirSync(this.activeDir, { recursive: true });
      }
      if (fs.existsSync(this.activeFile)) {
        const fileContent = fs.readFileSync(this.activeFile, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (parsed.grammarRules && parsed.corpus) {
          this.data = parsed;
          this.seedMissingCorpus();
          return;
        }
      }
      if (this.activeFile !== this.seedFile && fs.existsSync(this.seedFile)) {
        const fileContent = fs.readFileSync(this.seedFile, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (parsed.grammarRules && parsed.corpus) {
          this.data = parsed;
          this.seedMissingCorpus();
          this.persist();
          return;
        }
      }
      this.seedMissingCorpus();
      this.persist();
    } catch (err) {
      console.error("Error initializing database file, falling back to memory state:", err);
    }
  }
  seedMissingCorpus() {
    let changed = false;
    for (const initEntry of INITIAL_CORPUS) {
      const exists = this.data.corpus.some(
        (c) => c.sourceText.trim().toLowerCase() === initEntry.sourceText.trim().toLowerCase() && c.dialect === initEntry.dialect && c.sourceLang === initEntry.sourceLang
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
  persist() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    try {
      if (!fs.existsSync(this.activeDir)) {
        fs.mkdirSync(this.activeDir, { recursive: true });
      }
      fs.writeFileSync(this.activeFile, jsonStr, "utf-8");
    } catch (err) {
      console.warn(`Primary write failed to ${this.activeFile} (${err?.message}). Attempting /tmp fallback...`);
      try {
        const tmpDir = path.join("/tmp", "brahui_data");
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        this.activeDir = tmpDir;
        this.activeFile = path.join(tmpDir, "brahui_storage.json");
        fs.writeFileSync(this.activeFile, jsonStr, "utf-8");
        console.log(`Persisted database state successfully to ${this.activeFile}`);
      } catch (tmpErr) {
        console.error("Failed to write database file to fallback /tmp:", tmpErr);
      }
    }
    if (this.activeFile !== BUNDLED_DB_FILE && fs.existsSync(BUNDLED_DATA_DIR)) {
      try {
        fs.writeFileSync(BUNDLED_DB_FILE, jsonStr, "utf-8");
      } catch {
      }
    }
  }
  /**
   * Syncs user-submitted corrections and learned rules from client-side localStorage.
   * Guarantees that rules and corrections are never lost between deployments, cold starts, or previews.
   */
  syncLearnedData(clientRules = [], clientCorpus = []) {
    let addedRules = 0;
    let addedCorpus = 0;
    for (const rule of clientRules) {
      if (!rule || !rule.title) continue;
      const exists = this.data.grammarRules.some(
        (r) => r.id === rule.id || r.title === rule.title && r.pattern === rule.pattern
      );
      if (!exists) {
        this.data.grammarRules.unshift({
          ...rule,
          status: rule.status || "verified"
        });
        addedRules++;
      }
    }
    for (const entry of clientCorpus) {
      if (!entry || !entry.sourceText || !entry.targetText) continue;
      const exists = this.data.corpus.some(
        (c) => c.id === entry.id || c.sourceText.trim().toLowerCase() === entry.sourceText.trim().toLowerCase() && c.sourceLang === entry.sourceLang && c.targetLang === entry.targetLang && c.targetText.trim() === entry.targetText.trim()
      );
      if (!exists) {
        this.data.corpus.unshift({
          ...entry,
          verified: true,
          status: "approved"
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
  getAdminCredentials() {
    if (this.data.adminCredentials && this.data.adminCredentials.username && this.data.adminCredentials.password) {
      return {
        username: this.data.adminCredentials.username,
        password: this.data.adminCredentials.password
      };
    }
    return {
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "admin123"
    };
  }
  updateAdminCredentials(newUsername, newPassword) {
    this.data.adminCredentials = {
      username: newUsername.trim(),
      password: newPassword,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.persist();
    return {
      success: true,
      username: newUsername.trim()
    };
  }
  // --- Grammar Rules ---
  getGrammarRules() {
    return this.data.grammarRules;
  }
  addGrammarRule(rule) {
    const newRule = {
      ...rule,
      id: `rule-induced-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.grammarRules.unshift(newRule);
    this.persist();
    return newRule;
  }
  updateRuleStatus(id, status, verifiedBy) {
    const rule = this.data.grammarRules.find((r) => r.id === id);
    if (!rule) return null;
    rule.status = status;
    if (status === "verified") {
      rule.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      rule.verifiedBy = verifiedBy || "Admin Reviewer";
    }
    this.persist();
    return rule;
  }
  getPendingRules() {
    return this.data.grammarRules.filter((r) => r.status === "pending");
  }
  getActiveRules() {
    return this.data.grammarRules.filter((r) => r.status === "active" || r.status === "verified");
  }
  approveRule(id, verifiedBy) {
    const rule = this.data.grammarRules.find((r) => r.id === id);
    if (!rule) return null;
    rule.status = "verified";
    rule.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
    rule.verifiedBy = verifiedBy || "Admin Reviewer";
    const linked = this.data.corpus.find(
      (c) => c.inducedRuleId === rule.id || rule.inducedFrom && c.sourceText === rule.inducedFrom.sourceText
    );
    if (linked) {
      linked.verified = true;
      linked.status = "approved";
    }
    this.persist();
    return rule;
  }
  rejectRule(id) {
    const rule = this.data.grammarRules.find((r) => r.id === id);
    if (!rule) return null;
    rule.status = "deprecated";
    this.persist();
    return rule;
  }
  approveCorpusEntry(id) {
    const entry = this.data.corpus.find((c) => c.id === id);
    if (!entry) return null;
    entry.verified = true;
    entry.status = "approved";
    this.persist();
    return entry;
  }
  rejectCorpusEntry(id) {
    const entry = this.data.corpus.find((c) => c.id === id);
    if (!entry) return null;
    entry.verified = false;
    entry.status = "rejected";
    this.persist();
    return entry;
  }
  getReviewQueue() {
    const pendingRules = this.data.grammarRules.filter((r) => r.status === "pending");
    const pendingCorpus = this.data.corpus.filter((c) => !c.verified || c.status === "pending");
    return {
      pendingRules,
      pendingCorpus,
      counts: {
        rules: pendingRules.length,
        corpus: pendingCorpus.length,
        total: pendingRules.length + pendingCorpus.length
      }
    };
  }
  // --- Corpus Entries ---
  getCorpus() {
    return this.data.corpus;
  }
  addCorpusEntry(entry) {
    const newEntry = {
      ...entry,
      id: `corp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.corpus.unshift(newEntry);
    this.persist();
    return newEntry;
  }
  // --- Knowledge Documents ---
  getKnowledgeDocs() {
    return this.data.knowledgeDocuments;
  }
  addKnowledgeDoc(doc) {
    const newDoc = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.knowledgeDocuments.unshift(newDoc);
    this.persist();
    return newDoc;
  }
  deleteKnowledgeDoc(id) {
    const initialLen = this.data.knowledgeDocuments.length;
    this.data.knowledgeDocuments = this.data.knowledgeDocuments.filter((d) => d.id !== id);
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
  extractAndIngestRulesFromDoc(doc) {
    const fullText = doc.chunks && doc.chunks.length > 0 ? doc.chunks.join("\n\n") : doc.sampleSummary;
    const addedRuleTitles = [];
    let vocabAdded = 0;
    const grammarPatterns = [
      {
        keyword: "Genitive",
        test: /genitive|possessive|-na\b|مضاف|اضافت/i,
        title: `Genitive Case Inflection (-n\u0101 / \u0646\u0627) [From: ${doc.title.slice(0, 30)}]`,
        category: "Morphology",
        pattern: "[Noun/Pronoun Stem] + -n\u0101 (\u0646\u0627)",
        explanation: "The genitive case in Brahui expresses possession or attribution with suffix -n\u0101, attested in reference grammar.",
        incorrect: "I ur\u0101 (my house)",
        correct: "Kan-n\u0101 ur\u0101 / \u06A9\u0646\u0627 \u0627\u064F\u0631\u0627",
        gloss: "My house (possessive stem + -na)"
      },
      {
        keyword: "Locative",
        test: /locative|-ṭī|-āī|in, inside|upon|اندر|مقام/i,
        title: `Locative Postposition Suffix (-\u1E6D\u012B / \u0679\u06CC & -\u0101\u012B) [From: ${doc.title.slice(0, 30)}]`,
        category: "Syntax",
        pattern: "[Location Noun] + -\u1E6D\u012B (inside) / -\u0101\u012B (upon)",
        explanation: "Brahui marks internal and surface location through postpositional suffixes attached directly to nominal stems.",
        incorrect: "I Quetta hinot",
        correct: "I Quetta-\u1E6D\u012B hinot / \u0627\u06CC \u06A9\u0648\u0626\u0679\u06C1 \u0679\u06CC \u06C1\u0646\u0648\u0679",
        gloss: "I went into Quetta (locative marker -\u1E6D\u012B)"
      },
      {
        keyword: "Dative",
        test: /dative|purposive|-ki\b|-e\b|مفعول|کے لیے/i,
        title: `Dative & Purposive Postposition (-ki / \u06A9\u06CC) [From: ${doc.title.slice(0, 30)}]`,
        category: "Morphology",
        pattern: "[Indirect Object / Beneficiary] + -ki (for)",
        explanation: "Benefactive and purposive relations in Brahui require the postposition -ki placed after the nominal stem.",
        incorrect: "D\u0101 kit\u0101b d\u0113 kan",
        correct: "D\u0101 kit\u0101b-e kan-ki \u0113te / \u062F\u0627 \u06A9\u062A\u0627\u0628 \u0621\u0650 \u06A9\u0646\u06A9\u06CC \u0627\u06CC\u062A\u0631",
        gloss: "Give this book for me (purposive -ki)"
      },
      {
        keyword: "Ablative",
        test: /ablative|-ān\b|from\b|سے|نکالنا/i,
        title: `Ablative Origin Postposition (-\u0101n / \u0622\u0646) [From: ${doc.title.slice(0, 30)}]`,
        category: "Morphology",
        pattern: "[Origin / Source Noun] + -\u0101n (from)",
        explanation: "Brahui denotes spatial or temporal origin using the ablative suffix -\u0101n.",
        incorrect: "I shahr bassu\u0163",
        correct: "I shahr-\u0101n bassu\u0163 / \u0627\u06CC \u0634\u0627\u06C1\u0631 \u0622\u0646 \u0628\u0633\u0679",
        gloss: "I came from the city (ablative origin)"
      },
      {
        keyword: "SOV Syntax",
        test: /sov|word order|verb final|clause|فاعل مفعول فعل/i,
        title: `Strict Clause-Final Verb Word Order (SOV) [From: ${doc.title.slice(0, 30)}]`,
        category: "Syntax",
        pattern: "Subject + Object/Complement + Final Verb",
        explanation: "Syntactic parsing requires main verb and copula auxiliaries to terminate the clause.",
        incorrect: "O kun\u0113k ele\u015F (SVO)",
        correct: "O ele\u015F kun\u0113k / \u0627\u0648 \u0627\u06CC\u0644\u06CC\u0634 \u06A9\u064F\u0646\u06CC\u06A9 (SOV)",
        gloss: "He/she bread eats"
      },
      {
        keyword: "Lateral Fricative",
        test: /lateral|fricative|ݪ|lh\b|voiceless/i,
        title: `Voiceless Lateral Fricative Orthography (\u076A / lh) [From: ${doc.title.slice(0, 30)}]`,
        category: "Orthography",
        pattern: "Perso-Arabic [\u076A] <-> Roman [lh]",
        explanation: "Distinguishes the archaic Proto-Dravidian lateral fricative /\u026C/ preserved in Brahui.",
        incorrect: "bal / balkh",
        correct: "ba\u076A / ba-lh (feather / wing)",
        gloss: "Wing or feather"
      },
      {
        keyword: "Negative Conjugation",
        test: /negative|-pa-|-fa-|منفی|نفی/i,
        title: `Negative Conjugational Infixes (-pa- / -fa-) [From: ${doc.title.slice(0, 30)}]`,
        category: "Morphology",
        pattern: "[Verb Root] + -pa-/-fa- + [Tense Suffix]",
        explanation: "Negation is inflected synthetically inside the verb morphology via infixes rather than separate negative particles.",
        incorrect: "I na karing",
        correct: "I kappara / \u0627\u06CC \u06A9\u067E\u0651\u0631\u06C1 (I do not do)",
        gloss: "Synthetic verbal negation"
      }
    ];
    for (const pat of grammarPatterns) {
      if (pat.test.test(fullText)) {
        const exists = this.data.grammarRules.some(
          (r) => r.title.toLowerCase().includes(pat.keyword.toLowerCase())
        );
        if (!exists) {
          const newRule = this.addGrammarRule({
            title: pat.title,
            category: pat.category,
            pattern: pat.pattern,
            explanation: `${pat.explanation} Extracted and proposed automatically from uploaded reference: "${doc.title}". Awaiting admin approval.`,
            confidence: 97,
            status: "pending",
            sourceType: "pdf_extraction",
            sourceDocId: doc.id,
            sourceDocTitle: doc.title,
            dialect: "Standard",
            examples: [
              {
                incorrect: pat.incorrect,
                correct: pat.correct,
                englishGloss: pat.gloss
              }
            ],
            inducedFrom: {
              sourceText: `Extracted from knowledge base document: ${doc.title}`,
              initialTranslation: pat.incorrect,
              correctedTranslation: pat.correct,
              sourceLang: "english",
              targetLang: "brahui-arabic"
            }
          });
          addedRuleTitles.push(newRule.title);
        }
      }
    }
    const vocabRegex = /([A-Za-zāīūēōḍṭṛṣẓñ’'\u0600-\u06FF]+(?:\s+[A-Za-zāīūēōḍṭṛṣẓñ’'\u0600-\u06FF]+)?)\s*(?:\([^)]*\))?\s*=\s*([^(\n\r,;.]+)(?:\((?:اردو:\s*)?([^)]+)\))?/g;
    let match;
    let count = 0;
    while ((match = vocabRegex.exec(fullText)) !== null && count < 25) {
      const termRaw = match[1]?.trim();
      const engDef = match[2]?.trim();
      const urduDef = match[3]?.trim();
      if (termRaw && engDef && termRaw.length > 1 && engDef.length > 1) {
        const isPersoArabic = /[\u0600-\u06FF]/.test(termRaw);
        const corpusSource = engDef;
        const corpusTarget = isPersoArabic ? termRaw : urduDef || termRaw;
        const altScript = isPersoArabic ? urduDef || "" : termRaw;
        const alreadyInCorpus = this.data.corpus.some(
          (c) => c.sourceText.toLowerCase() === corpusSource.toLowerCase()
        );
        if (!alreadyInCorpus) {
          this.addCorpusEntry({
            sourceText: corpusSource,
            sourceLang: "english",
            targetText: corpusTarget,
            targetLang: "brahui-arabic",
            alternativeScript: altScript,
            dialect: "Standard",
            contextNotes: `Extracted from knowledge base: ${doc.title}`,
            contributorName: `PDF Lexicon (${doc.title.slice(0, 20)})`,
            contributorRole: "Linguist",
            verified: false,
            status: "pending",
            sourceType: "pdf_extraction"
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
      ruleTitles: addedRuleTitles
    };
  }
  // --- Translation Logs ---
  logTranslation(log) {
    this.data.translationLogs.unshift({
      id: `log-${Date.now()}`,
      ...log,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (this.data.translationLogs.length > 200) {
      this.data.translationLogs = this.data.translationLogs.slice(0, 200);
    }
    this.persist();
  }
  // --- Daily Report Generator ---
  getDailyReport(targetDateStr) {
    const today = targetDateStr || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const newRules = this.data.grammarRules.filter((r) => r.createdAt.startsWith(today));
    const newCorpusEntries = this.data.corpus.filter((c) => c.createdAt.startsWith(today));
    const translationsToday = this.data.translationLogs.filter((t) => t.createdAt.startsWith(today)).length;
    const categoryBreakdown = {};
    for (const rule of this.data.grammarRules) {
      categoryBreakdown[rule.category] = (categoryBreakdown[rule.category] || 0) + 1;
    }
    return {
      date: today,
      totalTranslationsToday: translationsToday,
      rulesLearnedToday: newRules.length,
      correctionsIngestedToday: newCorpusEntries.length,
      totalActiveRules: this.data.grammarRules.filter((r) => r.status !== "deprecated").length,
      totalCorpusEntries: this.data.corpus.length,
      totalKnowledgeDocs: this.data.knowledgeDocuments.length,
      newRules,
      newCorpusEntries,
      categoryBreakdown
    };
  }
  // --- Complete Export Format (Google Translate / Fine-tuning compatible) ---
  getCompleteCorpusExport() {
    return {
      schemaVersion: "2.0.0",
      exportPurpose: "Google Translate Community Corpus Contribution & Multi-lingual LLM Fine-tuning",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sourceProject: "Brahui AI Translation & Active Self-Learning System",
      languages: {
        brahuiArabic: { code: "brh-Arab", name: "Brahui (Perso-Arabic script)", script: "Arabic" },
        brahuiRoman: { code: "brh-Latn", name: "Brahui (Brolikwar Roman script)", script: "Roman" },
        urdu: { code: "ur", name: "Urdu", script: "Arabic-Nastaliq" },
        english: { code: "en", name: "English", script: "Latin" }
      },
      stats: {
        totalCorpusPairs: this.data.corpus.length,
        totalGrammarRules: this.data.grammarRules.length,
        totalKnowledgeDocuments: this.data.knowledgeDocuments.length
      },
      grammar_rules: this.data.grammarRules.map((r) => ({
        rule_id: r.id,
        rule_name: r.title,
        category: r.category,
        pattern_expression: r.pattern,
        linguistic_explanation: r.explanation,
        confidence_score: r.confidence,
        verification_status: r.status,
        dialect: r.dialect || "Standard",
        examples: r.examples,
        induced_from: r.inducedFrom || null,
        created_at: r.createdAt
      })),
      parallel_corpus: this.data.corpus.map((c) => ({
        entry_id: c.id,
        source_language: c.sourceLang,
        source_text: c.sourceText,
        target_language: c.targetLang,
        target_text: c.targetText,
        alternative_script_transliteration: c.alternativeScript || "",
        dialect_tag: c.dialect || "Standard",
        contextual_notes: c.contextNotes || "",
        contributor: {
          name: c.contributorName,
          role: c.contributorRole
        },
        verified_by_linguist: c.verified,
        created_at: c.createdAt,
        associated_induced_rule_id: c.inducedRuleId || null
      })),
      knowledge_documents_index: this.data.knowledgeDocuments.map((d) => ({
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
  getSystemSettings() {
    if (!this.data.systemSettings) {
      this.data.systemSettings = {
        allowDynamicLanguages: true,
        activeDynamicLanguages: [
          { code: "ar", label: "Arabic", native: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", dir: "rtl" },
          { code: "fa", label: "Persian", native: "\u0641\u0627\u0631\u0633\u06CC", dir: "rtl" },
          { code: "ps", label: "Pashto", native: "\u067E\u069A\u062A\u0648", dir: "rtl" },
          { code: "bal", label: "Balochi", native: "\u0628\u0644\u0648\u0686\u06CC", dir: "rtl" },
          { code: "sd", label: "Sindhi", native: "\u0633\u0646\u068C\u064A", dir: "rtl" }
        ]
      };
      this.persist();
    }
    return this.data.systemSettings;
  }
  updateSystemSettings(partial) {
    const settings = this.getSystemSettings();
    if (typeof partial.allowDynamicLanguages === "boolean") {
      settings.allowDynamicLanguages = partial.allowDynamicLanguages;
    }
    this.data.systemSettings = settings;
    this.persist();
    return settings;
  }
  addDynamicLanguage(lang) {
    const settings = this.getSystemSettings();
    const exists = settings.activeDynamicLanguages.some((l) => l.code === lang.code);
    if (!exists) {
      settings.activeDynamicLanguages.push(lang);
      this.persist();
    }
    return { success: true, languages: settings.activeDynamicLanguages };
  }
  removeDynamicLanguage(code) {
    const settings = this.getSystemSettings();
    settings.activeDynamicLanguages = settings.activeDynamicLanguages.filter((l) => l.code !== code);
    this.persist();
    return { success: true, languages: settings.activeDynamicLanguages };
  }
  // --- Dataset Quality & Google Translate Readiness Exports ---
  mapToFloresCode(lang) {
    switch (lang) {
      case "brahui-arabic":
        return "brh_Arab";
      case "brahui-latin":
      case "brahui-roman":
        return "brh_Latn";
      case "urdu":
        return "urd_Arab";
      case "english":
        return "eng_Latn";
      case "ar":
        return "arb_Arab";
      case "fa":
        return "pes_Arab";
      case "ps":
        return "pbt_Arab";
      case "sd":
        return "snd_Arab";
      case "bal":
        return "bcc_Arab";
      case "hi":
        return "hin_Deva";
      case "pa":
        return "pan_Guru";
      case "bn":
        return "ben_Beng";
      case "tr":
        return "tur_Latn";
      case "ru":
        return "rus_Cyrl";
      case "fr":
        return "fra_Latn";
      case "es":
        return "spa_Latn";
      case "de":
        return "deu_Latn";
      case "zh":
        return "zho_Hans";
      case "ja":
        return "jpn_Jpan";
      case "ko":
        return "kor_Hang";
      case "it":
        return "ita_Latn";
      case "pt":
        return "por_Latn";
      default:
        return lang;
    }
  }
  // 1. Flores-200 / Machine Translation TSV Format
  getFloresTsvExport() {
    const header = ["sentence_id", "src_lang", "src_text", "tgt_lang", "tgt_text", "dialect", "status", "contributor", "created_at"].join("	");
    const rows = this.data.corpus.map((c) => {
      const srcCode = this.mapToFloresCode(c.sourceLang);
      const tgtCode = this.mapToFloresCode(c.targetLang);
      const cleanSrc = c.sourceText.replace(/[\t\r\n]+/g, " ").trim();
      const cleanTgt = c.targetText.replace(/[\t\r\n]+/g, " ").trim();
      return [
        c.id,
        srcCode,
        cleanSrc,
        tgtCode,
        cleanTgt,
        c.dialect || "Standard",
        c.status || (c.verified ? "approved" : "pending"),
        `${c.contributorName} (${c.contributorRole})`,
        c.createdAt
      ].join("	");
    });
    return [header, ...rows].join("\n");
  }
  // 2. Google Translate AutoML MT JSON format
  getGoogleMTJsonExport() {
    return this.data.corpus.map((c, idx) => {
      const srcCode = this.mapToFloresCode(c.sourceLang);
      const tgtCode = this.mapToFloresCode(c.targetLang);
      return {
        id: c.id || `unit-${idx + 1}`,
        translation: {
          [srcCode]: c.sourceText,
          [tgtCode]: c.targetText,
          ...c.alternativeScript ? { "brh_Latn": c.alternativeScript } : {}
        },
        metadata: {
          dialect: c.dialect || "Standard",
          verified: c.verified || c.status === "approved",
          contributor_role: c.contributorRole,
          source_type: c.sourceType || "corpus",
          induced_rule_id: c.inducedRuleId || null,
          domain: "General / Conversational",
          dataset_standard: "Flores-200 / Google MT Quality Tier-1"
        }
      };
    });
  }
  // 3. Tatoeba-Compliant TSV Format
  getTatoebaTsvExport() {
    const header = ["id", "src_lang", "src_text", "tgt_lang", "tgt_text", "dialect", "verified"].join("	");
    const rows = this.data.corpus.map((c) => {
      const cleanSrc = c.sourceText.replace(/[\t\r\n]+/g, " ").trim();
      const cleanTgt = c.targetText.replace(/[\t\r\n]+/g, " ").trim();
      return [
        c.id,
        this.mapToFloresCode(c.sourceLang),
        cleanSrc,
        this.mapToFloresCode(c.targetLang),
        cleanTgt,
        c.dialect || "Standard",
        c.verified ? "1" : "0"
      ].join("	");
    });
    return [header, ...rows].join("\n");
  }
  // 4. Grammar Rules TSV Format
  getGrammarRulesTsvExport() {
    const header = ["rule_id", "title", "category", "pattern", "explanation", "confidence", "status", "dialect", "source_type", "example_incorrect", "example_correct", "gloss"].join("	");
    const rows = this.data.grammarRules.map((r) => {
      const firstEx = r.examples?.[0] || { incorrect: "", correct: "", englishGloss: "" };
      return [
        r.id,
        r.title.replace(/[\t\r\n]+/g, " "),
        r.category,
        r.pattern.replace(/[\t\r\n]+/g, " "),
        r.explanation.replace(/[\t\r\n]+/g, " "),
        r.confidence,
        r.status,
        r.dialect || "Standard",
        r.sourceType || "general",
        firstEx.incorrect.replace(/[\t\r\n]+/g, " "),
        firstEx.correct.replace(/[\t\r\n]+/g, " "),
        firstEx.englishGloss.replace(/[\t\r\n]+/g, " ")
      ].join("	");
    });
    return [header, ...rows].join("\n");
  }
  // 5. Dataset Quality & Google Translate Readiness Statistics
  getDatasetStats() {
    const totalPairs = this.data.corpus.length;
    const verifiedPairs = this.data.corpus.filter((c) => c.verified || c.status === "approved").length;
    let sarawani = 0;
    let jhalawani = 0;
    let rakhshani = 0;
    let malookAf = 0;
    let standard = 0;
    for (const c of this.data.corpus) {
      const d = (c.dialect || "").toLowerCase();
      if (d.includes("sarawan") || d.includes("\u0633\u0627\u0631\u0627\u0648\u0627\u0646\u06CC")) sarawani++;
      else if (d.includes("jhalawan") || d.includes("\u062C\u0627\u0644\u0627\u0648\u0627\u0646\u06CC")) jhalawani++;
      else if (d.includes("rakhshan") || d.includes("\u0631\u062E\u0634\u0627\u0646\u06CC")) rakhshani++;
      else if (d.includes("malook") || d.includes("\u0645\u0639\u0644\u0648\u06A9")) malookAf++;
      else standard++;
    }
    const grammarRulesCount = this.data.grammarRules.filter((r) => r.status !== "deprecated").length;
    const verificationRatio = totalPairs > 0 ? verifiedPairs / totalPairs : 0;
    const dialectBalance = sarawani > 0 && jhalawani > 0 && rakhshani > 0 ? 20 : 10;
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
        standard
      },
      grammarRulesCount,
      readinessScore
    };
  }
}
const dbService = new DatabaseService();
export {
  GOOGLE_TRANSLATE_CATALOG,
  dbService
};
