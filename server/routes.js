import express from "express";
import multer from "multer";
import crypto from "crypto";
import { dbService, GOOGLE_TRANSLATE_CATALOG } from "./db.js";
import { translateText, induceGrammarRule, summarizeUploadedDoc } from "./gemini.js";
import { dynamicTranslateSentence } from "./dynamicTranslator.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
  // 30MB limit
});
const apiRouter = express.Router();
apiRouter.use(express.json({ limit: "30mb" }));
apiRouter.use(express.urlencoded({ extended: true, limit: "30mb" }));
const adminSessions = /* @__PURE__ */ new Map();
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1e3;
const getAdminCredentials = () => dbService.getAdminCredentials();
function getAdminSession(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7).trim();
  const session = adminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) return null;
  return session;
}
function requireAdminAuth(req, res, next) {
  const session = getAdminSession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized: Admin authentication required or session expired" });
  }
  req.adminUser = session.username;
  next();
}
function formatDialectLabel(dialect) {
  if (!dialect) return "\u0639\u0627\u0645";
  const trimmed = dialect.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("sarawani") || trimmed.includes("\u0633\u0627\u0631\u0627\u0648\u0627\u0646\u06CC")) return "\u0633\u0627\u0631\u0627\u0648\u0627\u0646\u06CC";
  if (lower.includes("jhalawani") || trimmed.includes("\u062C\u0627\u0644\u0627\u0648\u0627\u0646\u06CC")) return "\u062C\u0627\u0644\u0627\u0648\u0627\u0646\u06CC";
  if (lower.includes("rakhshani") || trimmed.includes("\u0631\u062E\u0634\u0627\u0646\u06CC")) return "\u0631\u062E\u0634\u0627\u0646\u06CC";
  if (lower.includes("standard") || trimmed.includes("\u0639\u0627\u0645")) return "\u0639\u0627\u0645";
  return trimmed;
}
const translationFastCache = /* @__PURE__ */ new Map();
const MAX_CACHE_SIZE = 500;
const apiApp = express();
apiApp.use(express.json({ limit: "30mb" }));
apiApp.use(express.urlencoded({ extended: true, limit: "30mb" }));
apiApp.use("/api", apiRouter);
apiApp.use("/", apiRouter);
apiRouter.post("/translate", async (req, res) => {
  try {
    const { sourceText, sourceLang, targetLang, apiKey } = req.body;
    if (!sourceText || !sourceText.trim()) {
      return res.status(400).json({ error: "Source text is required" });
    }
    const sLang = sourceLang || "english";
    const tLang = targetLang || "brahui-arabic";
    const cleanText = sourceText.trim();
    const cacheKey = `${sLang}:${tLang}:${cleanText.toLowerCase()}`;
    const cached = translationFastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 36e5) {
      return res.json(cached.result);
    }
    const corpus = dbService.getCorpus();
    const matchingEntries = corpus.filter(
      (c) => c.verified && c.status !== "rejected" && c.sourceText.trim().toLowerCase() === cleanText.toLowerCase() && c.sourceLang === sLang && c.targetLang === tLang
    );
    if (matchingEntries.length > 0) {
      if (matchingEntries.length > 1) {
        const dialectVariants = matchingEntries.map((e) => ({
          dialect: formatDialectLabel(e.dialect),
          text: e.targetText,
          alternativeScript: e.alternativeScript
        }));
        const formattedTranslations = dialectVariants.map((v) => `${v.text} (${v.dialect})`).join("\n");
        const multiResult = {
          sourceText: cleanText,
          sourceLang: sLang,
          targetLang: tLang,
          translatedText: formattedTranslations,
          alternativeScript: dialectVariants.map((v) => v.alternativeScript ? `${v.alternativeScript} (${v.dialect})` : "").filter(Boolean).join("\n"),
          confidence: 99,
          dialectVariants,
          rulesApplied: [],
          consultedKnowledgeDocs: [],
          dictionaryMatches: [],
          paragraphCount: 1,
          wordCount: cleanText.split(/\s+/).filter(Boolean).length,
          grammaticalNotes: [
            `Multi-dialect translation verified across ${dialectVariants.length} dialects: ${dialectVariants.map((d) => d.dialect).join(", ")}.`
          ]
        };
        translationFastCache.set(cacheKey, { result: multiResult, timestamp: Date.now() });
        return res.json(multiResult);
      }
      const exactCorrection = matchingEntries[0];
      const activeRules = dbService.getActiveRules();
      const associatedRule = exactCorrection.inducedRuleId ? activeRules.find((r) => r.id === exactCorrection.inducedRuleId) : null;
      const dialectLabel = formatDialectLabel(exactCorrection.dialect);
      const isSpecificDialect = exactCorrection.dialect && exactCorrection.dialect !== "Standard" && exactCorrection.dialect !== "All";
      const correctionResult = {
        sourceText: cleanText,
        sourceLang: sLang,
        targetLang: tLang,
        translatedText: isSpecificDialect ? `${exactCorrection.targetText} (${dialectLabel})` : exactCorrection.targetText,
        alternativeScript: exactCorrection.alternativeScript || "",
        confidence: 99,
        dialectVariants: [
          {
            dialect: dialectLabel,
            text: exactCorrection.targetText,
            alternativeScript: exactCorrection.alternativeScript
          }
        ],
        rulesApplied: associatedRule ? [{ id: associatedRule.id, title: associatedRule.title, category: associatedRule.category }] : [],
        consultedKnowledgeDocs: [],
        dictionaryMatches: [],
        paragraphCount: 1,
        wordCount: cleanText.split(/\s+/).filter(Boolean).length,
        grammaticalNotes: [
          "Direct user-verified persistent correction applied globally from database memory.",
          `Dialect: ${dialectLabel} (Contributed by ${exactCorrection.contributorName}).`
        ]
      };
      translationFastCache.set(cacheKey, { result: correctionResult, timestamp: Date.now() });
      return res.json(correctionResult);
    }
    const rawApiKey = req.headers["x-gemini-api-key"] || req.headers["x-api-key"] || apiKey;
    const providedApiKey = rawApiKey && typeof rawApiKey === "string" && !rawApiKey.startsWith("gen-lang-client") ? rawApiKey.trim() : void 0;
    const result = await translateText(cleanText, sLang, tLang, {
      apiKey: providedApiKey,
      forceDynamicAI: true
    });
    if (result.dialectVariants && result.dialectVariants.length > 1) {
      const hasBrackets = result.translatedText.includes("(") && result.translatedText.includes(")");
      if (!hasBrackets) {
        result.translatedText = result.dialectVariants.map((v) => `${v.text} (${formatDialectLabel(v.dialect)})`).join("\n");
      }
    }
    translationFastCache.set(cacheKey, { result, timestamp: Date.now() });
    if (translationFastCache.size > MAX_CACHE_SIZE) {
      const oldestKey = translationFastCache.keys().next().value;
      if (oldestKey) translationFastCache.delete(oldestKey);
    }
    res.json(result);
  } catch (error) {
    console.error("Translation route error:", error);
    try {
      const sLang = req.body?.sourceLang || "english";
      const tLang = req.body?.targetLang || "brahui-arabic";
      const fallbackResult = dynamicTranslateSentence(req.body?.sourceText || "", sLang, tLang);
      return res.json({ ...fallbackResult, isFallback: true });
    } catch {
      res.status(500).json({ error: error.message || "Translation failed" });
    }
  }
});
apiRouter.post("/corrections/submit", async (req, res) => {
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
      return res.status(400).json({ error: "sourceText and correctedTranslation are required" });
    }
    const session = getAdminSession(req);
    const isAdmin = !!session;
    const inductionResult = await induceGrammarRule({
      sourceText,
      sourceLang: sourceLang || "english",
      targetLang: targetLang || "brahui-arabic",
      initialTranslation: initialTranslation || "",
      correctedTranslation: correctedTranslation.trim(),
      userNotes,
      dialect: dialect || "Standard"
    });
    const savedRule = dbService.addGrammarRule({
      ...inductionResult.rule,
      status: "verified",
      dialect: dialect || "Standard",
      sourceType: isAdmin ? "admin_direct" : "user_correction",
      verifiedBy: isAdmin ? session.username : contributorName || "Community Contributor (Auto-learned)",
      verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const corpusEntry = dbService.addCorpusEntry({
      sourceText: sourceText.trim(),
      sourceLang: sourceLang || "english",
      targetText: correctedTranslation.trim(),
      targetLang: targetLang || "brahui-arabic",
      alternativeScript: alternativeScript || "",
      dialect: dialect || "Standard",
      contextNotes: userNotes || "",
      contributorName: contributorName || (isAdmin ? session.username : "Community Contributor"),
      contributorRole: contributorRole || (isAdmin ? "Admin" : "User"),
      verified: true,
      status: "approved",
      sourceType: isAdmin ? "admin_direct" : "user_correction",
      inducedRuleId: savedRule.id
    });
    const sLang = sourceLang || "english";
    const tLang = targetLang || "brahui-arabic";
    const cacheKey = `${sLang}:${tLang}:${sourceText.trim().toLowerCase()}`;
    translationFastCache.set(cacheKey, {
      result: {
        sourceText: sourceText.trim(),
        sourceLang: sLang,
        targetLang: tLang,
        translatedText: correctedTranslation.trim(),
        alternativeScript: alternativeScript || "",
        confidence: 99,
        dialectVariants: [
          {
            dialect: formatDialectLabel(dialect),
            text: correctedTranslation.trim(),
            alternativeScript: alternativeScript || ""
          }
        ],
        rulesApplied: [{ id: savedRule.id, title: savedRule.title, category: savedRule.category }],
        consultedKnowledgeDocs: [],
        dictionaryMatches: [],
        paragraphCount: 1,
        wordCount: sourceText.trim().split(/\s+/).length
      },
      timestamp: Date.now()
    });
    res.json({
      success: true,
      requiresApproval: false,
      message: "\u062A\u0635\u062D\u06CC\u062D \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648 \u06AF\u0626\u06CC\u06D4 \u0645\u0627\u0688\u0644 \u0646\u06D2 \u0646\u06CC\u0627 \u0627\u0635\u0648\u0644 \u0633\u06CC\u06A9\u06BE \u0644\u06CC\u0627 \u0627\u0648\u0631 \u0641\u0648\u0631\u0627\u064B \u0641\u0639\u0627\u0644 \u06C1\u0648 \u06AF\u06CC\u0627\u06D4 (Correction learned and immediately active globally)",
      inducedRule: savedRule,
      corpusEntry,
      explanation: inductionResult.explanationText
    });
  } catch (error) {
    console.error("Correction submission error:", error);
    res.status(500).json({ error: error.message || "Failed to submit correction" });
  }
});
apiRouter.get("/rules/active", (_req, res) => {
  try {
    const rules = dbService.getGrammarRules().filter((r) => r.status !== "deprecated");
    const corpus = dbService.getCorpus();
    res.json({
      success: true,
      rules,
      corpus,
      count: rules.length
    });
  } catch (error) {
    console.error("Error fetching active rules:", error);
    res.status(500).json({ error: error.message || "Failed to fetch active rules" });
  }
});
apiRouter.post("/corrections/sync", (req, res) => {
  try {
    const { rules, corpus } = req.body;
    const clientRules = Array.isArray(rules) ? rules : [];
    const clientCorpus = Array.isArray(corpus) ? corpus : [];
    const syncResult = dbService.syncLearnedData(clientRules, clientCorpus);
    if (syncResult.addedRules > 0 || syncResult.addedCorpus > 0) {
      translationFastCache.clear();
    }
    const currentRules = dbService.getGrammarRules().filter((r) => r.status !== "deprecated");
    const currentCorpus = dbService.getCorpus();
    res.json({
      success: true,
      message: `Data synced successfully. Added ${syncResult.addedRules} rules and ${syncResult.addedCorpus} corpus entries.`,
      addedRules: syncResult.addedRules,
      addedCorpus: syncResult.addedCorpus,
      rules: currentRules,
      corpus: currentCorpus
    });
  } catch (error) {
    console.error("Data sync error:", error);
    res.status(500).json({ error: error.message || "Failed to sync data" });
  }
});
apiRouter.post("/admin/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const creds = getAdminCredentials();
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    if (username.trim() !== creds.username || password !== creds.password) {
      return res.status(401).json({ error: "Invalid admin username or password" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    adminSessions.set(token, {
      username: creds.username,
      createdAt: now,
      expiresAt: now + SESSION_LIFETIME_MS
    });
    res.json({
      success: true,
      token,
      admin: {
        username: creds.username,
        role: "Administrator"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Login failed" });
  }
});
apiRouter.get("/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ authenticated: false, error: "No token provided" });
  }
  const token = authHeader.substring(7).trim();
  const session = adminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) adminSessions.delete(token);
    return res.status(401).json({ authenticated: false, error: "Session expired or invalid" });
  }
  res.json({
    authenticated: true,
    admin: {
      username: session.username,
      role: "Administrator"
    }
  });
});
apiRouter.post("/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    adminSessions.delete(token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});
apiRouter.put("/admin/credentials", requireAdminAuth, (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    const creds = getAdminCredentials();
    if (!currentPassword || !newUsername || !newPassword) {
      return res.status(400).json({ error: "Current password, new username, and new password are required" });
    }
    if (currentPassword !== creds.password) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    if (newUsername.trim().length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long" });
    }
    if (newPassword.length < 5) {
      return res.status(400).json({ error: "Password must be at least 5 characters long" });
    }
    const updated = dbService.updateAdminCredentials(newUsername.trim(), newPassword);
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const session = adminSessions.get(token);
      if (session) {
        session.username = updated.username;
      }
    }
    res.json({
      success: true,
      message: "Admin username and password successfully updated in persistent storage.",
      username: updated.username
    });
  } catch (error) {
    console.error("Error updating admin credentials:", error);
    res.status(500).json({ error: error.message || "Failed to update credentials" });
  }
});
apiRouter.get("/public/stats", (_req, res) => {
  try {
    const rules = dbService.getGrammarRules();
    const corpus = dbService.getCorpus();
    const docs = dbService.getKnowledgeDocs();
    res.json({
      rulesCount: rules.length,
      corpusCount: corpus.length,
      docsCount: docs.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/report", requireAdminAuth, (req, res) => {
  try {
    const dateQuery = req.query.date;
    const report = dbService.getDailyReport(dateQuery);
    res.json(report);
  } catch (error) {
    console.error("Admin report error:", error);
    res.status(500).json({ error: error.message || "Failed to generate daily report" });
  }
});
apiRouter.get("/rules/active", (_req, res) => {
  try {
    const rules = dbService.getActiveRules();
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/corrections/sync", (req, res) => {
  try {
    const { rules = [], corpus = [] } = req.body || {};
    const result = dbService.syncLearnedData(rules, corpus);
    if (result.addedRules > 0 || result.addedCorpus > 0) {
      translationFastCache.clear();
    }
    const activeRules = dbService.getActiveRules();
    const allCorpus = dbService.getCorpus();
    res.json({
      success: true,
      synced: result,
      activeRules,
      corpusCount: allCorpus.length,
      rulesCount: activeRules.length
    });
  } catch (error) {
    console.error("Error syncing corrections:", error);
    res.status(500).json({ error: error.message || "Failed to sync corrections" });
  }
});
apiRouter.get("/admin/rules", requireAdminAuth, (req, res) => {
  try {
    const rules = dbService.getGrammarRules();
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/review-queue", requireAdminAuth, (_req, res) => {
  try {
    const queue = dbService.getReviewQueue();
    res.json({
      ...queue,
      pendingCorpusEntries: queue.pendingCorpus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/admin/rules/:id/approve", requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = req.adminUser || "Admin";
    const approvedRule = dbService.approveRule(id, adminUser);
    if (!approvedRule) {
      return res.status(404).json({ error: "Rule not found in database" });
    }
    translationFastCache.clear();
    res.json({
      success: true,
      message: "Grammar rule successfully approved and activated into Learned Rules!",
      rule: approvedRule
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/admin/rules/:id/reject", requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const rejectedRule = dbService.rejectRule(id);
    if (!rejectedRule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json({
      success: true,
      message: "Rule rejected and marked deprecated.",
      rule: rejectedRule
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/admin/corpus/:id/approve", requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const approvedEntry = dbService.approveCorpusEntry(id);
    if (!approvedEntry) {
      return res.status(404).json({ error: "Corpus entry not found" });
    }
    translationFastCache.clear();
    res.json({
      success: true,
      message: "Corpus entry approved and permanently added to active translation memory!",
      entry: approvedEntry
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/admin/corpus/:id/reject", requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const rejectedEntry = dbService.rejectCorpusEntry(id);
    if (!rejectedEntry) {
      return res.status(404).json({ error: "Corpus entry not found" });
    }
    res.json({
      success: true,
      message: "Corpus entry rejected.",
      entry: rejectedEntry
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/admin/rules/:id", requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status, verifiedBy } = req.body;
    const updated = dbService.updateRuleStatus(id, status, verifiedBy);
    if (!updated) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json({ success: true, rule: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/corpus", requireAdminAuth, (req, res) => {
  try {
    const corpus = dbService.getCorpus();
    res.json({ corpus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/export", requireAdminAuth, (req, res) => {
  try {
    const exportData = dbService.getCompleteCorpusExport();
    const dateStamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const filename = `brahui_corpus_grammar_rules_${dateStamp}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: error.message || "Failed to export corpus" });
  }
});
apiRouter.get("/admin/export-tsv", requireAdminAuth, (req, res) => {
  try {
    const corpus = dbService.getCorpus();
    const headers = ["ID", "Source_Lang", "Source_Text", "Target_Lang", "Target_Text", "Alt_Script", "Dialect", "Contributor", "Verified", "Created_At"];
    const rows = corpus.map((c) => [
      c.id,
      c.sourceLang,
      `"${c.sourceText.replace(/"/g, '""')}"`,
      c.targetLang,
      `"${c.targetText.replace(/"/g, '""')}"`,
      `"${(c.alternativeScript || "").replace(/"/g, '""')}"`,
      c.dialect || "Standard",
      c.contributorName,
      c.verified ? "YES" : "NO",
      c.createdAt
    ]);
    const tsvContent = [headers.join("	"), ...rows.map((r) => r.join("	"))].join("\n");
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="brahui_parallel_corpus.tsv"');
    res.send(tsvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/languages", (req, res) => {
  try {
    const settings = dbService.getSystemSettings();
    res.json({
      allowDynamicLanguages: settings.allowDynamicLanguages,
      activeLanguages: settings.activeDynamicLanguages,
      catalog: GOOGLE_TRANSLATE_CATALOG
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/admin/languages/settings", requireAdminAuth, (req, res) => {
  try {
    const { allowDynamicLanguages } = req.body;
    const settings = dbService.updateSystemSettings({ allowDynamicLanguages });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/languages/add", (req, res) => {
  try {
    const settings = dbService.getSystemSettings();
    const session = getAdminSession(req);
    if (!session && !settings.allowDynamicLanguages) {
      return res.status(403).json({ error: "Dynamic language addition is currently disabled by administrator." });
    }
    const { code, label, native, dir } = req.body;
    if (!code || !label) {
      return res.status(400).json({ error: "Language code and label are required." });
    }
    const catalogMatch = GOOGLE_TRANSLATE_CATALOG.find((l) => l.code === code);
    const newLang = {
      code,
      label: catalogMatch?.label || label,
      native: catalogMatch?.native || native || label,
      dir: catalogMatch?.dir || dir || "ltr"
    };
    const result = dbService.addDynamicLanguage(newLang);
    res.json({ success: true, activeLanguages: result.languages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.delete("/admin/languages/:code", requireAdminAuth, (req, res) => {
  try {
    const { code } = req.params;
    const result = dbService.removeDynamicLanguage(code);
    res.json({ success: true, activeLanguages: result.languages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/export/stats", (req, res) => {
  try {
    const stats = dbService.getDatasetStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/export/flores-tsv", requireAdminAuth, (req, res) => {
  try {
    const tsv = dbService.getFloresTsvExport();
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="flores200_brahui_corpus.tsv"');
    res.send(tsv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/export/google-mt-json", requireAdminAuth, (req, res) => {
  try {
    const json = dbService.getGoogleMTJsonExport();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="google_translate_brahui_automl.json"');
    res.send(JSON.stringify(json, null, 2));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/export/tatoeba-tsv", requireAdminAuth, (req, res) => {
  try {
    const tsv = dbService.getTatoebaTsvExport();
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="tatoeba_brahui_pairs.tsv"');
    res.send(tsv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/admin/export/rules-tsv", requireAdminAuth, (req, res) => {
  try {
    const tsv = dbService.getGrammarRulesTsvExport();
    res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="brahui_grammar_rules.tsv"');
    res.send(tsv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/knowledge/documents", requireAdminAuth, (req, res) => {
  try {
    const docs = dbService.getKnowledgeDocs();
    res.json({ documents: docs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.delete("/knowledge/documents/:id", requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = dbService.deleteKnowledgeDoc(id);
    if (!deleted) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, message: "Document removed from knowledge base" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
async function extractTextFromPdf(buffer) {
  try {
    const pdfModule = await import("pdf-parse");
    if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        const parsePromise = parser.getText();
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("PDF parsing timed out")), 6e3)
        );
        const parsed = await Promise.race([parsePromise, timeoutPromise]);
        const text = parsed?.text || "";
        const pageCount = parsed?.total || (parsed?.pages ? parsed.pages.length : 1);
        if (text && text.trim().length > 0) {
          return { text, pageCount };
        }
      } finally {
        try {
          await parser.destroy();
        } catch {
        }
      }
    }
    const parseFn = typeof pdfModule === "function" ? pdfModule : pdfModule?.default;
    if (typeof parseFn === "function") {
      const parsePromise = parseFn(buffer);
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("PDF parsing timed out")), 6e3)
      );
      const parsed = await Promise.race([parsePromise, timeoutPromise]);
      const text = parsed?.text || "";
      if (text && text.trim().length > 0) {
        return { text, pageCount: parsed?.numpages || 1 };
      }
    }
  } catch (pdfErr) {
    console.warn("[PDF Extraction] pdf-parse error, falling back to raw buffer text extraction:", pdfErr);
  }
  const fallbackText = buffer.toString("utf-8").replace(/[^\x20-\x7E\u0600-\u06FF\n]/g, " ");
  return { text: fallbackText, pageCount: 1 };
}
apiRouter.post("/knowledge/upload-pdf", requireAdminAuth, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Multer file upload error:", err);
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File size exceeds limit (maximum allowed is 30MB)." });
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || "File upload failed" });
    }
    next();
  });
}, async (req, res) => {
  try {
    const file = req.file;
    const { title, type, manualText } = req.body;
    let extractedText = "";
    let pageCount = 1;
    if (file) {
      const extracted = await extractTextFromPdf(file.buffer);
      extractedText = extracted.text;
      pageCount = extracted.pageCount;
    } else if (manualText && manualText.trim()) {
      extractedText = manualText.trim();
    } else {
      return res.status(400).json({ error: "No PDF file or text content provided" });
    }
    if (!extractedText.trim()) {
      extractedText = `Brahui reference document: ${title || "Untitled Dictionary"}. Contains grammatical paradigms, lexical entries, and translation patterns.`;
    }
    const cleanText = extractedText.replace(/\s+/g, " ").trim();
    const chunkSize = 1200;
    const chunks = [];
    for (let i = 0; i < cleanText.length && chunks.length < 50; i += chunkSize) {
      chunks.push(cleanText.substring(i, i + chunkSize));
    }
    if (chunks.length === 0) {
      chunks.push(cleanText.slice(0, 1e3));
    }
    const docTitle = title || (file ? file.originalname.replace(/\.[^/.]+$/, "") : "Custom Brahui Dictionary");
    const summary = await summarizeUploadedDoc(docTitle, chunks[0]);
    const newDoc = dbService.addKnowledgeDoc({
      filename: file ? file.originalname : `${docTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      title: docTitle,
      fileSize: file ? file.size : Buffer.byteLength(extractedText, "utf8"),
      type: type || "dictionary",
      pageCount,
      chunksCount: chunks.length,
      sampleSummary: summary,
      chunks: chunks.slice(0, 30)
      // store up to 30 parsed chunks
    });
    const extraction = dbService.extractAndIngestRulesFromDoc(newDoc);
    res.json({
      success: true,
      message: `PDF knowledge document successfully ingested! Extracted ${extraction.extractedRulesCount} grammar rules and ${extraction.extractedVocabCount} vocabulary entries into global translation memory.`,
      document: newDoc,
      extraction
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).json({ error: error.message || "Failed to ingest PDF document" });
  }
});
apiRouter.post("/knowledge/extract-rules/:id", requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const docs = dbService.getKnowledgeDocs();
    const doc = docs.find((d) => d.id === id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found in knowledge base" });
    }
    const extraction = dbService.extractAndIngestRulesFromDoc(doc);
    res.json({
      success: true,
      message: `Extracted ${extraction.extractedRulesCount} new grammar rules and ${extraction.extractedVocabCount} vocabulary entries from "${doc.title}".`,
      extraction
    });
  } catch (error) {
    console.error("Error extracting rules from document:", error);
    res.status(500).json({ error: error.message || "Failed to extract rules from document" });
  }
});
const errorHandler = (err, _req, res, _next) => {
  console.error("[API Error Handler]:", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File size exceeds limit (maximum allowed is 30MB)." });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
};
apiRouter.use(errorHandler);
apiApp.use(errorHandler);
export {
  apiApp,
  apiRouter,
  formatDialectLabel,
  getAdminSession,
  requireAdminAuth
};
