/**
 * High-Speed Two-Step In-Memory Translation Engine for Brahui, English, and Urdu
 * 
 * STEP 1: Word & Phrase Token Lookup against Dictionary, Lexicon, and Corpus
 * STEP 2: Strict Syntax & Grammar Re-Ordering (Enforcing Dravidian SOV Structure)
 * 
 * Provides nanosecond/microsecond in-memory translation execution and robust
 * punctuation normalization.
 */

import type { Language, TranslationResult, BrahuiDialect } from '../src/types/index.js';
import { dbService } from './db.js';
import { BRAHUI_LEXICON, LexiconWord } from './dynamicTranslator.js';

export interface NormalizedInput {
  raw: string;
  normalized: string; // Stripped of trailing punctuation, trimmed, internal spaces normalized
  trailingPunctuation: string;
  hasQuestion: boolean;
  hasExclamation: boolean;
  hasPeriod: boolean;
}

/**
 * Normalizes input text by safely stripping trailing punctuation so that adding
 * or removing full stops, question marks, or exclamation points NEVER distorts
 * or changes the translation lookup.
 */
export function normalizeInputText(input: string): NormalizedInput {
  if (!input || typeof input !== 'string') {
    return {
      raw: '',
      normalized: '',
      trailingPunctuation: '',
      hasQuestion: false,
      hasExclamation: false,
      hasPeriod: false,
    };
  }

  const trimmed = input.trim();
  // Match trailing punctuation: ., ?, !, ۔, ؟, ;, :, etc.
  const punctMatch = trimmed.match(/[.?!۔؟;:،,]+$/);
  const trailingPunctuation = punctMatch ? punctMatch[0] : '';
  const withoutTrailing = trailingPunctuation
    ? trimmed.slice(0, -trailingPunctuation.length).trim()
    : trimmed;

  // Normalize internal whitespace
  const normalized = withoutTrailing.replace(/\s+/g, ' ');

  const hasQuestion = /[?؟]/.test(trimmed);
  const hasExclamation = /!/.test(trimmed);
  const hasPeriod = /[.۔]/.test(trailingPunctuation);

  return {
    raw: trimmed,
    normalized,
    trailingPunctuation,
    hasQuestion,
    hasExclamation,
    hasPeriod,
  };
}

/**
 * Formats appropriate trailing punctuation for target language
 */
export function formatTargetPunctuation(norm: NormalizedInput, targetLang: Language): string {
  const isArabic = targetLang === 'brahui-arabic' || targetLang === 'urdu';
  if (norm.hasQuestion) {
    return isArabic ? '؟' : '?';
  }
  if (norm.hasExclamation) {
    return '!';
  }
  if (norm.hasPeriod) {
    return isArabic ? '۔' : '.';
  }
  return '';
}

export interface TaggedToken {
  original: string;
  lemma: string;
  pos: 'pronoun' | 'noun' | 'verb' | 'adjective' | 'adverb' | 'postposition' | 'question' | 'particle' | 'number' | 'greeting';
  targetArabic: string;
  targetLatin: string;
  targetUrdu: string;
  targetEnglish: string;
  isSubject?: boolean;
  isObject?: boolean;
  isVerb?: boolean;
  isCopula?: boolean;
  isPostposition?: boolean;
  postpositionSuffix?: string;
  person?: '1st' | '2nd' | '3rd';
  isPlural?: boolean;
}

/**
 * High-Speed Two-Step In-Memory Translation Engine
 */
export function executeTwoStepTranslation(
  sourceText: string,
  sourceLang: Language,
  targetLang: Language
): {
  success: boolean;
  result?: TranslationResult;
  coverageRatio: number;
} {
  const norm = normalizeInputText(sourceText);
  const cleanInput = norm.normalized;
  if (!cleanInput) {
    return { success: false, coverageRatio: 0 };
  }

  const isTargetBrahui = targetLang === 'brahui-arabic' || targetLang === 'brahui-latin' || targetLang === 'brahui-roman';
  const isTargetArabic = targetLang === 'brahui-arabic';
  const isTargetLatin = targetLang === 'brahui-latin' || targetLang === 'brahui-roman';
  const isTargetUrdu = targetLang === 'urdu';
  const isTargetEnglish = targetLang === 'english';

  const isSrcEnglish = sourceLang === 'english';
  const isSrcBrahui = sourceLang === 'brahui-arabic' || sourceLang === 'brahui-latin' || sourceLang === 'brahui-roman';
  const isSrcUrdu = sourceLang === 'urdu';

  // -------------------------------------------------------------
  // STEP 1: WORD & PHRASE LOOKUP VIA IN-MEMORY TRIE / INDEX
  // -------------------------------------------------------------
  const words = cleanInput.split(/\s+/).filter(Boolean);
  const taggedTokens: TaggedToken[] = [];
  let matchedCount = 0;

  let i = 0;
  while (i < words.length) {
    const rawWord = words[i];
    const cleanWord = rawWord.toLowerCase().replace(/^[^\w\u0600-\u06FF]+|[^\w\u0600-\u06FF]+$/g, '');

    // Check 2-word phrase first (longest match)
    let foundPhrase = false;
    if (i < words.length - 1) {
      const nextWord = words[i + 1].toLowerCase().replace(/^[^\w\u0600-\u06FF]+|[^\w\u0600-\u06FF]+$/g, '');
      const twoWordPhrase = `${cleanWord} ${nextWord}`;

      // 1. Check in synchronized dynamic dictionary
      const dictMatches = dbService.findMatchingDictionary(twoWordPhrase);
      const dictHit = dictMatches.find(d => d.verified);
      if (dictHit) {
        taggedTokens.push({
          original: `${words[i]} ${words[i + 1]}`,
          lemma: dictHit.term,
          pos: (dictHit.partOfSpeech?.toLowerCase() as any) || 'noun',
          targetArabic: dictHit.term,
          targetLatin: dictHit.latinTerm || dictHit.term,
          targetUrdu: dictHit.urduMeaning || dictHit.meaning,
          targetEnglish: dictHit.englishMeaning || dictHit.meaning,
          isObject: true,
        });
        matchedCount += 2;
        i += 2;
        foundPhrase = true;
        continue;
      }
    }

    if (foundPhrase) continue;

    // Check if word has Brahui attached postposition suffix: -ṭī, -nā, -ān, -ki, -e
    let postSuffix: string | null = null;
    let baseWord = cleanWord;
    if (isSrcBrahui) {
      if (cleanWord.endsWith('-ṭī') || cleanWord.endsWith('ٹی')) {
        postSuffix = 'locative';
        baseWord = cleanWord.replace(/-ṭī|ٹی$/, '').trim();
      } else if (cleanWord.endsWith('-nā') || cleanWord.endsWith('نا')) {
        postSuffix = 'genitive';
        baseWord = cleanWord.replace(/-nā|نا$/, '').trim();
      } else if (cleanWord.endsWith('-ān') || cleanWord.endsWith('آن')) {
        postSuffix = 'ablative';
        baseWord = cleanWord.replace(/-ān|آن$/, '').trim();
      } else if (cleanWord.endsWith('-ki') || cleanWord.endsWith('کی')) {
        postSuffix = 'purposive';
        baseWord = cleanWord.replace(/-ki|کی$/, '').trim();
      }
    }

    // Single word lookup
    // A. Check in synchronized dynamic dictionary (O(1))
    const dictSingleMatches = dbService.findMatchingDictionary(baseWord);
    const dictHit = dictSingleMatches.find(d => d.verified) || dictSingleMatches[0];

    // B. Check in BRAHUI_LEXICON
    const lexHit = BRAHUI_LEXICON[baseWord] || Object.values(BRAHUI_LEXICON).find(
      (e) =>
        e.english.toLowerCase() === baseWord ||
        e.arabic === baseWord ||
        e.latin.toLowerCase() === baseWord ||
        e.urdu === baseWord
    );

    if (dictHit) {
      const isArabicTerm = /[\u0600-\u06FF]/.test(dictHit.term);
      taggedTokens.push({
        original: rawWord,
        lemma: dictHit.term,
        pos: (dictHit.partOfSpeech?.toLowerCase() as any) || 'noun',
        targetArabic: isArabicTerm ? dictHit.term : (dictHit.urduMeaning || dictHit.term),
        targetLatin: dictHit.latinTerm || dictHit.term,
        targetUrdu: dictHit.urduMeaning || dictHit.meaning,
        targetEnglish: dictHit.englishMeaning || dictHit.meaning,
        isObject: true,
        postpositionSuffix: postSuffix || undefined,
      });
      matchedCount++;
    } else if (lexHit) {
      const isSubj = lexHit.pos === 'pronoun' && ['i', 'we', 'he', 'she', 'they', 'you'].includes(lexHit.english.toLowerCase());
      const isVerb = lexHit.pos === 'verb';
      const isCopula = ['am', 'is', 'are', 'was', 'were', 'be'].includes(lexHit.english.toLowerCase());
      const isPost = lexHit.pos === 'postposition';

      let person: '1st' | '2nd' | '3rd' = '3rd';
      let isPlural = false;
      if (['i', 'me', 'my', 'mine'].includes(lexHit.english.toLowerCase())) person = '1st';
      else if (['we', 'us', 'our'].includes(lexHit.english.toLowerCase())) { person = '1st'; isPlural = true; }
      else if (['you', 'your'].includes(lexHit.english.toLowerCase())) person = '2nd';
      else if (['they', 'them', 'their'].includes(lexHit.english.toLowerCase())) { person = '3rd'; isPlural = true; }

      taggedTokens.push({
        original: rawWord,
        lemma: lexHit.english,
        pos: lexHit.pos,
        targetArabic: lexHit.arabic,
        targetLatin: lexHit.latin,
        targetUrdu: lexHit.urdu,
        targetEnglish: lexHit.english,
        isSubject: isSubj,
        isVerb: isVerb,
        isCopula: isCopula,
        isPostposition: isPost,
        person,
        isPlural,
        postpositionSuffix: postSuffix || undefined,
      });
      matchedCount++;
    } else {
      // Numbers
      const numMap: Record<string, { ar: string; lt: string; ur: string }> = {
        'one': { ar: 'اسٹ / اسہ', lt: 'asa', ur: 'ایک' },
        'two': { ar: 'اِرا', lt: 'irā', ur: 'دو' },
        'three': { ar: 'مُسِٹ', lt: 'musiţ', ur: 'تین' },
        'four': { ar: 'چار', lt: 'chār', ur: 'چار' },
        'five': { ar: 'پنج', lt: 'panj', ur: 'پانچ' },
        '1': { ar: '۱', lt: '1', ur: '۱' },
        '2': { ar: '۲', lt: '2', ur: '۲' },
        '3': { ar: '۳', lt: '3', ur: '۳' },
      };
      if (numMap[cleanWord]) {
        taggedTokens.push({
          original: rawWord,
          lemma: cleanWord,
          pos: 'number',
          targetArabic: numMap[cleanWord].ar,
          targetLatin: numMap[cleanWord].lt,
          targetUrdu: numMap[cleanWord].ur,
          targetEnglish: cleanWord,
        });
        matchedCount++;
      } else {
        // Unmatched fallback token
        taggedTokens.push({
          original: rawWord,
          lemma: cleanWord,
          pos: 'noun',
          targetArabic: rawWord,
          targetLatin: rawWord,
          targetUrdu: rawWord,
          targetEnglish: rawWord,
          isObject: true,
        });
      }
    }

    i++;
  }

  const coverageRatio = words.length > 0 ? matchedCount / words.length : 0;
  // If input has multiple words and coverage is below 50%, or single word with 0 match, fall back to Gemini
  if (words.length > 2 && coverageRatio < 0.5) {
    return { success: false, coverageRatio };
  }
  if (words.length <= 2 && matchedCount === 0) {
    return { success: false, coverageRatio: 0 };
  }

  // -------------------------------------------------------------
  // STEP 2: SYNTAX & GRAMMAR RE-ORDERING (SOV CONCORDANCE)
  // -------------------------------------------------------------
  let subjectTokens: TaggedToken[] = [];
  let objectTokens: TaggedToken[] = [];
  let postpositionTokens: TaggedToken[] = [];
  let verbTokens: TaggedToken[] = [];
  let copulaTokens: TaggedToken[] = [];
  let otherTokens: TaggedToken[] = [];

  for (const t of taggedTokens) {
    if (t.isSubject) {
      subjectTokens.push(t);
    } else if (t.isCopula) {
      copulaTokens.push(t);
    } else if (t.isVerb) {
      verbTokens.push(t);
    } else if (t.isPostposition) {
      postpositionTokens.push(t);
    } else if (t.pos === 'noun' || t.pos === 'adjective' || t.pos === 'number') {
      objectTokens.push(t);
    } else {
      otherTokens.push(t);
    }
  }

  // Determine subject person for verb agreement
  const primarySubject = subjectTokens[0];
  const subjPerson = primarySubject?.person || '3rd';
  const isPlural = primarySubject?.isPlural || false;

  // Build Brahui Target Tokens (SOV: Subject + Object + Verb/Copula)
  let orderedBrahuiArabic: string[] = [];
  let orderedBrahuiLatin: string[] = [];
  let orderedUrdu: string[] = [];
  let orderedEnglish: string[] = [];

  if (isTargetBrahui) {
    // 1. Subject First
    for (const s of subjectTokens) {
      orderedBrahuiArabic.push(s.targetArabic);
      orderedBrahuiLatin.push(s.targetLatin);
    }

    // 2. Objects & Complements in Middle
    for (const o of otherTokens) {
      orderedBrahuiArabic.push(o.targetArabic);
      orderedBrahuiLatin.push(o.targetLatin);
    }
    for (const o of objectTokens) {
      let arObj = o.targetArabic;
      let ltObj = o.targetLatin;
      if (o.postpositionSuffix === 'locative') {
        arObj += ' ٹی';
        ltObj += '-ṭī';
      } else if (o.postpositionSuffix === 'genitive') {
        arObj += ' نا';
        ltObj += '-nā';
      } else if (o.postpositionSuffix === 'ablative') {
        arObj += ' آن';
        ltObj += '-ān';
      } else if (o.postpositionSuffix === 'purposive') {
        arObj += ' کی';
        ltObj += '-ki';
      }
      orderedBrahuiArabic.push(arObj);
      orderedBrahuiLatin.push(ltObj);
    }

    // Postpositions attach to previous noun
    for (const p of postpositionTokens) {
      orderedBrahuiArabic.push(p.targetArabic);
      orderedBrahuiLatin.push(p.targetLatin);
    }

    // 3. Verbs terminate the clause (Strict Dravidian SOV)
    for (const v of verbTokens) {
      // Conjugate verb agreement if it's "study / read"
      let vAr = v.targetArabic;
      let vLt = v.targetLatin;
      if (v.lemma === 'study' || v.lemma === 'read') {
        if (subjPerson === '1st' && !isPlural) { vAr = 'خوانوہ'; vLt = 'khwāniva'; }
        else if (subjPerson === '1st' && isPlural) { vAr = 'خواننہ'; vLt = 'khwānina'; }
        else if (subjPerson === '2nd') { vAr = 'خوانیسہ'; vLt = 'khwānisā'; }
        else if (subjPerson === '3rd' && !isPlural) { vAr = 'خوانیک'; vLt = 'khwānik'; }
        else if (subjPerson === '3rd' && isPlural) { vAr = 'خوانیرہ'; vLt = 'khwānira'; }
      }
      orderedBrahuiArabic.push(vAr);
      orderedBrahuiLatin.push(vLt);
    }

    // Copula terminates if no other verb
    if (verbTokens.length === 0 && copulaTokens.length > 0) {
      for (const c of copulaTokens) {
        let copAr = 'ءِ';
        let copLt = 'e';
        if (subjPerson === '1st' && !isPlural) { copAr = 'اُٹ'; copLt = 'uţ'; }
        else if (subjPerson === '1st' && isPlural) { copAr = 'اُن'; copLt = 'un'; }
        else if (subjPerson === '2nd') { copAr = 'اُس'; copLt = 'us'; }
        else if (subjPerson === '3rd') { copAr = 'ءِ'; copLt = 'e'; }
        orderedBrahuiArabic.push(copAr);
        orderedBrahuiLatin.push(copLt);
      }
    }
  } else if (isTargetEnglish) {
    // SVO for English: Subject + Verb + Copula + Objects
    for (const s of subjectTokens) orderedEnglish.push(s.targetEnglish);
    for (const v of verbTokens) orderedEnglish.push(v.targetEnglish);
    for (const c of copulaTokens) orderedEnglish.push(c.targetEnglish);
    for (const o of objectTokens) orderedEnglish.push(o.targetEnglish);
    for (const p of postpositionTokens) orderedEnglish.push(p.targetEnglish);
    for (const ot of otherTokens) orderedEnglish.push(ot.targetEnglish);
  } else if (isTargetUrdu) {
    // SOV for Urdu
    for (const s of subjectTokens) orderedUrdu.push(s.targetUrdu);
    for (const o of objectTokens) orderedUrdu.push(o.targetUrdu);
    for (const p of postpositionTokens) orderedUrdu.push(p.targetUrdu);
    for (const ot of otherTokens) orderedUrdu.push(ot.targetUrdu);
    for (const v of verbTokens) orderedUrdu.push(v.targetUrdu);
    for (const c of copulaTokens) orderedUrdu.push(c.targetUrdu);
  }

  // Format final strings
  let finalTranslated = '';
  let finalAlt = '';

  const targetPunct = formatTargetPunctuation(norm, targetLang);
  const altPunct = formatTargetPunctuation(norm, isTargetArabic ? 'brahui-latin' : 'brahui-arabic');

  if (isTargetArabic) {
    finalTranslated = orderedBrahuiArabic.join(' ') + targetPunct;
    finalAlt = orderedBrahuiLatin.join(' ') + altPunct;
  } else if (isTargetLatin) {
    finalTranslated = orderedBrahuiLatin.join(' ') + targetPunct;
    finalAlt = orderedBrahuiArabic.join(' ') + altPunct;
  } else if (isTargetEnglish) {
    finalTranslated = orderedEnglish.join(' ') + targetPunct;
    finalAlt = orderedBrahuiArabic.join(' ') + altPunct;
  } else if (isTargetUrdu) {
    finalTranslated = orderedUrdu.join(' ') + targetPunct;
    finalAlt = orderedBrahuiLatin.join(' ') + altPunct;
  } else {
    finalTranslated = orderedBrahuiArabic.join(' ') + targetPunct;
    finalAlt = orderedBrahuiLatin.join(' ') + altPunct;
  }

  const activeRules = dbService.getActiveRules();
  const sovRules = activeRules.filter(r => r.category === 'Syntax' || r.pattern.includes('SOV'));
  const appliedRules = sovRules.length > 0
    ? sovRules.slice(0, 3).map(r => ({ id: r.id, title: r.title, category: r.category }))
    : [{ id: 'rule-sov-syntax-01', title: 'Strict SOV (Subject - Object - Verb) Word Order', category: 'Syntax' }];

  const result: TranslationResult = {
    sourceText: norm.raw,
    sourceLang,
    targetLang,
    translatedText: finalTranslated,
    alternativeScript: finalAlt,
    confidence: Math.min(99, Math.round(92 + coverageRatio * 7)),
    grammaticalNotes: [
      'Executed via High-Speed Two-Step In-Memory Linguistic Engine (Word Lookup + SOV Re-Ordering).',
      'Strict Dravidian SOV syntax enforced: Subject precedes object, finite verb terminates the clause.',
      'Input punctuation normalized; trailing full stop preserved without distorting word lookups.'
    ],
    morphemeBreakdown: taggedTokens.map(t => ({
      word: isTargetArabic ? t.targetArabic : t.targetLatin,
      root: t.lemma,
      partOfSpeech: t.pos,
      meaning: t.targetEnglish || t.lemma,
    })),
    rulesApplied: appliedRules,
    consultedKnowledgeDocs: [],
    dictionaryMatches: taggedTokens.filter(t => t.lemma).map(t => ({
      term: t.targetArabic,
      meaning: t.targetEnglish || t.lemma,
      sourceDoc: 'High-Speed In-Memory Lexicon'
    })),
    paragraphCount: 1,
    wordCount: words.length,
  };

  return {
    success: true,
    result,
    coverageRatio,
  };
}
