import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { dbService, GOOGLE_TRANSLATE_CATALOG } from './db.js';
import { translateText, induceGrammarRule, summarizeUploadedDoc, sanitizeBrahuiOutput } from './gemini.js';
import { dynamicTranslateSentence } from './dynamicTranslator.js';
import { Language } from '../src/types/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

export const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '30mb' }));
apiRouter.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Admin session store: token -> { username, createdAt, expiresAt }
const adminSessions = new Map<string, { username: string; createdAt: number; expiresAt: number }>();
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

const getAdminCredentials = () => dbService.getAdminCredentials();

export function getAdminSession(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  const session = adminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) return null;
  return session;
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

// Helper to format Urdu dialect name
export function formatDialectLabel(dialect?: string): string {
  if (!dialect) return 'عام';
  const trimmed = dialect.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('sarawani') || trimmed.includes('ساراوانی')) return 'ساراوانی';
  if (lower.includes('jhalawani') || trimmed.includes('جالاوانی')) return 'جالاوانی';
  if (lower.includes('rakhshani') || trimmed.includes('رخشانی')) return 'رخشانی';
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

    const sLang = (sourceLang || 'english') as Language;
    const tLang = (targetLang || 'brahui-arabic') as Language;
    const cleanText = sourceText.trim();
    const cacheKey = `${sLang}:${tLang}:${cleanText.toLowerCase()}`;

    // Priority 1: Check fast in-memory cache for recent identical requests
    const cached = translationFastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return res.json(cached.result);
    }

    // Priority 2: Check persistent database corpus for exact verified corrections
    const corpus = dbService.getCorpus();
    const matchingEntries = corpus.filter(
      (c) =>
        c.verified &&
        c.status !== 'rejected' &&
        c.sourceText.trim().toLowerCase() === cleanText.toLowerCase() &&
        c.sourceLang === sLang &&
        c.targetLang === tLang
    );

    if (matchingEntries.length > 0) {
      if (matchingEntries.length > 1) {
        // Requirement 5: Multiple dialect variants exist - display each followed by dialect name in brackets
        const dialectVariants = matchingEntries.map(e => ({
          dialect: formatDialectLabel(e.dialect),
          text: e.targetText,
          alternativeScript: e.alternativeScript
        }));

        const formattedTranslations = dialectVariants
          .map(v => `${v.text} (${v.dialect})`)
          .join('\n');

        const multiResult = {
          sourceText: cleanText,
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

      const correctionResult = {
        sourceText: cleanText,
        sourceLang: sLang,
        targetLang: tLang,
        translatedText: isSpecificDialect ? `${exactCorrection.targetText} (${dialectLabel})` : exactCorrection.targetText,
        alternativeScript: exactCorrection.alternativeScript || '',
        confidence: 99,
        dialectVariants: [
          {
            dialect: dialectLabel,
            text: exactCorrection.targetText,
            alternativeScript: exactCorrection.alternativeScript
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

    // Ensure zero foreign token leakage and script normalization
    result.translatedText = sanitizeBrahuiOutput(result.translatedText, tLang, sLang);
    if (result.alternativeScript) {
      result.alternativeScript = sanitizeBrahuiOutput(
        result.alternativeScript,
        tLang === 'brahui-arabic' ? 'brahui-latin' : 'brahui-arabic',
        sLang
      );
    }

    // If multi-dialect variants are returned, ensure bracketed dialect labels are present in translatedText
    if (result.dialectVariants && result.dialectVariants.length > 1) {
      const hasBrackets = result.translatedText.includes('(') && result.translatedText.includes(')');
      if (!hasBrackets) {
        result.translatedText = result.dialectVariants
          .map(v => `${v.text} (${formatDialectLabel(v.dialect)})`)
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
      const fallbackResult = dynamicTranslateSentence(req.body?.sourceText || '', sLang, tLang);
      fallbackResult.translatedText = sanitizeBrahuiOutput(fallbackResult.translatedText, tLang, sLang);
      if (fallbackResult.alternativeScript) {
        fallbackResult.alternativeScript = sanitizeBrahuiOutput(
          fallbackResult.alternativeScript,
          tLang === 'brahui-arabic' ? 'brahui-latin' : 'brahui-arabic',
          sLang
        );
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

    // Step 1: Run AI Grammar & Rule Induction
    const inductionResult = await induceGrammarRule({
      sourceText,
      sourceLang: sourceLang || 'english',
      targetLang: targetLang || 'brahui-arabic',
      initialTranslation: initialTranslation || '',
      correctedTranslation: correctedTranslation.trim(),
      userNotes,
      dialect: dialect || 'Standard'
    });

    // Step 2: Save Induced Rule into Database
    // User-submitted corrections immediately become active Learned Rules (Requirement 1)
    const savedRule = dbService.addGrammarRule({
      ...inductionResult.rule,
      status: 'verified',
      dialect: dialect || 'Standard',
      sourceType: isAdmin ? 'admin_direct' : 'user_correction',
      verifiedBy: isAdmin ? session.username : (contributorName || 'Community Contributor (Auto-learned)'),
      verifiedAt: new Date().toISOString(),
    });

    // Step 3: Add to Corpus dataset as approved
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
      inducedRuleId: savedRule.id
    });

    // Step 4: Immediately activate in fast cache
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
            alternativeScript: alternativeScript || ''
          }
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
      message: 'تصحیح موصول ہو گئی۔ ماڈل نے نیا اصول سیکھ لیا اور فوراً فعال ہو گیا۔ (Correction learned and immediately active globally)',
      inducedRule: savedRule,
      corpusEntry,
      explanation: inductionResult.explanationText
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

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    adminSessions.set(token, {
      username: creds.username,
      createdAt: now,
      expiresAt: now + SESSION_LIFETIME_MS,
    });

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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false, error: 'No token provided' });
  }

  const token = authHeader.substring(7).trim();
  const session = adminSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (session) adminSessions.delete(token);
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
apiRouter.get('/public/stats', (_req: Request, res: Response) => {
  try {
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
apiRouter.get('/admin/report', requireAdminAuth, (req: Request, res: Response) => {
  try {
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
apiRouter.get('/rules/active', (_req: Request, res: Response) => {
  try {
    const rules = dbService.getActiveRules();
    res.json({ rules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/admin/rules', requireAdminAuth, (req: Request, res: Response) => {
  try {
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
apiRouter.get('/admin/corpus', requireAdminAuth, (req: Request, res: Response) => {
  try {
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
apiRouter.get('/knowledge/documents', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const docs = dbService.getKnowledgeDocs();
    res.json({ documents: docs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/knowledge/documents/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = dbService.deleteKnowledgeDoc(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, message: 'Document removed from knowledge base' });
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
    });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to ingest PDF document' });
  }
});

// Trigger extraction of grammar rules & vocabulary from an existing Knowledge Base document (Protected)
apiRouter.post('/knowledge/extract-rules/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
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
