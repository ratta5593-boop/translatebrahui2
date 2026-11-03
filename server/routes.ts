import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { dbService, GOOGLE_TRANSLATE_CATALOG, determinePartOfSpeech } from './db.js';
import {
  translateText,
  induceGrammarRule,
  extractVocabularyTermsFromCorrection,
  summarizeUploadedDoc,
  generateCandidateRulesFromText,
  sanitizeBrahuiOutput,
} from './gemini.js';
import { dynamicTranslateSentence, BRAHUI_LEXICON } from './dynamicTranslator.js';
import { normalizeInputText, formatTargetPunctuation, executeTwoStepTranslation } from './fastPipeline.js';
import type { Language } from '../src/types/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

export const apiRouter = express.Router();
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-gemini-api-key, x-api-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
apiRouter.use(express.json({ limit: '30mb' }));
apiRouter.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Admin session store: fast local cache token -> { username, createdAt, expiresAt }
const adminSessions = new Map<string, { username: string; createdAt: number; expiresAt: number }>();
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

// Persistent Secret for Stateless Admin Tokens across Vercel serverless lambdas
const ADMIN_TOKEN_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  process.env.SESSION_SECRET ||
  'brahui-admin-secure-auth-secret-key-2026-attalibrary-1761f';

export function createAdminToken(username: string): string {
  const now = Date.now();
  const payload = {
    username,
    role: 'Administrator',
    iat: now,
    exp: now + SESSION_LIFETIME_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  const token = `${encodedPayload}.${signature}`;

  adminSessions.set(token, {
    username,
    createdAt: now,
    expiresAt: payload.exp,
  });

  return token;
}

export function verifyAdminToken(token: string): { username: string; createdAt: number; expiresAt: number } | null {
  if (!token || typeof token !== 'string') return null;

  // 1. Fast in-memory cache check
  const mem = adminSessions.get(token);
  if (mem && Date.now() <= mem.expiresAt) {
    return mem;
  }

  // 2. Stateless HMAC verification (survives any Vercel serverless cold start / new lambda instance)
  try {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [encodedPayload, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', ADMIN_TOKEN_SECRET)
        .update(encodedPayload)
        .digest('base64url');

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSig);

      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
        const payload = JSON.parse(payloadStr);

        if (payload && payload.exp && Date.now() <= payload.exp && payload.username) {
          const session = {
            username: payload.username,
            createdAt: payload.iat || Date.now(),
            expiresAt: payload.exp,
          };
          adminSessions.set(token, session);
          return session;
        }
      }
    }
  } catch (err) {
    console.warn('[Admin Auth] Error decoding stateless token:', err);
  }

  return null;
}

const getAdminCredentials = () => dbService.getAdminCredentials();

export function getAdminSession(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  return verifyAdminToken(token);
}

// Middleware to protect sensitive administrative endpoints
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const session = getAdminSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required or session expired' });
  }

  (req as any).adminUser = session.username;
  next();
}

// Helper to format Urdu/Brahui dialect name
export function formatDialectLabel(dialect?: string): string {
  if (!dialect) return 'عام';
  const trimmed = dialect.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('sarawani') || trimmed.includes('ساراوانی')) return 'ساراوانی';
  if (lower.includes('jhalawani') || trimmed.includes('جھلاوانی') || trimmed.includes('جالاوانی')) return 'جھلاوانی';
  if (lower.includes('rakhshani') || trimmed.includes('رخشانی')) return 'رخشانی';
  if (lower.includes('maloom') || trimmed.includes('معلوم')) return 'معلوم اف';
  if (lower.includes('standard') || trimmed.includes('عام')) return 'عام';
  return trimmed;
}

// Ultra-fast in-memory cache for repeated sentences & instant correction updates
const translationFastCache = new Map<string, { result: any; timestamp: number }>();
const MAX_CACHE_SIZE = 500;

export const apiApp = express();
apiApp.use(express.json({ limit: '30mb' }));
apiApp.use(express.urlencoded({ extended: true, limit: '30mb' }));
apiApp.use('/api', apiRouter);
apiApp.use('/', apiRouter);

// 1. Translation Endpoint (dynamic Gemini generation with environment variable & header fallback)
apiRouter.post('/translate', async (req: Request, res: Response) => {
  try {
    const { sourceText, sourceLang, targetLang, apiKey } = req.body;
    if (!sourceText || !sourceText.trim()) {
      return res.status(400).json({ error: 'Source text is required' });
    }

    // Step 0: Robust Punctuation Normalization (Requirement 1)
    // Strip trailing punctuation before processing so adding or removing full stop does not distort translation output
    const norm = normalizeInputText(sourceText);
    const cleanText = norm.normalized;
    if (!cleanText) {
      return res.status(400).json({ error: 'Source text is required' });
    }

    const sLang = (sourceLang || 'english') as Language;
    const tLang = (targetLang || 'brahui-arabic') as Language;
    const cacheKey = `${sLang}:${tLang}:${cleanText.toLowerCase()}`;

    const isTargetArabic = tLang === 'brahui-arabic';
    const targetPunct = formatTargetPunctuation(norm, tLang);
    const altPunct = formatTargetPunctuation(norm, isTargetArabic ? 'brahui-latin' : 'brahui-arabic');

    // Priority 1: Check fast in-memory cache for recent identical requests (normalized)
    const cached = translationFastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      const formattedCached = {
        ...cached.result,
        sourceText: norm.raw,
        translatedText: cached.result.translatedText.replace(/[.?!۔؟;:،,]+$/, '') + targetPunct,
        alternativeScript: cached.result.alternativeScript ? cached.result.alternativeScript.replace(/[.?!۔؟;:،,]+$/, '') + altPunct : '',
      };
      return res.json(formattedCached);
    }

    // Priority 2: Instant O(1) lookup in synchronized cloud corpus for exact verified corrections
    const matchingEntries = dbService.findMatchingCorpus(cleanText, sLang, tLang);

    if (matchingEntries.length > 0) {
      if (matchingEntries.length > 1) {
        // Requirement 5: Multiple dialect variants exist - display each followed by dialect name in brackets
        const dialectVariants = matchingEntries.map(e => {
          const cleanTgt = e.targetText.replace(/[.?!۔؟;:،,]+$/, '');
          const cleanAlt = e.alternativeScript ? e.alternativeScript.replace(/[.?!۔؟;:،,]+$/, '') : '';
          return {
            dialect: formatDialectLabel(e.dialect),
            text: cleanTgt + targetPunct,
            alternativeScript: cleanAlt ? cleanAlt + altPunct : undefined,
          };
        });

        const formattedTranslations = dialectVariants
          .map(v => `${v.text} (${v.dialect})`)
          .join('\n');

        const multiResult = {
          sourceText: norm.raw,
          sourceLang: sLang,
          targetLang: tLang,
          translatedText: formattedTranslations,
          alternativeScript: dialectVariants
            .map(v => v.alternativeScript ? `${v.alternativeScript} (${v.dialect})` : '')
            .filter(Boolean)
            .join('\n'),
          confidence: 99,
          dialectVariants,
          rulesApplied: [],
          consultedKnowledgeDocs: [],
          dictionaryMatches: [],
          paragraphCount: 1,
          wordCount: cleanText.split(/\s+/).filter(Boolean).length,
          grammaticalNotes: [
            `Multi-dialect translation verified across ${dialectVariants.length} dialects: ${dialectVariants.map(d => d.dialect).join(', ')}.`,
          ],
        };
        translationFastCache.set(cacheKey, { result: multiResult, timestamp: Date.now() });
        return res.json(multiResult);
      }

      // Single match
      const exactCorrection = matchingEntries[0];
      const activeRules = dbService.getActiveRules();
      const associatedRule = exactCorrection.inducedRuleId
        ? activeRules.find((r) => r.id === exactCorrection.inducedRuleId)
        : null;

      const dialectLabel = formatDialectLabel(exactCorrection.dialect);
      const isSpecificDialect = exactCorrection.dialect && exactCorrection.dialect !== 'Standard' && exactCorrection.dialect !== 'All';

      const cleanTgt = exactCorrection.targetText.replace(/[.?!۔؟;:،,]+$/, '') + targetPunct;
      const cleanAlt = exactCorrection.alternativeScript ? exactCorrection.alternativeScript.replace(/[.?!۔؟;:،,]+$/, '') + altPunct : '';

      const correctionResult = {
        sourceText: norm.raw,
        sourceLang: sLang,
        targetLang: tLang,
        translatedText: isSpecificDialect ? `${cleanTgt} (${dialectLabel})` : cleanTgt,
        alternativeScript: cleanAlt,
        confidence: 99,
        dialectVariants: [
          {
            dialect: dialectLabel,
            text: cleanTgt,
            alternativeScript: cleanAlt
          }
        ],
        rulesApplied: associatedRule
          ? [{ id: associatedRule.id, title: associatedRule.title, category: associatedRule.category }]
          : [],
        consultedKnowledgeDocs: [],
        dictionaryMatches: [],
        paragraphCount: 1,
        wordCount: cleanText.split(/\s+/).filter(Boolean).length,
        grammaticalNotes: [
          'Direct user-verified persistent correction applied globally from database memory.',
          `Dialect: ${dialectLabel} (Contributed by ${exactCorrection.contributorName}).`,
        ],
      };
      translationFastCache.set(cacheKey, { result: correctionResult, timestamp: Date.now() });
      return res.json(correctionResult);
    }

    // Priority 2.5: Fast O(1) synchronized cloud dictionary match for terms & short phrases
    if (cleanText.split(/\s+/).length <= 4) {
      const dictMatches = dbService.findMatchingDictionary(cleanText);
      const verifiedMatch = dictMatches.find(d => d.verified) || dictMatches[0];
      if (verifiedMatch) {
        let targetText = '';
        let altScript = '';

        if (isTargetArabic) {
          targetText = verifiedMatch.term;
          altScript = verifiedMatch.latinTerm || '';
        } else if (tLang === 'brahui-latin' || tLang === 'brahui-roman') {
          targetText = verifiedMatch.latinTerm || verifiedMatch.term;
          altScript = verifiedMatch.term;
        } else if (tLang === 'urdu' && verifiedMatch.urduMeaning) {
          targetText = verifiedMatch.urduMeaning;
          altScript = verifiedMatch.meaning;
        } else if (tLang === 'english') {
          targetText = verifiedMatch.englishMeaning || verifiedMatch.meaning;
          altScript = verifiedMatch.latinTerm || '';
        }

        if (targetText) {
          const formattedTgt = targetText.replace(/[.?!۔؟;:،,]+$/, '') + targetPunct;
          const formattedAlt = altScript ? altScript.replace(/[.?!۔؟;:،,]+$/, '') + altPunct : '';
          const dictResult = {
            sourceText: norm.raw,
            sourceLang: sLang,
            targetLang: tLang,
            translatedText: formattedTgt,
            alternativeScript: formattedAlt,
            confidence: 99,
            dialectVariants: [
              {
                dialect: formatDialectLabel(verifiedMatch.dialect),
                text: formattedTgt,
                alternativeScript: formattedAlt
              }
            ],
            rulesApplied: [],
            consultedKnowledgeDocs: verifiedMatch.sourceDocTitle ? [verifiedMatch.sourceDocTitle] : [],
            dictionaryMatches: [
              {
                term: verifiedMatch.term,
                meaning: verifiedMatch.meaning,
                sourceDoc: verifiedMatch.sourceDocTitle || 'Synchronized Cloud Dictionary'
              }
            ],
            paragraphCount: 1,
            wordCount: cleanText.split(/\s+/).length,
            grammaticalNotes: [
              `Instant cloud-synchronized dictionary match: "${verifiedMatch.term}" (${verifiedMatch.partOfSpeech || 'Lexicon'}).`,
              `Source: ${verifiedMatch.sourceDocTitle || 'Verified Cloud Lexicon'}.`
            ]
          };
          translationFastCache.set(cacheKey, { result: dictResult, timestamp: Date.now() });
          return res.json(dictResult);
        }
      }
    }

    // Priority 2.8: High-Speed Two-Step Linguistic Pipeline (Nanosecond Execution via In-Memory Trie/Index) (Requirement 5)
    // STEP 1: Scan tokens against Dictionary & Lexicon
    // STEP 2: Strict Syntax & Grammar Re-Ordering (enforcing Brahui Dravidian SOV structure)
    const fastPipeline = executeTwoStepTranslation(cleanText, sLang, tLang);
    if (fastPipeline.success && fastPipeline.result && (fastPipeline.coverageRatio >= 0.5 || cleanText.split(/\s+/).length <= 2)) {
      const fastResult = {
        ...fastPipeline.result,
        sourceText: norm.raw,
        translatedText: fastPipeline.result.translatedText.replace(/[.?!۔؟;:،,]+$/, '') + targetPunct,
        alternativeScript: fastPipeline.result.alternativeScript ? fastPipeline.result.alternativeScript.replace(/[.?!۔؟;:،,]+$/, '') + altPunct : '',
      };
      translationFastCache.set(cacheKey, { result: fastResult, timestamp: Date.now() });
      return res.json(fastResult);
    }

    const rawApiKey =
      (req.headers['x-gemini-api-key'] as string) ||
      (req.headers['x-api-key'] as string) ||
      apiKey;
    const providedApiKey =
      rawApiKey && typeof rawApiKey === 'string' && !rawApiKey.startsWith('gen-lang-client')
        ? rawApiKey.trim()
        : undefined;

    // Dynamically translate text via Gemini with runtime environment variable and key fallback
    const result = await translateText(cleanText, sLang, tLang, {
      apiKey: providedApiKey,
      forceDynamicAI: true,
    });

    result.sourceText = norm.raw;
    // Ensure zero foreign token leakage, script normalization, and punctuation formatting
    result.translatedText = sanitizeBrahuiOutput(result.translatedText, tLang, sLang).replace(/[.?!۔؟;:،,]+$/, '') + targetPunct;
    if (result.alternativeScript) {
      result.alternativeScript = sanitizeBrahuiOutput(
        result.alternativeScript,
        tLang === 'brahui-arabic' ? 'brahui-latin' : 'brahui-arabic',
        sLang
      ).replace(/[.?!۔؟;:،,]+$/, '') + altPunct;
    }

    // If multi-dialect variants are returned, ensure bracketed dialect labels are present in translatedText
    if (result.dialectVariants && result.dialectVariants.length > 1) {
      const hasBrackets = result.translatedText.includes('(') && result.translatedText.includes(')');
      if (!hasBrackets) {
        result.translatedText = result.dialectVariants
          .map(v => `${v.text.replace(/[.?!۔؟;:،,]+$/, '') + targetPunct} (${formatDialectLabel(v.dialect)})`)
          .join('\n');
      }
    }

    translationFastCache.set(cacheKey, { result, timestamp: Date.now() });
    if (translationFastCache.size > MAX_CACHE_SIZE) {
      const oldestKey = translationFastCache.keys().next().value;
      if (oldestKey) translationFastCache.delete(oldestKey);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Translation route error:', error);
    try {
      const sLang = (req.body?.sourceLang || 'english') as Language;
      const tLang = (req.body?.targetLang || 'brahui-arabic') as Language;
      const norm = normalizeInputText(req.body?.sourceText || '');
      const isTargetArabic = tLang === 'brahui-arabic';
      const targetPunct = formatTargetPunctuation(norm, tLang);
      const altPunct = formatTargetPunctuation(norm, isTargetArabic ? 'brahui-latin' : 'brahui-arabic');

      const fallbackResult = dynamicTranslateSentence(norm.normalized || req.body?.sourceText || '', sLang, tLang);
      fallbackResult.sourceText = norm.raw || req.body?.sourceText || '';
      fallbackResult.translatedText = sanitizeBrahuiOutput(fallbackResult.translatedText, tLang, sLang).replace(/[.?!۔؟;:،,]+$/, '') + targetPunct;
      if (fallbackResult.alternativeScript) {
        fallbackResult.alternativeScript = sanitizeBrahuiOutput(
          fallbackResult.alternativeScript,
          tLang === 'brahui-arabic' ? 'brahui-latin' : 'brahui-arabic',
          sLang
        ).replace(/[.?!۔؟;:،,]+$/, '') + altPunct;
      }
      return res.json({ ...fallbackResult, isFallback: true });
    } catch {
      res.status(500).json({ error: error.message || 'Translation failed' });
    }
  }
});

// 2. User Correction & Active Learning Induction Endpoint
apiRouter.post('/corrections/submit', async (req: Request, res: Response) => {
  try {
    const {
      sourceText,
      sourceLang,
      targetLang,
      initialTranslation,
      correctedTranslation,
      userNotes,
      dialect,
      contributorName,
      contributorRole,
      alternativeScript
    } = req.body;

    if (!sourceText || !correctedTranslation) {
      return res.status(400).json({ error: 'sourceText and correctedTranslation are required' });
    }

    const session = getAdminSession(req);
    const isAdmin = !!session;

    // Step 1: Run AI Grammar Rule Induction and Dynamic Dictionary Extraction concurrently
    // Both functions have internal timeouts that return fast heuristic fallbacks, ensuring zero freeze
    let inductionResult: any = null;
    let extractedTerms: any[] = [];

    try {
      const [aiInduction, vocabTerms] = await Promise.all([
        induceGrammarRule({
          sourceText,
          sourceLang: sourceLang || 'english',
          targetLang: targetLang || 'brahui-arabic',
          initialTranslation: initialTranslation || '',
          correctedTranslation: correctedTranslation.trim(),
          userNotes,
          dialect: dialect || 'Standard',
        }).catch(() => null),
        extractVocabularyTermsFromCorrection({
          sourceText: sourceText.trim(),
          sourceLang: sourceLang || 'english',
          targetLang: targetLang || 'brahui-arabic',
          correctedTranslation: correctedTranslation.trim(),
          alternativeScript: alternativeScript || '',
          dialect: dialect || 'Standard',
        }).catch(() => []),
      ]);
      inductionResult = aiInduction;
      extractedTerms = Array.isArray(vocabTerms) ? vocabTerms : [];
    } catch {
      inductionResult = null;
      extractedTerms = [];
    }

    if (!inductionResult?.rule) {
      let inferredCategory = 'Morphology';
      let inferredPattern = `"${initialTranslation || sourceText}" -> "${correctedTranslation.trim()}"`;
      let inferredExplanation = 'Community correction recorded. System induced rule updating output to 100% authoritative Brahui.';

      if (correctedTranslation.includes('ݪ') || correctedTranslation.toLowerCase().includes('lh')) {
        inferredCategory = 'Orthography';
        inferredPattern = `Perso-Arabic [ݪ] <-> Roman Latin [lh]`;
        inferredExplanation = `Correction enforces authentic Brahui voiceless lateral fricative (ݪ / lh) phoneme.`;
      } else if (correctedTranslation.includes(' نا ') || correctedTranslation.endsWith('نا') || correctedTranslation.includes('-na')) {
        inferredCategory = 'Morphology';
        inferredPattern = `[Noun/Pronoun] + -na (Genitive/Possessive)`;
        inferredExplanation = `Correction applies the Brahui genitive marker -na for possessive attribution.`;
      } else if (correctedTranslation.includes(' کی') || correctedTranslation.includes('-ki')) {
        inferredCategory = 'Morphology';
        inferredPattern = `[Noun/Pronoun] + -ki (Dative/Beneficiary)`;
        inferredExplanation = `Correction incorporates the Brahui dative postposition -ki.`;
      } else if (correctedTranslation.includes(' آن') || correctedTranslation.includes('-ān')) {
        inferredCategory = 'Morphology';
        inferredPattern = `[Noun] + -ān (Ablative Origin)`;
        inferredExplanation = `Correction enforces the Brahui ablative suffix -ān for origin/movement.`;
      }

      inductionResult = {
        rule: {
          title: `Induced Rule: "${sourceText.slice(0, 30)}"`,
          category: inferredCategory,
          pattern: inferredPattern,
          explanation: inferredExplanation,
          confidence: 90,
          status: 'verified',
          dialect: dialect || 'Standard',
          examples: [
            {
              incorrect: initialTranslation || sourceText,
              correct: correctedTranslation.trim(),
              englishGloss: sourceText.trim(),
            },
          ],
          inducedFrom: {
            sourceText: sourceText.trim(),
            initialTranslation: initialTranslation || '',
            correctedTranslation: correctedTranslation.trim(),
            sourceLang: sourceLang || 'english',
            targetLang: targetLang || 'brahui-arabic',
          },
        },
        explanationText: inferredExplanation,
      };
    }

    // Step 2: Save Induced Rule into Database
    const savedRule = dbService.addGrammarRule({
      ...inductionResult.rule,
      status: 'verified',
      dialect: dialect || 'Standard',
      sourceType: isAdmin ? 'admin_direct' : 'user_correction',
      verifiedBy: isAdmin ? session.username : (contributorName || 'Community Contributor (Auto-learned)'),
      verifiedAt: new Date().toISOString(),
    });

    // Step 3: Real-Time High-Speed Word Ingestion & Duplicate Prevention Pipeline
    // As soon as a correction is submitted, tokenize in memory, perform nanosecond duplicate check,
    // and if word does NOT exist, immediately extract with context/meaning and insert into official Firestore database (attalibrary-1761f).
    let savedDictEntries: any[] = [];
    try {
      savedDictEntries = dbService.ingestNewWordsFromCorrection({
        correctedTranslation: correctedTranslation.trim(),
        sourceText: sourceText.trim(),
        alternativeScript: alternativeScript || '',
        sourceLang,
        targetLang,
        dialect: dialect || 'Standard',
        contributorName: contributorName || (isAdmin ? session.username : 'Community Contributor'),
        extractedTerms: Array.isArray(extractedTerms) ? extractedTerms : [],
      });
    } catch (dictErr) {
      console.warn('[Correction] Error during ingestNewWordsFromCorrection:', dictErr);
    }

    // Also check any remaining extracted terms from AI induction for duplicate prevention
    if (Array.isArray(extractedTerms) && extractedTerms.length > 0) {
      for (const termItem of extractedTerms) {
        try {
          const cleanT = (termItem.term || '').trim().replace(/[.?!۔؟;:،,]+$/, '');
          const cleanM = (termItem.meaning || termItem.englishMeaning || '').trim().replace(/[.?!۔؟;:،,]+$/, '');
          if (!cleanT || !cleanM) continue;
          // Duplicate check: if word already exists in Dictionary, do NOT add it again!
          if (dbService.hasDictionaryWord(cleanT)) continue;

          if (cleanT.split(/\s+/).length <= 2 && cleanM.split(/\s+/).length <= 4 && !/[.?!۔؟]/.test(cleanT)) {
            const dictEntry = dbService.addDictionaryEntry({
              term: cleanT,
              latinTerm: termItem.latinTerm?.trim(),
              meaning: cleanM,
              englishMeaning: termItem.englishMeaning?.trim() || cleanM,
              urduMeaning: termItem.urduMeaning?.trim(),
              partOfSpeech: termItem.partOfSpeech || 'Noun',
              dialect: dialect || 'Standard',
              sourceType: 'user_correction',
              sourceDocTitle: `Learned from Correction: "${sourceText.slice(0, 30)}"`,
              verified: true,
            });
            if (dictEntry) savedDictEntries.push(dictEntry);
          }
        } catch (e) {
          console.warn('[Correction] Skipping individual term insertion due to error:', e);
        }
      }
    }

    // Step 4: Add to Corpus dataset as approved
    const corpusEntry = dbService.addCorpusEntry({
      sourceText: sourceText.trim(),
      sourceLang: sourceLang || 'english',
      targetText: correctedTranslation.trim(),
      targetLang: targetLang || 'brahui-arabic',
      alternativeScript: alternativeScript || '',
      dialect: dialect || 'Standard',
      contextNotes: userNotes || '',
      contributorName: contributorName || (isAdmin ? session.username : 'Community Contributor'),
      contributorRole: contributorRole || (isAdmin ? 'Admin' : 'User'),
      verified: true,
      status: 'approved',
      sourceType: isAdmin ? 'admin_direct' : 'user_correction',
      inducedRuleId: savedRule.id,
    });

    // Step 5: Immediately activate in fast cache
    const sLang = (sourceLang || 'english') as Language;
    const tLang = (targetLang || 'brahui-arabic') as Language;
    const cacheKey = `${sLang}:${tLang}:${sourceText.trim().toLowerCase()}`;
    translationFastCache.set(cacheKey, {
      result: {
        sourceText: sourceText.trim(),
        sourceLang: sLang,
        targetLang: tLang,
        translatedText: correctedTranslation.trim(),
        alternativeScript: alternativeScript || '',
        confidence: 99,
        dialectVariants: [
          {
            dialect: formatDialectLabel(dialect),
            text: correctedTranslation.trim(),
            alternativeScript: alternativeScript || '',
          },
        ],
        rulesApplied: [{ id: savedRule.id, title: savedRule.title, category: savedRule.category }],
        consultedKnowledgeDocs: [],
        dictionaryMatches: [],
        paragraphCount: 1,
        wordCount: sourceText.trim().split(/\s+/).length,
      },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      requiresApproval: false,
      message: 'تصحیح موصول ہو گئی۔ ماڈل نے نیا اصول سیکھ لیا اور لغت فوراً اپ ڈیٹ ہو گئی۔ (Correction learned & Dynamic Dictionary updated)',
      inducedRule: savedRule,
      corpusEntry,
      syncedDictionaryTerms: savedDictEntries,
      syncedTermsCount: savedDictEntries.length,
      explanation: inductionResult.explanationText,
    });
  } catch (error: any) {
    console.error('Correction submission error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit correction' });
  }
});

// 2b. Sync User-Submitted Corrections & Active Learned Rules Across Environments
apiRouter.get('/rules/active', (_req: Request, res: Response) => {
  try {
    const rules = dbService.getGrammarRules().filter((r) => r.status !== 'deprecated');
    const corpus = dbService.getCorpus();
    res.json({
      success: true,
      rules,
      corpus,
      count: rules.length,
    });
  } catch (error: any) {
    console.error('Error fetching active rules:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch active rules' });
  }
});

apiRouter.post('/corrections/sync', (req: Request, res: Response) => {
  try {
    const { rules, corpus } = req.body;
    const clientRules = Array.isArray(rules) ? rules : [];
    const clientCorpus = Array.isArray(corpus) ? corpus : [];

    const syncResult = dbService.syncLearnedData(clientRules, clientCorpus);

    if (syncResult.addedRules > 0 || syncResult.addedCorpus > 0) {
      translationFastCache.clear();
    }

    const currentRules = dbService.getGrammarRules().filter((r) => r.status !== 'deprecated');
    const currentCorpus = dbService.getCorpus();

    res.json({
      success: true,
      message: `Data synced successfully. Added ${syncResult.addedRules} rules and ${syncResult.addedCorpus} corpus entries.`,
      addedRules: syncResult.addedRules,
      addedCorpus: syncResult.addedCorpus,
      synced: syncResult,
      rules: currentRules,
      activeRules: currentRules,
      corpus: currentCorpus,
      corpusCount: currentCorpus.length,
      rulesCount: currentRules.length,
    });
  } catch (error: any) {
    console.error('Data sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync data' });
  }
});

// 3. Admin Authentication Endpoints
apiRouter.post('/admin/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const creds = getAdminCredentials();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.trim() !== creds.username || password !== creds.password) {
      return res.status(401).json({ error: 'Invalid admin username or password' });
    }

    // Generate stateless cryptographically signed session token (persists across Vercel serverless lambdas)
    const token = createAdminToken(creds.username);

    res.json({
      success: true,
      token,
      admin: {
        username: creds.username,
        role: 'Administrator',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

apiRouter.get('/admin/verify', (req: Request, res: Response) => {
  const session = getAdminSession(req);

  if (!session) {
    return res.status(401).json({ authenticated: false, error: 'Session expired or invalid' });
  }

  res.json({
    authenticated: true,
    admin: {
      username: session.username,
      role: 'Administrator',
    },
  });
});

apiRouter.post('/admin/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    adminSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Update Admin Credentials (Username and Password) - Protected
apiRouter.put('/admin/credentials', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    const creds = getAdminCredentials();

    if (!currentPassword || !newUsername || !newPassword) {
      return res.status(400).json({ error: 'Current password, new username, and new password are required' });
    }

    if (currentPassword !== creds.password) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (newUsername.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    if (newPassword.length < 5) {
      return res.status(400).json({ error: 'Password must be at least 5 characters long' });
    }

    const updated = dbService.updateAdminCredentials(newUsername.trim(), newPassword);

    // Update active session username if this admin holds a session
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const session = adminSessions.get(token);
      if (session) {
        session.username = updated.username;
      }
    }

    res.json({
      success: true,
      message: 'Admin username and password successfully updated in persistent storage.',
      username: updated.username,
    });
  } catch (error: any) {
    console.error('Error updating admin credentials:', error);
    res.status(500).json({ error: error.message || 'Failed to update credentials' });
  }
});

// Public metrics endpoint for open badges (does not require login)
apiRouter.get('/public/stats', async (_req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const rules = dbService.getGrammarRules();
    const corpus = dbService.getCorpus();
    const docs = dbService.getKnowledgeDocs();
    res.json({
      rulesCount: rules.length,
      corpusCount: corpus.length,
      docsCount: docs.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Admin Daily Report Endpoint (Protected)
apiRouter.get('/admin/report', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const dateQuery = req.query.date as string | undefined;
    const report = dbService.getDailyReport(dateQuery);
    res.json(report);
  } catch (error: any) {
    console.error('Admin report error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate daily report' });
  }
});

// 5. Grammar Rules Management
// Public endpoint for active learned rules
apiRouter.get('/rules/active', async (_req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const rules = dbService.getActiveRules();
    res.json({ rules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/admin/rules', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const rules = dbService.getGrammarRules();
    res.json({ rules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Review Queue for PDF Extracted Rules & User Corrections (Protected)
apiRouter.get('/admin/review-queue', requireAdminAuth, (_req: Request, res: Response) => {
  try {
    const queue = dbService.getReviewQueue();
    res.json({
      ...queue,
      pendingCorpusEntries: queue.pendingCorpus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve a Grammar Rule from the Review Queue (Protected)
apiRouter.post('/admin/rules/:id/approve', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser || 'Admin';
    const approvedRule = dbService.approveRule(id, adminUser);
    if (!approvedRule) {
      return res.status(404).json({ error: 'Rule not found in database' });
    }
    // Clear in-memory translation fast cache so newly approved rule takes immediate global effect
    translationFastCache.clear();
    res.json({
      success: true,
      message: 'Grammar rule successfully approved and activated into Learned Rules!',
      rule: approvedRule,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject a Grammar Rule from the Review Queue (Protected)
apiRouter.post('/admin/rules/:id/reject', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rejectedRule = dbService.rejectRule(id);
    if (!rejectedRule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({
      success: true,
      message: 'Rule rejected and marked deprecated.',
      rule: rejectedRule,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve a Corpus / Vocabulary Entry from the Review Queue (Protected)
apiRouter.post('/admin/corpus/:id/approve', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approvedEntry = dbService.approveCorpusEntry(id);
    if (!approvedEntry) {
      return res.status(404).json({ error: 'Corpus entry not found' });
    }
    translationFastCache.clear();
    res.json({
      success: true,
      message: 'Corpus entry approved and permanently added to active translation memory!',
      entry: approvedEntry,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject a Corpus / Vocabulary Entry from the Review Queue (Protected)
apiRouter.post('/admin/corpus/:id/reject', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rejectedEntry = dbService.rejectCorpusEntry(id);
    if (!rejectedEntry) {
      return res.status(404).json({ error: 'Corpus entry not found' });
    }
    res.json({
      success: true,
      message: 'Corpus entry rejected.',
      entry: rejectedEntry,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/admin/rules/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, verifiedBy } = req.body;
    const updated = dbService.updateRuleStatus(id, status, verifiedBy);
    if (!updated) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({ success: true, rule: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Corpus Management (Protected)
apiRouter.get('/admin/corpus', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const corpus = dbService.getCorpus();
    res.json({ corpus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Download Entire Corpus & Grammar Rules (JSON) for Google Integration (Protected)
apiRouter.get('/admin/export', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const exportData = dbService.getCompleteCorpusExport();
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `brahui_corpus_grammar_rules_${dateStamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export corpus' });
  }
});

// 8. Download Corpus as TSV / CSV (Protected)
apiRouter.get('/admin/export-tsv', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const corpus = dbService.getCorpus();
    const headers = ['ID', 'Source_Lang', 'Source_Text', 'Target_Lang', 'Target_Text', 'Alt_Script', 'Dialect', 'Contributor', 'Verified', 'Created_At'];
    const rows = corpus.map(c => [
      c.id,
      c.sourceLang,
      `"${c.sourceText.replace(/"/g, '""')}"`,
      c.targetLang,
      `"${c.targetText.replace(/"/g, '""')}"`,
      `"${(c.alternativeScript || '').replace(/"/g, '""')}"`,
      c.dialect || 'Standard',
      c.contributorName,
      c.verified ? 'YES' : 'NO',
      c.createdAt
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="brahui_parallel_corpus.tsv"');
    res.send(tsvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Dynamic Language Management (Google Translate Catalog) ---

// Public fetch: returns global toggle status, active dynamic languages, and the Google Translate catalog
apiRouter.get('/languages', (req: Request, res: Response) => {
  try {
    const settings = dbService.getSystemSettings();
    res.json({
      allowDynamicLanguages: settings.allowDynamicLanguages,
      activeLanguages: settings.activeDynamicLanguages,
      catalog: GOOGLE_TRANSLATE_CATALOG
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin toggle global setting: allowDynamicLanguages
apiRouter.post('/admin/languages/settings', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { allowDynamicLanguages } = req.body;
    const settings = dbService.updateSystemSettings({ allowDynamicLanguages });
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add dynamic language from Google Translate catalog
apiRouter.post('/languages/add', (req: Request, res: Response) => {
  try {
    const settings = dbService.getSystemSettings();
    const session = getAdminSession(req);
    if (!session && !settings.allowDynamicLanguages) {
      return res.status(403).json({ error: 'Dynamic language addition is currently disabled by administrator.' });
    }

    const { code, label, native, dir } = req.body;
    if (!code || !label) {
      return res.status(400).json({ error: 'Language code and label are required.' });
    }

    const catalogMatch = GOOGLE_TRANSLATE_CATALOG.find(l => l.code === code);
    const newLang = {
      code,
      label: catalogMatch?.label || label,
      native: catalogMatch?.native || native || label,
      dir: catalogMatch?.dir || dir || 'ltr'
    };

    const result = dbService.addDynamicLanguage(newLang);
    res.json({ success: true, activeLanguages: result.languages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove dynamic language (Admin protected)
apiRouter.delete('/admin/languages/:code', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const result = dbService.removeDynamicLanguage(code);
    res.json({ success: true, activeLanguages: result.languages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Dataset Quality & Google Translate Readiness Exports ---

// Dataset Stats & Readiness Score
apiRouter.get('/admin/export/stats', (req: Request, res: Response) => {
  try {
    const stats = dbService.getDatasetStats();
    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Flores-200 / Machine Translation TSV Format
apiRouter.get('/admin/export/flores-tsv', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tsv = dbService.getFloresTsvExport();
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="flores200_brahui_corpus.tsv"');
    res.send(tsv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Google Translate AutoML JSON Format
apiRouter.get('/admin/export/google-mt-json', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const json = dbService.getGoogleMTJsonExport();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="google_translate_brahui_automl.json"');
    res.send(JSON.stringify(json, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Tatoeba-Compliant TSV Format
apiRouter.get('/admin/export/tatoeba-tsv', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tsv = dbService.getTatoebaTsvExport();
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tatoeba_brahui_pairs.tsv"');
    res.send(tsv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Grammar Rules TSV Format
apiRouter.get('/admin/export/rules-tsv', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tsv = dbService.getGrammarRulesTsvExport();
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="brahui_grammar_rules.tsv"');
    res.send(tsv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. PDF Knowledge Base & Dictionary Documents (Protected)
apiRouter.get('/knowledge/documents', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const docs = dbService.getKnowledgeDocs();
    res.json({ documents: docs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/knowledge/documents/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { id } = req.params;
    const doc = dbService.getKnowledgeDocs().find(d => d.id === id);
    const docTitle = doc?.title || id;

    const deleted = await dbService.deleteKnowledgeDoc(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found in knowledge base' });
    }

    const activeRulesCount = dbService.getGrammarRules().length;
    const activeDictCount = dbService.getDictionary().length;

    res.json({
      success: true,
      message: `Reference document "${docTitle}" removed from Knowledge Base. All learned rules (${activeRulesCount}) and dictionary terms (${activeDictCount}) remain intact and active in the system.`,
      docId: id,
      activeRulesCount,
      activeDictCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Safely extracts text and metadata from a PDF buffer using pdf-parse with timeout protection
 */
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const pdfModule: any = await import('pdf-parse');

    // pdf-parse v2+ exports { PDFParse } class
    if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        const parsePromise = parser.getText();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF parsing timed out')), 6000)
        );
        const parsed: any = await Promise.race([parsePromise, timeoutPromise]);
        const text = parsed?.text || '';
        const pageCount = parsed?.total || (parsed?.pages ? parsed.pages.length : 1);
        if (text && text.trim().length > 0) {
          return { text, pageCount };
        }
      } finally {
        try {
          await parser.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    }

    // Legacy pdf-parse v1 exports a direct function
    const parseFn = typeof pdfModule === 'function' ? pdfModule : pdfModule?.default;
    if (typeof parseFn === 'function') {
      const parsePromise = parseFn(buffer);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF parsing timed out')), 6000)
      );
      const parsed: any = await Promise.race([parsePromise, timeoutPromise]);
      const text = parsed?.text || '';
      if (text && text.trim().length > 0) {
        return { text, pageCount: parsed?.numpages || 1 };
      }
    }
  } catch (pdfErr) {
    console.warn('[PDF Extraction] pdf-parse error, falling back to raw buffer text extraction:', pdfErr);
  }

  // Graceful fallback: extract printable ASCII and Perso-Arabic unicode characters
  const fallbackText = buffer.toString('utf-8').replace(/[^\x20-\x7E\u0600-\u06FF\n]/g, ' ');
  return { text: fallbackText, pageCount: 1 };
}

// Upload and parse PDF dictionary / grammar book (Protected)
apiRouter.post('/knowledge/upload-pdf', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      console.error('Multer file upload error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File size exceeds limit (maximum allowed is 30MB).' });
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const file = req.file;
    const { title, type, manualText } = req.body;

    let extractedText = '';
    let pageCount = 1;

    if (file) {
      const extracted = await extractTextFromPdf(file.buffer);
      extractedText = extracted.text;
      pageCount = extracted.pageCount;
    } else if (manualText && manualText.trim()) {
      extractedText = manualText.trim();
    } else {
      return res.status(400).json({ error: 'No PDF file or text content provided' });
    }

    if (!extractedText.trim()) {
      extractedText = `Brahui reference document: ${title || 'Untitled Dictionary'}. Contains grammatical paradigms, lexical entries, and translation patterns.`;
    }

    // Split into chunks of ~1200 characters
    const cleanText = extractedText.replace(/\s+/g, ' ').trim();
    const chunkSize = 1200;
    const chunks: string[] = [];
    for (let i = 0; i < cleanText.length && chunks.length < 50; i += chunkSize) {
      chunks.push(cleanText.substring(i, i + chunkSize));
    }

    if (chunks.length === 0) {
      chunks.push(cleanText.slice(0, 1000));
    }

    const docTitle = title || (file ? file.originalname.replace(/\.[^/.]+$/, '') : 'Custom Brahui Dictionary');
    const summary = await summarizeUploadedDoc(docTitle, chunks[0]);

    const newDoc = dbService.addKnowledgeDoc({
      filename: file ? file.originalname : `${docTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      title: docTitle,
      fileSize: file ? file.size : Buffer.byteLength(extractedText, 'utf8'),
      type: (type as any) || 'dictionary',
      pageCount,
      chunksCount: chunks.length,
      sampleSummary: summary,
      chunks: chunks.slice(0, 30) // store up to 30 parsed chunks
    });

    // Actively extract rules, vocabulary, and grammar context from uploaded PDF
    const extraction = dbService.extractAndIngestRulesFromDoc(newDoc);

    res.json({
      success: true,
      message: `PDF knowledge document successfully ingested! Extracted ${extraction.extractedRulesCount} grammar rules and ${extraction.extractedVocabCount} vocabulary entries into global translation memory.`,
      document: newDoc,
      extraction,
      plainText: cleanText,
      pageCount,
      chunksCount: chunks.length,
    });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to ingest PDF document' });
  }
});

// Generate structured candidate rules from converted plain text (Protected)
apiRouter.post('/knowledge/generate-candidate-rules', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { text, title, docId, docType } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Plain text is required to generate candidate rules' });
    }

    let targetType = docType;
    if (!targetType && docId) {
      const existingDoc = dbService.getKnowledgeDocs().find(d => d.id === docId);
      if (existingDoc) targetType = existingDoc.type;
    }

    // Requirement 2: Strict Dictionary & Vocabulary Extraction Rules
    const isDictionary =
      targetType === 'dictionary' ||
      targetType === 'lexicon' ||
      /dictionary|lexicon|قاموس|لغت|vocabulary/i.test(title || '');

    if (isDictionary) {
      return res.json({
        success: true,
        candidateRules: [],
        totalCandidates: 0,
        isDictionaryMode: true,
        message: 'Strict Dictionary / Lexicon Rule: Only vocabulary terms and definitions are extracted from this document. General grammatical syntax rules are strictly excluded.',
      });
    }

    const candidateRules = await generateCandidateRulesFromText(
      title || 'Brahui Linguistic Reference',
      text.trim(),
      docId,
      targetType
    );

    res.json({
      success: true,
      candidateRules,
      totalCandidates: candidateRules.length,
      isDictionaryMode: false,
    });
  } catch (error: any) {
    console.error('Error generating candidate rules:', error);
    res.status(500).json({ error: error.message || 'Failed to generate candidate rules' });
  }
});

// Approve candidate rules into official Learned Rules in Firebase Cloud (Protected)
apiRouter.post('/knowledge/approve-rules', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { rules, docId, docTitle } = req.body;

    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ error: 'No candidate rules provided for approval' });
    }

    const approvedRules: any[] = [];
    for (const r of rules) {
      const savedRule = dbService.addGrammarRule({
        id: r.id && !r.id.startsWith('cand-') ? r.id : `rule-appr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: r.title,
        category: r.category || 'Syntax',
        pattern: r.pattern || 'Subject + Object + Finite Verb (SOV)',
        explanation: r.explanation || `Approved grammar rule from ${docTitle || 'PDF reference'}`,
        confidence: 98,
        status: 'verified',
        verifiedBy: 'Admin Approval',
        verifiedAt: new Date().toISOString(),
        sourceType: 'pdf_extraction',
        sourceDocId: docId || r.sourceDocId,
        sourceDocTitle: docTitle || r.sourceDocTitle,
        dialect: r.dialect || 'Standard',
        examples: Array.isArray(r.examples) && r.examples.length > 0 ? r.examples : [
          {
            correct: 'او کتاب ءِ خوانیک',
            incorrect: 'او خوانیک کتاب ءِ',
            englishGloss: 'He reads the book (SOV structure)',
          }
        ],
      });
      approvedRules.push(savedRule);
    }

    // If linked to a Knowledge Base document, format and update document's extractedRulesText
    if (docId) {
      const doc = dbService.getKnowledgeDocs().find(d => d.id === docId);
      if (doc) {
        const formattedNew = approvedRules.map((ar, idx) => {
          const exStr = ar.examples && ar.examples.length > 0
            ? ar.examples.map((ex: any) => `Example (Correct): ${ex.correct}\nExample (Incorrect): ${ex.incorrect}\nGloss: ${ex.englishGloss}`).join('\n')
            : '';
          return `### Rule ${idx + 1}: ${ar.title}\nCategory: ${ar.category}\nPattern: ${ar.pattern}\nExplanation: ${ar.explanation}\n${exStr}`;
        }).join('\n\n---\n\n');

        const existingText = doc.extractedRulesText || '';
        const combined = existingText.includes('### Rule')
          ? `${existingText}\n\n---\n\n${formattedNew}`
          : formattedNew;

        dbService.updateKnowledgeDoc(docId, { extractedRulesText: combined });
      }
    }

    res.json({
      success: true,
      message: `Successfully approved and added ${approvedRules.length} rule(s) to official Firebase Learned Rules!`,
      approvedCount: approvedRules.length,
      rules: approvedRules,
    });
  } catch (error: any) {
    console.error('Error approving rules:', error);
    res.status(500).json({ error: error.message || 'Failed to approve rules' });
  }
});

// Fetch plain text and full metadata for a Knowledge Base document (Protected)
apiRouter.get('/knowledge/documents/:id/plain-text', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { id } = req.params;
    const doc = dbService.getKnowledgeDocs().find(d => d.id === id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const plainText = doc.chunks && doc.chunks.length > 0
      ? doc.chunks.join('\n\n')
      : (doc.sampleSummary || 'No text extracted for this document.');

    res.json({
      success: true,
      docId: doc.id,
      title: doc.title,
      filename: doc.filename,
      pageCount: doc.pageCount || 1,
      chunksCount: doc.chunksCount || doc.chunks?.length || 0,
      plainText,
      extractedRulesText: doc.extractedRulesText || '',
    });
  } catch (error: any) {
    console.error('Error fetching document plain text:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch plain text' });
  }
});

// Trigger extraction of grammar rules & vocabulary from an existing Knowledge Base document (Protected)
apiRouter.post('/knowledge/extract-rules/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { id } = req.params;
    const docs = dbService.getKnowledgeDocs();
    const doc = docs.find((d) => d.id === id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found in knowledge base' });
    }

    const extraction = dbService.extractAndIngestRulesFromDoc(doc);
    res.json({
      success: true,
      message: `Extracted ${extraction.extractedRulesCount} new grammar rules and ${extraction.extractedVocabCount} vocabulary entries from "${doc.title}".`,
      extraction,
    });
  } catch (error: any) {
    console.error('Error extracting rules from document:', error);
    res.status(500).json({ error: error.message || 'Failed to extract rules from document' });
  }
});

// Fetch extracted rules text and chunks for a Knowledge Base document (Protected)
apiRouter.get('/knowledge/documents/:id/rules', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { id } = req.params;
    const doc = dbService.getKnowledgeDocs().find((d) => d.id === id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const rulesText = dbService.getDocExtractedRulesText(doc);
    res.json({
      success: true,
      docId: id,
      rulesText,
      title: doc.title,
      filename: doc.filename,
      fileSize: doc.fileSize,
      pageCount: doc.pageCount,
      chunksCount: doc.chunksCount || doc.chunks?.length || 0,
      sampleSummary: doc.sampleSummary,
      chunks: doc.chunks || [],
      type: doc.type,
      uploadedAt: doc.uploadedAt,
    });
  } catch (error: any) {
    console.error('Error fetching document rules:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch rules text' });
  }
});

// Update Knowledge Base document extracted rules text and semantic chunks, sync into rules catalog & Firebase (Protected)
apiRouter.put('/knowledge/documents/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { id } = req.params;
    const { extractedRulesText, title, sampleSummary, chunks } = req.body;
    const updated = dbService.updateKnowledgeDoc(id, {
      ...(typeof extractedRulesText === 'string' ? { extractedRulesText } : {}),
      ...(title ? { title } : {}),
      ...(sampleSummary ? { sampleSummary } : {}),
      ...(Array.isArray(chunks) ? { chunks, chunksCount: chunks.length } : {}),
    });

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let syncResult = { added: 0, updated: 0 };
    if (typeof extractedRulesText === 'string') {
      syncResult = dbService.syncRulesFromExtractedText(updated);
    }

    res.json({
      success: true,
      document: updated,
      message: `Extracted rules updated and synced (${syncResult.added} new rules, ${syncResult.updated} updated).`,
      syncResult,
    });
  } catch (error: any) {
    console.error('Error updating knowledge document rules:', error);
    res.status(500).json({ error: error.message || 'Failed to update document rules' });
  }
});

// ========================================================
// DICTIONARY & VOCABULARY ENDPOINTS (Requirements 3 & 4)
// ========================================================

// 1. Get complete dynamic dictionary with filtering and stats
apiRouter.get('/dictionary', async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    let entries = dbService.getDictionary();
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const pos = ((req.query.pos as string) || '').trim().toLowerCase();
    const dialect = ((req.query.dialect as string) || '').trim().toLowerCase();

    if (q) {
      entries = entries.filter(e =>
        e.term.toLowerCase().includes(q) ||
        (e.pronunciation && e.pronunciation.toLowerCase().includes(q)) ||
        (e.latinTerm && e.latinTerm.toLowerCase().includes(q)) ||
        e.meaning.toLowerCase().includes(q) ||
        (e.englishMeaning && e.englishMeaning.toLowerCase().includes(q)) ||
        (e.urduMeaning && e.urduMeaning.toLowerCase().includes(q))
      );
    }

    if (pos && pos !== 'all') {
      entries = entries.filter(e => (e.partOfSpeech || '').toLowerCase() === pos);
    }

    if (dialect && dialect !== 'all') {
      entries = entries.filter(e => (e.dialect || '').toLowerCase().includes(dialect));
    }

    const all = dbService.getDictionary();
    const stats = {
      totalTerms: all.length,
      verifiedCount: all.filter(e => e.verified).length,
      pdfExtractedCount: all.filter(e => e.sourceType === 'pdf_extraction').length,
      userCorrectionCount: all.filter(e => e.sourceType === 'user_correction').length,
      dialectsCovered: Array.from(new Set(all.map(e => e.dialect || 'Standard'))),
    };

    res.json({
      success: true,
      total: entries.length,
      entries,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching dictionary:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dictionary' });
  }
});

// 2. Export complete synchronized dictionary to Excel (.xlsx or .csv) (Requirement 4)
apiRouter.get('/dictionary/export', async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const format = ((req.query.format as string) || 'xlsx').toLowerCase();
    const entries = dbService.getDictionary();
    const dateStr = new Date().toISOString().split('T')[0];

    const exportRows = entries.map((entry, index) => ({
      'Record #': index + 1,
      'Term ID': entry.id,
      'Brahui Term (Perso-Arabic)': entry.term,
      'Pronunciation / Latin Transliteration': entry.pronunciation || entry.latinTerm || '',
      'Roman / Latin Script': entry.latinTerm || entry.pronunciation || '',
      'Primary Meaning': entry.meaning,
      'English Meaning': entry.englishMeaning || entry.meaning,
      'Urdu Meaning (اردو معنی)': entry.urduMeaning || '',
      'Part of Speech': entry.partOfSpeech || 'Noun',
      'Dialect': entry.dialect || 'Standard',
      'Source Reference / Document': entry.sourceDocTitle || 'Brahui Linguistic System',
      'Source Type': entry.sourceType || 'initial_seed',
      'Verification Status': entry.verified ? 'Verified' : 'Pending',
      'Date Added': entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : dateStr,
    }));

    if (format === 'csv') {
      // Excel-compatible CSV with UTF-8 BOM
      const headers = Object.keys(exportRows[0] || {
        'Record #': 1,
        'Term ID': '',
        'Brahui Term (Perso-Arabic)': '',
        'Roman / Latin Script': '',
        'Primary Meaning': '',
        'English Meaning': '',
        'Urdu Meaning (اردو معنی)': '',
        'Part of Speech': '',
        'Dialect': '',
        'Source Reference / Document': '',
        'Source Type': '',
        'Verification Status': '',
        'Date Added': '',
      });

      const csvLines = [
        headers.join(','),
        ...exportRows.map(row =>
          headers.map(h => {
            const val = String((row as any)[h] || '').replace(/"/g, '""');
            return `"${val}"`;
          }).join(',')
        )
      ];

      const csvContent = '\uFEFF' + csvLines.join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Brahui_Dictionary_Synchronized_${dateStr}.csv"`);
      return res.send(csvContent);
    }

    // Default: native Microsoft Excel .xlsx export
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 10 }, // Record #
      { wch: 18 }, // Term ID
      { wch: 22 }, // Brahui Term
      { wch: 22 }, // Roman Latin
      { wch: 32 }, // Primary Meaning
      { wch: 28 }, // English Meaning
      { wch: 26 }, // Urdu Meaning
      { wch: 16 }, // POS
      { wch: 14 }, // Dialect
      { wch: 36 }, // Source Reference
      { wch: 18 }, // Source Type
      { wch: 14 }, // Status
      { wch: 15 }, // Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Brahui Vocabulary');

    // Add Metadata sheet
    const metaRows = [
      { 'Property': 'Dataset Name', 'Value': 'Brahui Synchronized Dynamic Vocabulary Database' },
      { 'Property': 'Export Date', 'Value': new Date().toISOString() },
      { 'Property': 'Total Vocabulary Entries', 'Value': entries.length },
      { 'Property': 'Verified Terms', 'Value': entries.filter(e => e.verified).length },
      { 'Property': 'Standard Encoding', 'Value': 'UTF-8 Unicode (Perso-Arabic Nastaliq / Latin Brolikwar)' },
      { 'Property': 'System', 'Value': 'Brahui AI Translation & Active Self-Learning System' },
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metaRows);
    metaSheet['!cols'] = [{ wch: 28 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Dataset Metadata');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Brahui_Dictionary_Synchronized_${dateStr}.xlsx"`);
    return res.send(excelBuffer);
  } catch (error: any) {
    console.error('Error exporting dictionary:', error);
    res.status(500).json({ error: error.message || 'Failed to export dictionary' });
  }
});

// Export Morphological and Postpositional Grammar Rules to Excel (.xlsx) (Tri-Export System - Requirement 3)
const handleGrammarRulesExport = async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const format = ((req.query.format as string) || 'xlsx').toLowerCase();
    const allRules = dbService.getGrammarRules();
    // Filter for morphological, postpositional, affix, orthographic, and inflectional rules (non-syntax)
    const grammarRules = allRules.filter(r => r.category !== 'Syntax');
    const dateStr = new Date().toISOString().split('T')[0];

    const exportRows = grammarRules.map((rule, index) => {
      const ex = rule.examples && rule.examples.length > 0 ? rule.examples[0] : null;
      return {
        'Rule #': index + 1,
        'Rule ID': rule.id,
        'Rule Title': rule.title,
        'Linguistic Category': rule.category || 'Morphology',
        'Morphological Pattern / Formula': rule.pattern || '',
        'Grammar Rule Explanation': rule.explanation || '',
        'Correct Inflection (Brahui Perso-Arabic)': ex ? ex.correct : '',
        'Incorrect Contrast (Ungrammatical)': ex ? ex.incorrect : '',
        'English Gloss & Meaning': ex ? ex.englishGloss : '',
        'Dialect': rule.dialect || 'Standard',
        'Confidence Score (%)': rule.confidence || 98,
        'Verification Status': rule.status || 'verified',
        'Verified By': rule.verifiedBy || 'Linguistic Board',
        'Source Origin': rule.sourceDocTitle || rule.sourceType || 'Brahui Linguistic Reference',
        'Date Added': rule.verifiedAt ? new Date(rule.verifiedAt).toLocaleDateString() : dateStr,
      };
    });

    if (format === 'csv') {
      const headers = Object.keys(exportRows[0] || { 'Rule #': 1, 'Rule Title': '' });
      const csvLines = [
        headers.join(','),
        ...exportRows.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','))
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Brahui_Grammar_Rules_Morphology_${dateStr}.csv"`);
      return res.send('\uFEFF' + csvLines.join('\r\n'));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 8 },  // Rule #
      { wch: 18 }, // Rule ID
      { wch: 34 }, // Title
      { wch: 18 }, // Category
      { wch: 30 }, // Pattern
      { wch: 45 }, // Explanation
      { wch: 26 }, // Correct
      { wch: 26 }, // Incorrect
      { wch: 32 }, // Gloss
      { wch: 14 }, // Dialect
      { wch: 12 }, // Confidence
      { wch: 14 }, // Status
      { wch: 22 }, // Verified By
      { wch: 30 }, // Source
      { wch: 14 }, // Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grammar Rules (Morphology)');

    const metaRows = [
      { 'Property': 'Dataset Name', 'Value': 'Brahui Morphological & Postpositional Grammar Rules' },
      { 'Property': 'Export Date', 'Value': new Date().toISOString() },
      { 'Property': 'Total Rules', 'Value': grammarRules.length },
      { 'Property': 'Domain', 'Value': 'Dravidian Brahui Morphology, Case Affixes & Suffixal Paradigms' },
      { 'Property': 'Target Corpus Standards', 'Value': 'Google Translate & Multi-lingual MT Induction' },
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metaRows);
    metaSheet['!cols'] = [{ wch: 26 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Dataset Metadata');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Brahui_Grammar_Rules_Morphology_${dateStr}.xlsx"`);
    return res.send(excelBuffer);
  } catch (error: any) {
    console.error('Error exporting grammar rules:', error);
    res.status(500).json({ error: error.message || 'Failed to export grammar rules' });
  }
};

apiRouter.get('/grammar/export', handleGrammarRulesExport);
apiRouter.get('/admin/export/grammar-rules-excel', handleGrammarRulesExport);

// Export Sentence Structural Syntax Patterns & SOV Concord to Excel (.xlsx) (Tri-Export System - Requirement 3)
const handleSyntaxPatternsExport = async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const format = ((req.query.format as string) || 'xlsx').toLowerCase();
    const allRules = dbService.getGrammarRules();
    // Filter for Syntax category, SOV alignments, clause ordering, and verb-final structures
    const syntaxRules = allRules.filter(r => r.category === 'Syntax' || /sov|word order|clause|verb[- ]final/i.test(r.title + ' ' + r.pattern));
    const dateStr = new Date().toISOString().split('T')[0];

    const exportRows = syntaxRules.map((pattern, index) => {
      const ex = pattern.examples && pattern.examples.length > 0 ? pattern.examples[0] : null;
      return {
        'Pattern #': index + 1,
        'Pattern ID': pattern.id,
        'Syntax Rule Title': pattern.title,
        'Structural Alignment': 'Strict Dravidian SOV (Subject + Object + Finite Verb)',
        'Syntactic Formula Pattern': pattern.pattern || 'Subject + Object/Complement + Final Verb',
        'Detailed Clause Ordering & Rule': pattern.explanation || '',
        'Canonical Sentence (Brahui Perso-Arabic)': ex ? ex.correct : '',
        'Contrastive Ungrammatical Order (SVO)': ex ? ex.incorrect : '',
        'English Translation & Syntactic Gloss': ex ? ex.englishGloss : '',
        'Dialect Concord': pattern.dialect || 'Standard',
        'Confidence Score (%)': pattern.confidence || 99,
        'Verification Status': pattern.status || 'verified',
        'Verified By': pattern.verifiedBy || 'Linguistic Board',
        'Source Origin': pattern.sourceDocTitle || pattern.sourceType || 'Brahui Syntactic Grammar',
        'Date Added': pattern.verifiedAt ? new Date(pattern.verifiedAt).toLocaleDateString() : dateStr,
      };
    });

    if (format === 'csv') {
      const headers = Object.keys(exportRows[0] || { 'Pattern #': 1, 'Syntax Rule Title': '' });
      const csvLines = [
        headers.join(','),
        ...exportRows.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','))
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Brahui_Syntax_Patterns_SOV_${dateStr}.csv"`);
      return res.send('\uFEFF' + csvLines.join('\r\n'));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 10 }, // Pattern #
      { wch: 18 }, // Pattern ID
      { wch: 36 }, // Title
      { wch: 38 }, // Structural Alignment
      { wch: 36 }, // Syntactic Formula
      { wch: 48 }, // Detailed Clause Ordering
      { wch: 28 }, // Canonical Brahui
      { wch: 28 }, // Contrastive SVO
      { wch: 34 }, // Gloss
      { wch: 14 }, // Dialect
      { wch: 12 }, // Confidence
      { wch: 14 }, // Status
      { wch: 22 }, // Verified By
      { wch: 30 }, // Source
      { wch: 14 }, // Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Syntax Patterns (SOV Concord)');

    const metaRows = [
      { 'Property': 'Dataset Name', 'Value': 'Brahui Syntactic Patterns & Clause Structural Alignments' },
      { 'Property': 'Export Date', 'Value': new Date().toISOString() },
      { 'Property': 'Total Syntax Patterns', 'Value': syntaxRules.length },
      { 'Property': 'Linguistic Typology', 'Value': 'Strict Dravidian SOV (Subject - Object - Verb) Word Order' },
      { 'Property': 'Target Systems', 'Value': 'High-Speed Two-Step Translation Engine & MT Fine-Tuning' },
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metaRows);
    metaSheet['!cols'] = [{ wch: 26 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Dataset Metadata');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Brahui_Syntax_Patterns_SOV_${dateStr}.xlsx"`);
    return res.send(excelBuffer);
  } catch (error: any) {
    console.error('Error exporting syntax patterns:', error);
    res.status(500).json({ error: error.message || 'Failed to export syntax patterns' });
  }
};

apiRouter.get('/syntax/export', handleSyntaxPatternsExport);
apiRouter.get('/admin/export/syntax-patterns-excel', handleSyntaxPatternsExport);

// Admin Bulk Dictionary Input (Copy-Paste Option) (Requirement 4)
const handleBulkAddDictionary = async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { bulkText, dialect } = req.body;
    if (!bulkText || typeof bulkText !== 'string' || !bulkText.trim()) {
      return res.status(400).json({ error: 'bulkText is required' });
    }

    const session = getAdminSession(req);
    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
    const addedEntries: any[] = [];
    let skippedCount = 0;

    for (const rawLine of lines) {
      let line = rawLine;
      let explicitLatin: string | undefined = undefined;
      let explicitUrdu: string | undefined = undefined;
      let explicitPos: string | undefined = undefined;

      // Extract optional metadata in parentheses: (Latin: ...), (Urdu: ...), (POS: ...)
      const latinMatch = line.match(/\((?:Latin|Roman):\s*([^)]+)\)/i);
      if (latinMatch) {
        explicitLatin = latinMatch[1].trim();
        line = line.replace(latinMatch[0], '').trim();
      }
      const urduMatch = line.match(/\((?:Urdu|اردو):\s*([^)]+)\)/i);
      if (urduMatch) {
        explicitUrdu = urduMatch[1].trim();
        line = line.replace(urduMatch[0], '').trim();
      }
      const posMatch = line.match(/\((?:POS|Part of Speech):\s*([^)]+)\)/i);
      if (posMatch) {
        explicitPos = posMatch[1].trim();
        line = line.replace(posMatch[0], '').trim();
      }

      // Split line into distinct parts:
      // Handles:
      // "Tark = ترک = Abandonment"
      // "Tark \t ترک \t Abandonment \t چھوڑنا"
      // "Tark | ترک | Abandonment"
      // "Tark - ترک - Abandonment"
      // "ترک = Abandonment"
      let rawParts: string[] = [];
      if (line.includes('\t')) {
        rawParts = line.split('\t');
      } else if (line.includes('|')) {
        rawParts = line.split('|');
      } else if (line.includes('=')) {
        rawParts = line.split('=');
      } else if (line.includes('::')) {
        rawParts = line.split('::');
      } else if (/\s+-\s+/.test(line)) {
        rawParts = line.split(/\s+-\s+/);
      } else if (line.includes(',')) {
        rawParts = line.split(',');
      } else {
        const spaceParts = line.split(/\s+/);
        if (spaceParts.length === 2) {
          rawParts = spaceParts;
        } else {
          skippedCount++;
          continue;
        }
      }

      const cleanParts = rawParts
        .map(p => p.replace(/^["'«»“]+|["'«»”]+$/g, '').replace(/[.?!۔؟;:،,]+$/, '').trim())
        .filter(Boolean);

      if (cleanParts.length < 2) {
        skippedCount++;
        continue;
      }

      let term = '';
      let latinTerm = explicitLatin;
      let meaning = '';
      let englishMeaning = '';
      let urduMeaning = explicitUrdu;

      const arabicParts = cleanParts.filter(p => /[\u0600-\u06FF]/.test(p));
      const nonArabicParts = cleanParts.filter(p => !/[\u0600-\u06FF]/.test(p));

      if (cleanParts.length >= 3 && arabicParts.length === 1 && nonArabicParts.length >= 2) {
        // e.g. "Tark = ترک = Abandonment" or "ترک = Tark = Abandonment"
        term = arabicParts[0]; // "ترک"
        // Decide which non-Arabic part is Latin transliteration vs English definition:
        // Transliteration is shorter and closer to Brahui phonetics; definition is typically longer
        const sorted = [...nonArabicParts].sort((a, b) => a.length - b.length);
        latinTerm = latinTerm || sorted[0]; // e.g. "Tark"
        englishMeaning = sorted.slice(1).join(' / '); // e.g. "Abandonment"
        meaning = englishMeaning;
      } else if (cleanParts.length >= 3 && arabicParts.length >= 2 && nonArabicParts.length >= 1) {
        // e.g. "ترک = چھوڑنا = Abandonment"
        term = arabicParts[0];
        urduMeaning = urduMeaning || arabicParts[1];
        englishMeaning = nonArabicParts.join(' / ');
        meaning = englishMeaning;
      } else if (cleanParts.length >= 4) {
        // e.g. "Tark \t ترک \t Abandonment \t چھوڑنا"
        if (arabicParts.length >= 1) term = arabicParts[0];
        if (arabicParts.length >= 2) urduMeaning = urduMeaning || arabicParts[1];
        if (nonArabicParts.length >= 1) latinTerm = latinTerm || nonArabicParts[0];
        if (nonArabicParts.length >= 2) {
          englishMeaning = nonArabicParts.slice(1).join(' / ');
          meaning = englishMeaning;
        }
      } else {
        // Exactly 2 parts:
        const p1 = cleanParts[0];
        const p2 = cleanParts[1];
        const p1IsArabic = /[\u0600-\u06FF]/.test(p1);
        const p2IsArabic = /[\u0600-\u06FF]/.test(p2);

        if (p1IsArabic && !p2IsArabic) {
          term = p1;
          meaning = p2;
          englishMeaning = p2;
        } else if (!p1IsArabic && p2IsArabic) {
          term = p2;
          meaning = p1;
          englishMeaning = p1;
          latinTerm = latinTerm || p1;
        } else if (p1IsArabic && p2IsArabic) {
          term = p1;
          urduMeaning = urduMeaning || p2;
          meaning = p2;
        } else {
          // Both non-Arabic:
          latinTerm = latinTerm || p1;
          term = p1;
          meaning = p2;
          englishMeaning = p2;
        }
      }

      // Final sanitization of fields:
      term = term.replace(/^["'«»“]+|["'«»”]+$/g, '').replace(/[.?!۔؟;:،,]+$/, '').trim();
      meaning = meaning.replace(/^["'«»“]+|["'«»”]+$/g, '').replace(/[.?!۔؟;:،,]+$/, '').trim();
      if (latinTerm) latinTerm = latinTerm.replace(/^["'«»“]+|["'«»”]+$/g, '').replace(/[.?!۔؟;:،,]+$/, '').trim();
      if (urduMeaning) urduMeaning = urduMeaning.replace(/^["'«»“]+|["'«»”]+$/g, '').replace(/[.?!۔؟;:،,]+$/, '').trim();
      if (englishMeaning) englishMeaning = englishMeaning.replace(/^["'«»“]+|["'«»”]+$/g, '').replace(/[.?!۔؟;:،,]+$/, '').trim();

      if (!term || !meaning) {
        skippedCount++;
        continue;
      }

      // Strict single-word lexicon guard:
      const termWords = term.split(/\s+/).filter(Boolean).length;
      if (termWords > 2 || /[.?!۔؟]/.test(term)) {
        skippedCount++;
        continue;
      }

      // Automated POS Determination (Requirement 3):
      const autoPos = determinePartOfSpeech({
        term,
        latinTerm,
        meaning,
        englishMeaning,
        urduMeaning,
      });
      const pos = explicitPos || autoPos;

      const saved = dbService.addDictionaryEntry({
        term,
        latinTerm,
        meaning,
        englishMeaning: englishMeaning || meaning,
        urduMeaning,
        partOfSpeech: pos,
        dialect: dialect || 'Standard',
        sourceType: 'admin_direct',
        sourceDocTitle: `Admin Bulk Input (${session?.username || 'Admin'})`,
        verified: true,
      });

      if (saved) {
        addedEntries.push(saved);
      } else {
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${lines.length} lines. Populated ${addedEntries.length} single-word vocabulary entries into Dictionary (${skippedCount} skipped).`,
      addedCount: addedEntries.length,
      skippedCount,
      entries: addedEntries,
    });
  } catch (error: any) {
    console.error('Error in bulk dictionary input:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk add dictionary words' });
  }
};

apiRouter.post('/dictionary/bulk-add', handleBulkAddDictionary);
apiRouter.post('/admin/dictionary/bulk', handleBulkAddDictionary);

// Bulk delete dictionary entries (Protected - Requirement 4)
const handleBulkDeleteDictionary = async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { ids, deleteAll } = req.body;

    if (deleteAll) {
      const deletedCount = dbService.clearAllDictionaryEntries();
      return res.json({
        success: true,
        message: `Successfully cleared all ${deletedCount} dictionary entries.`,
        deletedCount,
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required when deleteAll is not specified' });
    }

    const deletedCount = dbService.deleteDictionaryEntries(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} dictionary entries.`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('Error in bulk delete dictionary:', error);
    res.status(500).json({ error: error.message || 'Failed to delete dictionary entries' });
  }
};

apiRouter.post('/dictionary/bulk-delete', requireAdminAuth, handleBulkDeleteDictionary);
apiRouter.post('/admin/dictionary/bulk-delete', requireAdminAuth, handleBulkDeleteDictionary);

// 2.5 Admin Batch / Multi-Word Edit (Commits all changes to Firestore in a single atomic operation)
const handleBatchUpdateDictionary = async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array is required' });
    }

    const result = await dbService.batchUpdateDictionaryEntries(updates);
    res.json({
      success: true,
      message: `Successfully saved and committed ${result.updatedCount} dictionary entries to Firebase Firestore in a single operation.`,
      updatedCount: result.updatedCount,
      entries: result.entries,
    });
  } catch (error: any) {
    console.error('Error in batch update dictionary:', error);
    res.status(500).json({ error: error.message || 'Failed to batch update dictionary entries' });
  }
};

apiRouter.post('/dictionary/batch-update', requireAdminAuth, handleBatchUpdateDictionary);
apiRouter.post('/admin/dictionary/batch-update', requireAdminAuth, handleBatchUpdateDictionary);

// 2.8 Single Dictionary Entry Real-Time Correction & State Update (Protected)
const handleUpdateSingleDictionaryEntry = async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { id } = req.params;
    const { term, pronunciation, latinTerm, meaning, englishMeaning, urduMeaning, partOfSpeech, dialect } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    const updated = dbService.updateDictionaryEntry(id, {
      term,
      pronunciation: pronunciation || latinTerm,
      latinTerm: latinTerm || pronunciation,
      meaning,
      englishMeaning: englishMeaning || meaning,
      urduMeaning,
      partOfSpeech,
      dialect,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Dictionary entry not found' });
    }

    res.json({
      success: true,
      message: `Term "${updated.term}" successfully updated in Firebase Firestore (attalibrary-1761f)!`,
      entry: updated,
    });
  } catch (error: any) {
    console.error('Error updating dictionary entry:', error);
    res.status(500).json({ error: error.message || 'Failed to update dictionary entry' });
  }
};

apiRouter.put('/dictionary/:id', requireAdminAuth, handleUpdateSingleDictionaryEntry);
apiRouter.put('/admin/dictionary/:id', requireAdminAuth, handleUpdateSingleDictionaryEntry);

// 3. Admin create or update dictionary entry (Protected)
apiRouter.post('/dictionary', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { term, latinTerm, meaning, englishMeaning, urduMeaning, partOfSpeech, dialect } = req.body;
    if (!term || !meaning) {
      return res.status(400).json({ error: 'term and meaning are required' });
    }

    const session = getAdminSession(req);
    const saved = dbService.addDictionaryEntry({
      term: term.trim(),
      latinTerm: latinTerm?.trim(),
      meaning: meaning.trim(),
      englishMeaning: englishMeaning?.trim(),
      urduMeaning: urduMeaning?.trim(),
      partOfSpeech: partOfSpeech?.trim() || 'Noun',
      dialect: dialect?.trim() || 'Standard',
      sourceType: 'admin_direct',
      sourceDocTitle: `Admin Entry (${session?.username || 'Admin'})`,
      verified: true,
    });

    res.json({
      success: true,
      message: 'Dictionary entry successfully saved and synchronized!',
      entry: saved,
    });
  } catch (error: any) {
    console.error('Error creating dictionary entry:', error);
    res.status(500).json({ error: error.message || 'Failed to create dictionary entry' });
  }
});

// 4. Admin delete dictionary entry (Protected)
const handleDeleteSingleDictionaryEntry = async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Dictionary entry ID is required' });
    }
    const deleted = dbService.deleteDictionaryEntry(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Dictionary entry not found' });
    }
    res.json({
      success: true,
      message: 'Dictionary entry deleted successfully from database and Firestore (attalibrary-1761f).',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting dictionary entry:', error);
    res.status(500).json({ error: error.message || 'Failed to delete dictionary entry' });
  }
};

apiRouter.delete('/dictionary/:id', requireAdminAuth, handleDeleteSingleDictionaryEntry);
apiRouter.delete('/admin/dictionary/:id', requireAdminAuth, handleDeleteSingleDictionaryEntry);

// 4.5 Admin one-time dictionary deduplication routine
apiRouter.post('/admin/dictionary/deduplicate', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await dbService.ensureFirestoreSynced();
    const purgedCount = dbService.deduplicateDictionary();
    const currentCount = dbService.getDictionary().length;
    res.json({
      success: true,
      message: `Deduplication complete: Purged ${purgedCount} duplicate entries. Dictionary now contains ${currentCount} clean, unique terms.`,
      purgedCount,
      totalCount: currentCount,
    });
  } catch (error: any) {
    console.error('Error running dictionary deduplication:', error);
    res.status(500).json({ error: error.message || 'Failed to deduplicate dictionary' });
  }
});

// Centralized API error handling middleware (always returns JSON, never HTML 500)
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error Handler]:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds limit (maximum allowed is 30MB).' });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
};

apiRouter.use(errorHandler);
apiApp.use(errorHandler);
