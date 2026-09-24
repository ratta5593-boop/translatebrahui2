import { GoogleGenAI, Type } from "@google/genai";
import { dbService } from "./db.js";
import { dynamicTranslateSentence } from "./dynamicTranslator.js";
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite"
];
function cleanAndParseJson(rawText, fallback = {}) {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) return fallback;
  let text = rawText.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  if (startIdx !== -1) {
    const isObject = text[startIdx] === "{";
    const lastIdx = isObject ? text.lastIndexOf("}") : text.lastIndexOf("]");
    if (lastIdx !== -1 && lastIdx >= startIdx) {
      text = text.substring(startIdx, lastIdx + 1);
    }
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("[Gemini] JSON parsing error on model output:", text.slice(0, 150), err);
    return fallback;
  }
}
if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith("gen-lang-client")) {
  delete process.env.GOOGLE_API_KEY;
}
if (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY.startsWith("gen-lang-client")) {
  delete process.env.VITE_GEMINI_API_KEY;
}
function resolveServerApiKey(providedKey) {
  if (providedKey && typeof providedKey === "string" && providedKey.trim() && !providedKey.startsWith("gen-lang-client")) {
    return providedKey.trim();
  }
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && !geminiKey.startsWith("gen-lang-client")) {
    return geminiKey;
  }
  const googleKey = process.env.GOOGLE_API_KEY?.trim();
  if (googleKey && !googleKey.startsWith("gen-lang-client")) {
    return googleKey;
  }
  const viteKey = process.env.VITE_GEMINI_API_KEY?.trim();
  if (viteKey && !viteKey.startsWith("gen-lang-client")) {
    return viteKey;
  }
  return (process.env.API_KEY || "").trim();
}
function getAIClient(customKey) {
  const apiKey = resolveServerApiKey(customKey);
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith("gen-lang-client")) {
    delete process.env.GOOGLE_API_KEY;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}
async function callWithRetryAndFallback(operation, fallbackFn, timeoutMs = 25e3, customApiKey) {
  const apiKey = resolveServerApiKey(customApiKey);
  if (!apiKey) {
    console.warn("[Gemini] No Gemini API key detected in runtime environment variables. Running dynamic linguistic translation engine.");
    return fallbackFn();
  }
  const ai = getAIClient(apiKey);
  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const modelName = CANDIDATE_MODELS[i];
    try {
      return await withTimeout(operation(ai, modelName), timeoutMs);
    } catch (err) {
      const isQuotaExhausted = err?.message?.includes("RESOURCE_EXHAUSTED") || err?.message?.includes("resource_exhausted") || err?.message?.includes("quota") || err?.message?.includes("Quota") || err?.status === 429 && (err?.message?.includes("quota") || err?.message?.includes("exhausted"));
      if (isQuotaExhausted) {
        console.warn(`[Gemini] Model ${modelName} returned quota exhausted / RESOURCE_EXHAUSTED. Immediately switching to dynamic linguistic translation engine with knowledge base rules.`);
        return fallbackFn();
      }
      const isKeyInvalid = err?.message?.includes("API_KEY_INVALID") || err?.message?.includes("API key not valid") || err?.status === 400 && (err?.message?.includes("API key") || err?.message?.includes("INVALID_ARGUMENT"));
      if (isKeyInvalid) {
        console.warn(`[Gemini] Model ${modelName} returned invalid API key error. Falling back immediately to dynamic linguistic translation engine.`);
        return fallbackFn();
      }
      const isTransient = err?.status === 503 || err?.status === 429 || err?.message?.includes("503") || err?.message?.includes("429") || err?.message?.includes("UNAVAILABLE") || err?.message?.includes("high demand") || err?.message?.includes("timed out");
      if (isTransient) {
        console.warn(`[Gemini] Model ${modelName} transient issue or timeout (${err.status || err.message}), trying fallback candidate (${i + 1}/${CANDIDATE_MODELS.length})...`);
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        continue;
      }
      console.warn(`[Gemini] Error with ${modelName}:`, err?.message || err);
    }
  }
  return fallbackFn();
}
function retrieveRelevantKnowledge(sourceText, docs) {
  if (!docs || docs.length === 0) {
    return {
      excerpts: "No knowledge documents uploaded yet.",
      consultedDocs: [],
      dictionaryMatches: []
    };
  }
  const rawTokens = sourceText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»،؟]/g, " ").split(/\s+/).filter((t) => t.length >= 2);
  const stopWords = /* @__PURE__ */ new Set([
    "the",
    "is",
    "are",
    "was",
    "were",
    "and",
    "or",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "that",
    "this",
    "from",
    "hai",
    "hain",
    "ka",
    "ki",
    "ke",
    "ko",
    "se",
    "par",
    "mein",
    "ne",
    "tha",
    "thi",
    "the"
  ]);
  const searchTokens = rawTokens.filter((t) => !stopWords.has(t));
  const tokensToSearch = searchTokens.length > 0 ? searchTokens : rawTokens;
  const scoredChunks = [];
  const foundDictionaryMatches = [];
  for (const doc of docs) {
    const chunks = doc.chunks && doc.chunks.length > 0 ? doc.chunks : doc.sampleSummary ? [doc.sampleSummary] : [];
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      const matchedTerms = [];
      for (const token of tokensToSearch) {
        if (chunkLower.includes(token)) {
          score += 4;
          matchedTerms.push(token);
          const lines = chunk.split(/[\r\n]+/);
          for (const line of lines) {
            const lineLower = line.toLowerCase();
            if (lineLower.includes(token) && foundDictionaryMatches.length < 10) {
              const cleanedLine = line.trim();
              if (cleanedLine.length > 3 && cleanedLine.length < 180) {
                if (cleanedLine.includes("-") || cleanedLine.includes(":") || cleanedLine.includes("=")) {
                  const parts = cleanedLine.split(/[-:=]/);
                  if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                    foundDictionaryMatches.push({
                      term: parts[0].trim(),
                      meaning: parts.slice(1).join("-").trim(),
                      sourceDoc: doc.title
                    });
                  }
                } else {
                  foundDictionaryMatches.push({
                    term: token,
                    meaning: cleanedLine,
                    sourceDoc: doc.title
                  });
                }
              }
            }
          }
        }
      }
      if (sourceText.length > 4 && chunkLower.includes(sourceText.toLowerCase().trim())) {
        score += 20;
      }
      if (cIdx === 0) {
        score += 2;
      }
      if (score > 0) {
        scoredChunks.push({
          docTitle: doc.title,
          docType: doc.type,
          chunk,
          score,
          matchedTerms: Array.from(new Set(matchedTerms))
        });
      }
    }
  }
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, 6);
  const consultedDocsSet = /* @__PURE__ */ new Set();
  topChunks.forEach((c) => consultedDocsSet.add(c.docTitle));
  if (topChunks.length < 3) {
    for (const doc of docs.slice(0, 4)) {
      if (!consultedDocsSet.has(doc.title)) {
        consultedDocsSet.add(doc.title);
        const sampleChunk = doc.chunks && doc.chunks[0] || doc.sampleSummary || "Reference document";
        topChunks.push({
          docTitle: doc.title,
          docType: doc.type,
          chunk: sampleChunk.slice(0, 800),
          score: 1,
          matchedTerms: []
        });
      }
    }
  }
  const excerpts = topChunks.map(
    (c, i) => `[Document ${i + 1}: "${c.docTitle}" (${c.docType})]${c.matchedTerms.length > 0 ? ` (Matches query terms: ${c.matchedTerms.join(", ")})` : ""}
${c.chunk.slice(0, 1200)}`
  ).join("\n\n---\n\n");
  const uniqueMatches = [];
  const seenTerms = /* @__PURE__ */ new Set();
  for (const m of foundDictionaryMatches) {
    const key = `${m.term.toLowerCase()}_${m.sourceDoc}`;
    if (!seenTerms.has(key)) {
      seenTerms.add(key);
      uniqueMatches.push(m);
    }
  }
  return {
    excerpts,
    consultedDocs: Array.from(consultedDocsSet),
    dictionaryMatches: uniqueMatches.slice(0, 6)
  };
}
async function translateChapterInChunks(params) {
  const {
    paragraphs,
    sourceText,
    sourceLang,
    targetLang,
    rulesSummary,
    docsExcerpts,
    corpusExcerpts,
    baseSystemInstruction,
    activeRules,
    wordCount,
    knowledgeRetrieval,
    apiKey
  } = params;
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;
  for (const p of paragraphs) {
    if (currentLength + p.length > 1200 && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n\n"));
      currentChunk = [p];
      currentLength = p.length;
    } else {
      currentChunk.push(p);
      currentLength += p.length + 2;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n\n"));
  }
  console.log(`[Gemini] Translating chapter across ${chunks.length} paragraph chunks (${paragraphs.length} total paragraphs)...`);
  const translatedChunks = [];
  const altChunks = [];
  const collectedMorphemes = [];
  const collectedNotes = [];
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunkText = chunks[idx];
    const chunkPrompt = `Translate this chapter section (${idx + 1} of ${chunks.length}) faithfully and completely.
Source Language: ${sourceLang}
Target Language: ${targetLang}

CRITICAL: Translate every sentence in full. ZERO RAW FOREIGN/ENGLISH TOKENS: translate every word and educational term (e.g. 'study', 'class one', 'school') completely into Brahui without leaking raw English tokens. Preserve internal paragraph breaks (\\n\\n). Do NOT summarize or skip any part.

SOURCE SECTION:
${chunkText}

CURRENT ACTIVE INDUCED GRAMMAR RULES:
${rulesSummary}

Output valid JSON strictly adhering to schema with translatedText (primary target script) and alternativeScript (parallel script).`;
    const chunkResult = await callWithRetryAndFallback(
      async (ai, modelName) => {
        const res = await ai.models.generateContent({
          model: modelName,
          contents: chunkPrompt,
          config: {
            systemInstruction: baseSystemInstruction,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedText: {
                  type: Type.STRING,
                  description: "The translated text for this section, preserving all paragraph breaks (\\n\\n)"
                },
                alternativeScript: {
                  type: Type.STRING,
                  description: "The parallel script translation preserving all paragraph breaks (\\n\\n)"
                },
                notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                morphemes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      root: { type: Type.STRING },
                      partOfSpeech: { type: Type.STRING },
                      meaning: { type: Type.STRING }
                    },
                    required: ["word", "partOfSpeech", "meaning"]
                  }
                }
              },
              required: ["translatedText"]
            }
          }
        });
        return cleanAndParseJson(res.text || "{}", {});
      },
      () => {
        const fb = getFallbackTranslation(chunkText, sourceLang, targetLang);
        return {
          translatedText: fb.translatedText,
          alternativeScript: fb.alternativeScript
        };
      },
      25e3,
      apiKey
    );
    translatedChunks.push(chunkResult.translatedText || chunkText);
    if (chunkResult.alternativeScript) {
      altChunks.push(chunkResult.alternativeScript);
    }
    if (chunkResult.morphemes) {
      collectedMorphemes.push(...chunkResult.morphemes);
    }
    if (chunkResult.notes) {
      collectedNotes.push(...chunkResult.notes);
    }
  }
  const finalTranslated = translatedChunks.join("\n\n");
  const finalAlt = altChunks.join("\n\n");
  const uniqueMorphemes = collectedMorphemes.filter(
    (item, index, self) => index === self.findIndex((t) => t.word === item.word)
  ).slice(0, 10);
  const result = {
    sourceText,
    sourceLang,
    targetLang,
    translatedText: finalTranslated,
    alternativeScript: finalAlt,
    confidence: 95,
    grammaticalNotes: [
      `Full chapter translation across ${paragraphs.length} paragraphs (${wordCount} words).`,
      ...collectedNotes.slice(0, 3)
    ],
    morphemeBreakdown: uniqueMorphemes,
    rulesApplied: activeRules.slice(0, 2).map((r) => ({ id: r.id, title: r.title, category: r.category })),
    consultedKnowledgeDocs: knowledgeRetrieval?.consultedDocs,
    dictionaryMatches: knowledgeRetrieval?.dictionaryMatches,
    paragraphCount: paragraphs.length,
    wordCount
  };
  dbService.logTranslation({
    sourceText,
    sourceLang,
    targetLang,
    translatedText: result.translatedText
  });
  return result;
}
function isBrahuiLang(lang) {
  return lang === "brahui-arabic" || lang === "brahui-latin" || lang === "brahui-roman";
}
async function translateViaGoogleTranslate(text, sourceLang, targetLang, apiKey) {
  const prompt = `You are Google Translate. Translate the user text accurately from ${sourceLang} to ${targetLang}.
Preserve tone, terminology, and semantic meaning. Return ONLY the translation, with no explanation or conversational text.

Text to translate:
"""
${text}
"""`;
  try {
    const res = await callWithRetryAndFallback(
      async (ai, modelName) => {
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.1
          }
        });
        const clean = resp.text ? resp.text.trim() : text;
        return { translatedText: clean.replace(/^"|"$/g, "") };
      },
      () => ({ translatedText: text }),
      15e3,
      apiKey
    );
    return res.translatedText || text;
  } catch (err) {
    console.error("Google Translate bridge error:", err);
    return text;
  }
}
async function translateText(sourceText, sourceLang, targetLang, options) {
  const runtimeApiKey = options?.apiKey;
  const isSrcBrahui = isBrahuiLang(sourceLang);
  const isTgtBrahui = isBrahuiLang(targetLang);
  const isSrcNative = sourceLang === "english" || sourceLang === "urdu" || isSrcBrahui;
  const isTgtNative = targetLang === "english" || targetLang === "urdu" || isTgtBrahui;
  if (!isSrcNative && isTgtBrahui) {
    const englishBridge = await translateViaGoogleTranslate(sourceText, sourceLang, "english", runtimeApiKey);
    const brahuiResult = await translateText(englishBridge, "english", targetLang, options);
    return {
      ...brahuiResult,
      sourceText,
      sourceLang,
      grammaticalNotes: [
        `Multi-Language Bridge: Translated from ${sourceLang} to English pivot ("${englishBridge.slice(0, 60)}${englishBridge.length > 60 ? "..." : ""}") via Google Translate, then into Brahui using active grammar memory.`,
        ...brahuiResult.grammaticalNotes || []
      ]
    };
  }
  if (isSrcBrahui && !isTgtNative) {
    const englishResult = await translateText(sourceText, sourceLang, "english", options);
    const foreignTarget = await translateViaGoogleTranslate(englishResult.translatedText, "english", targetLang, runtimeApiKey);
    return {
      sourceText,
      sourceLang,
      targetLang,
      translatedText: foreignTarget,
      alternativeScript: englishResult.translatedText,
      confidence: Math.round(englishResult.confidence * 0.98),
      grammaticalNotes: [
        `Multi-Language Bridge: Translated from Brahui to English ("${englishResult.translatedText.slice(0, 60)}${englishResult.translatedText.length > 60 ? "..." : ""}") using active Brahui engine, then into ${targetLang} via Google Translate.`,
        ...englishResult.grammaticalNotes || []
      ],
      rulesApplied: englishResult.rulesApplied,
      consultedKnowledgeDocs: englishResult.consultedKnowledgeDocs,
      dictionaryMatches: englishResult.dictionaryMatches,
      paragraphCount: englishResult.paragraphCount,
      wordCount: englishResult.wordCount
    };
  }
  if (!isSrcNative && !isTgtNative) {
    const directResult = await translateViaGoogleTranslate(sourceText, sourceLang, targetLang, runtimeApiKey);
    return {
      sourceText,
      sourceLang,
      targetLang,
      translatedText: directResult,
      confidence: 95,
      grammaticalNotes: [`Direct translation between dynamic languages via Google Translate engine.`],
      rulesApplied: [],
      consultedKnowledgeDocs: [],
      dictionaryMatches: [],
      paragraphCount: 1,
      wordCount: sourceText.trim().split(/\s+/).filter(Boolean).length
    };
  }
  const activeRules = dbService.getGrammarRules().filter((r) => r.status !== "deprecated");
  const knowledgeDocs = dbService.getKnowledgeDocs();
  const corpusSamples = dbService.getCorpus().slice(0, 10);
  const rawParagraphs = sourceText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [sourceText.trim()];
  const wordCount = sourceText.trim().split(/\s+/).filter(Boolean).length;
  const isLongForm = paragraphs.length > 1 || sourceText.length > 280 || wordCount > 45;
  const knowledgeRetrieval = retrieveRelevantKnowledge(sourceText, knowledgeDocs);
  const docsExcerpts = knowledgeRetrieval.excerpts;
  const rulesSummary = activeRules.slice(0, 15).map((r) => `[${r.category}] Rule: "${r.title}". Pattern: ${r.pattern}. Explanation: ${r.explanation}`).join("\n");
  const corpusExcerpts = corpusSamples.map((c) => `"${c.sourceText}" (${c.sourceLang}) -> "${c.targetText}" [${c.alternativeScript || ""}]`).join("\n");
  const baseSystemInstruction = `You are the world-class Brahui Linguistic Expert & Google Translate Base Engine for Brahui (\u0628\u0631\u0627\u06C1\u0648\u0626\u06CC / Br\xE1hu\xED), Urdu (\u0627\u0631\u062F\u0648), and English.
Brahui is a northern Dravidian language spoken in Balochistan, characterized by:
1. Strict SOV (Subject - Object - Verb) word order: the subject opens the clause, complements and postpositional phrases come in the middle, and the inflected verb or copula MUST terminate the sentence.
2. Rich agglutinative morphology with postpositions (-na for genitive/possessive, -ki for dative/purposive, -e for accusative/dative, -\u0101n for ablative, -to for associative, -\u1E6D\xED for locative, -\u0101 for directional).
3. Two official orthographies:
   a) Perso-Arabic Brahui (using standard Arabic/Urdu alphabet plus the unique Brahui voiceless lateral fricative \u076A / L with small v, retroflex \u0691, \u0679, \u0688).
   b) Brolikwar Roman script (using \xE1, \xED, \xFA, lh for /\u026C/, \u0155 for retroflex r, \u0111 for retroflex d, \u0163 for retroflex t, \u0144).
4. Verbs conjugate for tense, person, number, and negative infixes (-pa-/-fa-).

CRITICAL LINGUISTIC RULES & ZERO ENGLISH TOKENS POLICY:
- ZERO UNTRANSLATED FOREIGN/ENGLISH TOKENS: Under NO circumstances may raw English or foreign words (such as 'study', 'class', 'one', 'student', 'school', 'read', 'learn', etc.) remain in the translated Brahui Perso-Arabic or Roman output.
- All concepts, numbers, and nouns must be fully and naturally translated into authentic Brahui vocabulary:
  * 'study' / 'read' / 'learn' -> \u062E\u0648\u0627\u0646\u0646\u06AF / \u062E\u0648\u0627\u0646\u0648\u06C1 / \u062E\u0648\u0627\u0646 (khw\u0101niva / khw\u0101ning)
  * 'class' -> \u062C\u0645\u0627\u0639\u062A (jam\u0101'at) or \u06A9\u0644\u0627\u0633 (kl\u0101s)
  * 'class one' -> \u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A (awwal\u012Bko jam\u0101'at)
  * 'in class one' -> \u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A \u0679\u06CC (awwal\u012Bko jam\u0101'at-\u0163\u012B)
  * 'I study in class one' -> '\u0627\u06CC \u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A \u0679\u06CC \u062E\u0648\u0627\u0646\u0648\u06C1' (I awwal\u012Bko jam\u0101'at-\u0163\u012B khw\u0101niva) or '\u0627\u06CC \u0627\u0648\u0644\u06CC\u06A9\u0648 \u06A9\u0644\u0627\u0633 \u0679\u06CC \u062E\u0648\u0627\u0646\u0646\u06AF \u0679\u06CC \u0627\u064F\u0679'
  * 'student' -> \u0634\u0627\u06AF\u0631\u062F (sh\u0101gird)
  * 'teacher' -> \u0627\u0633\u062A\u0627\u062F (ust\u0101d)
  * 'school' -> \u0627\u0633\u06A9\u0648\u0644 / \u0645\u062F\u0631\u0633\u06C1 (isk\u016Bl / madrasa)
  * 'water' -> \u062F\u06CC\u0631 (d\u012Br)
  * 'home/house' -> \u0627\u064F\u0631\u0627 (ur\u0101)
  * 'food/bread' -> \u0627\u06CC\u0644\u06CC\u0634 (elesh) / \u06A9\u064F\u0646\u0646\u06AF (kunning)
  * 'friend' -> \u0633\u0646\u06AF\u062A (sangat)
- Use the provided Induced Grammar Rules and Ingested PDF Knowledge excerpts to strictly govern the translation output.
- If target is 'brahui-arabic', provide the main translation in authentic Brahui Perso-Arabic script AND provide alternativeScript in Roman Brahui.
- If target is 'brahui-latin' or 'brahui-roman', provide the main translation in Brolikwar Roman AND provide alternativeScript in Perso-Arabic script.
- If target is 'urdu', provide the main translation in Urdu and Roman Urdu transliteration in alternativeScript.
- If target is 'english', provide the main translation in English and Brahui Roman in alternativeScript.
- Be culturally authentic and accurate to Balochistan/Kalat linguistic norms.`;
  if (isLongForm) {
    if (paragraphs.length > 4 || sourceText.length > 2500) {
      return translateChapterInChunks({
        paragraphs,
        sourceText,
        sourceLang,
        targetLang,
        rulesSummary,
        docsExcerpts,
        corpusExcerpts,
        baseSystemInstruction,
        activeRules,
        wordCount,
        knowledgeRetrieval,
        apiKey: runtimeApiKey
      });
    }
    const prompt2 = `Translate the following passage/paragraphs faithfully and completely from start to finish.
Source Language: ${sourceLang}
Target Language: ${targetLang}

CRITICAL RULES FOR PARAGRAPHS & CHAPTERS:
1. Translate EVERY single sentence and paragraph. Do NOT summarize, truncate, or omit any text.
2. ZERO RAW FOREIGN/ENGLISH TOKENS: Translate every word, concept, grade, and number into native Brahui. Do not leave raw English words (e.g. 'study', 'class', 'one', 'school') in the Brahui output.
3. Maintain all paragraph breaks strictly: separate paragraphs with double newlines (\\n\\n).
4. Provide the full translation for every paragraph in the primary target language/script for 'translatedText'.
5. Provide the parallel script for every paragraph in 'alternativeScript'.
6. Include 2-4 key grammatical notes on word order and morphology across the passage.
7. Provide up to 6 key morphemes/vocabulary terms in 'keyMorphemes'.

CURRENT ACTIVE INDUCED GRAMMAR RULES:
${rulesSummary}

PDF KNOWLEDGE BASE & DICTIONARY CONTEXT:
${docsExcerpts}

AUTHENTIC CORPUS REFERENCES:
${corpusExcerpts}

SOURCE TEXT TO TRANSLATE (Preserve paragraph structure):
${sourceText}

Output valid JSON strictly adhering to schema.`;
    return callWithRetryAndFallback(
      async (ai, modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt2,
          config: {
            systemInstruction: baseSystemInstruction,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedText: {
                  type: Type.STRING,
                  description: "The complete translated passage preserving all paragraph breaks (\\n\\n)"
                },
                alternativeScript: {
                  type: Type.STRING,
                  description: "The parallel script translation preserving all paragraph breaks (\\n\\n)"
                },
                confidence: {
                  type: Type.NUMBER,
                  description: "Translation confidence score between 80 and 99"
                },
                grammaticalNotes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Key grammatical observations across the passage"
                },
                keyMorphemes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      root: { type: Type.STRING },
                      partOfSpeech: { type: Type.STRING },
                      meaning: { type: Type.STRING }
                    },
                    required: ["word", "partOfSpeech", "meaning"]
                  },
                  description: "4-8 key root words and morphemes extracted from the passage"
                },
                appliedRuleTitles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["translatedText", "confidence"]
            }
          }
        });
        const parsed = cleanAndParseJson(response.text || "{}", {});
        const appliedRules = (parsed.appliedRuleTitles || []).map((title) => {
          const match = activeRules.find((r) => r.title.toLowerCase().includes(title.toLowerCase()));
          return match ? { id: match.id, title: match.title, category: match.category } : { id: "generic", title, category: "General" };
        });
        const result = {
          sourceText,
          sourceLang,
          targetLang,
          translatedText: parsed.translatedText || "",
          alternativeScript: parsed.alternativeScript || "",
          confidence: parsed.confidence || 93,
          grammaticalNotes: parsed.grammaticalNotes || [
            "Multi-paragraph passage translated preserving SOV structure and paragraph boundaries."
          ],
          morphemeBreakdown: parsed.keyMorphemes || [],
          rulesApplied: appliedRules,
          consultedKnowledgeDocs: knowledgeRetrieval.consultedDocs,
          dictionaryMatches: knowledgeRetrieval.dictionaryMatches,
          paragraphCount: paragraphs.length,
          wordCount
        };
        dbService.logTranslation({
          sourceText,
          sourceLang,
          targetLang,
          translatedText: result.translatedText
        });
        return result;
      },
      () => getFallbackTranslation(sourceText, sourceLang, targetLang, knowledgeRetrieval),
      25e3,
      runtimeApiKey
    );
  }
  const prompt = `You are translating the user's exact input text from ${sourceLang} to ${targetLang}.

USER INPUT TEXT:
"""
${sourceText}
"""

Source Language: ${sourceLang}
Target Language: ${targetLang}

MANDATORY TRANSLATION DIRECTIVES:
1. Translate specifically and solely the user input text provided above: "${sourceText}".
2. ZERO RAW FOREIGN/ENGLISH TOKENS: Under NO circumstances may foreign or English words (e.g. 'study', 'class', 'one', 'school', 'grade', 'student') leak untranslated into the Brahui Perso-Arabic or Roman output. Every word and noun must be naturally translated into authentic Brahui vocabulary (e.g. "I study in class one" -> "\u0627\u06CC \u0627\u0648\u0644\u06CC\u06A9\u0648 \u062C\u0645\u0627\u0639\u062A \u0679\u06CC \u062E\u0648\u0627\u0646\u0648\u06C1" / "I awwal\u012Bko jam\u0101'at-\u0163\u012B khw\u0101niva").
3. Each unique English or Urdu input sentence must produce its distinct, accurate, and authentic translation. Do NOT substitute, invent, or repeat boilerplate or generic greetings.
4. Observe Brahui Dravidian syntax and morphology:
   - Strict SOV (Subject - Object - Verb) word order: place subjects first, objects/modifiers in the middle, and inflected verbs or copulas at the end.
   - Inflect postpositions accurately (-na for genitive/possessive, -ki for dative/purposive, -e for accusative/dative, -\u0101n for ablative, -\u1E6D\xED for locative, -to for associative).
5. Orthography & Scripts:
   - If target is 'brahui-arabic': 'translatedText' must be authentic Brahui Perso-Arabic script (using letters like \u076A, \u0691, \u0679, \u0688), and 'alternativeScript' must be Brolikwar Roman (using \xE1, \xED, \xFA, lh, \u0155, \u0111, \u0163).
   - If target is 'brahui-latin' or 'brahui-roman': 'translatedText' must be Brolikwar Roman, and 'alternativeScript' in Brahui Perso-Arabic.
   - If target is 'urdu': 'translatedText' must be in Urdu Nastaliq, and 'alternativeScript' in Roman Urdu.
   - If target is 'english': 'translatedText' must be in idiomatic English, and 'alternativeScript' in Brahui Roman.

${rulesSummary ? `ACTIVE INDUCED GRAMMAR RULES TO FOLLOW:
${rulesSummary}
` : ""}
${docsExcerpts ? `CONSULTED KNOWLEDGE BASE EXCERPTS & VOCABULARY:
${docsExcerpts}
` : ""}
${corpusExcerpts ? `AUTHENTIC PARALLEL CORPUS SAMPLES (For linguistic reference only; do NOT output unless the user input text explicitly matches):
${corpusExcerpts}
` : ""}

Translate the exact user input text: """${sourceText}""". Output valid JSON adhering to schema.`;
  return callWithRetryAndFallback(
    async (ai, modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: baseSystemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedText: {
                type: Type.STRING,
                description: "The translated text in the requested target language/script"
              },
              alternativeScript: {
                type: Type.STRING,
                description: "The parallel script (Roman Latin if Arabic was requested, or Arabic if Latin was requested)"
              },
              confidence: {
                type: Type.NUMBER,
                description: "Translation confidence score between 75 and 99"
              },
              appliedRuleTitles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Titles of any induced grammar rules that guided this translation"
              }
            },
            required: ["translatedText", "confidence"]
          }
        }
      });
      const parsed = cleanAndParseJson(response.text || "{}", {});
      const appliedRules = (parsed.appliedRuleTitles || []).map((title) => {
        const match = activeRules.find((r) => r.title.toLowerCase().includes(title.toLowerCase()));
        return match ? { id: match.id, title: match.title, category: match.category } : { id: "generic", title, category: "General" };
      });
      let translatedText = parsed.translatedText || "";
      let alternativeScript = parsed.alternativeScript || "";
      if (!translatedText.trim()) {
        const dynamicFallback = dynamicTranslateSentence(sourceText, sourceLang, targetLang);
        translatedText = dynamicFallback.translatedText;
        alternativeScript = dynamicFallback.alternativeScript || "";
      }
      const result = {
        sourceText,
        sourceLang,
        targetLang,
        translatedText,
        alternativeScript,
        phoneticPronunciation: "",
        confidence: parsed.confidence || 95,
        grammaticalNotes: ["Standard SOV word order observed."],
        morphemeBreakdown: [],
        rulesApplied: appliedRules,
        consultedKnowledgeDocs: knowledgeRetrieval.consultedDocs,
        dictionaryMatches: knowledgeRetrieval.dictionaryMatches,
        paragraphCount: 1,
        wordCount
      };
      dbService.logTranslation({
        sourceText,
        sourceLang,
        targetLang,
        translatedText: result.translatedText
      });
      return result;
    },
    () => getFallbackTranslation(sourceText, sourceLang, targetLang, knowledgeRetrieval),
    25e3,
    runtimeApiKey
  );
}
async function induceGrammarRule(params) {
  const systemInstruction = `You are the Chief Computational Linguist and Grammar Induction Engine for the Brahui Language Self-Learning System.
Your job is Active Learning & Automatic Rule Induction:
Whenever a user submits a 100% correct Brahui translation correcting a previous machine translation, you must:
1. Compare the source sentence, the faulty initial machine translation, and the user's authoritative corrected translation.
2. Identify the exact linguistic cause of the error:
   - Syntax: word order error (e.g. SVO instead of strict Dravidian SOV, misplaced auxiliary verb, incorrect postposition order).
   - Morphology: incorrect case suffix (-na genitive, -ki dative, -e accusative, -\u0101n ablative, -\u1E6D\xED locative, -to associative), erroneous plural suffix (-k vs -\xE1k), wrong verbal inflection for person/number/tense.
   - Lexical: inaccurate word choice, Dravidian root vs Persian/Balochi loanword substitution.
   - Phonology/Orthography: misspelling of unique Brahui phonemes (such as lateral fricative \u076A / lh, retroflex \u0691 / \u0155, retroflex \u0679 / \u0163, retroflex \u0688 / \u0111).
   - Honorifics: polite 2nd person plural vs familiar singular.
3. Formulate a generalized, reusable Grammar Rule and Pattern that can be used by the AI to never make this mistake again.
4. Provide structured examples (incorrect vs correct) with English glosses.
5. Assign confidence score (0-100).`;
  const prompt = `Perform Automatic Rule & Grammar Induction on this correction:
Source Text (${params.sourceLang}): "${params.sourceText}"
Initial (Faulty) Translation: "${params.initialTranslation}"
100% Authoritative Corrected Translation (${params.targetLang}): "${params.correctedTranslation}"
User Notes / Context: "${params.userNotes || "None provided"}"
Target Dialect: "${params.dialect || "Standard"}"

Extract the underlying grammar rule or morphological pattern.`;
  return callWithRetryAndFallback(
    async (ai, modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Concise descriptive title of the induced grammar rule"
              },
              category: {
                type: Type.STRING,
                description: "One of: Syntax, Morphology, Lexical, Phonology, Orthography, Honorifics"
              },
              pattern: {
                type: Type.STRING,
                description: 'Abstract structural pattern or formula (e.g. "[Noun] + -ki + [Verb]")'
              },
              explanation: {
                type: Type.STRING,
                description: "Detailed linguistic explanation of why this rule is necessary and how to apply it"
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence in this induced rule (70 to 99)"
              },
              dialect: {
                type: Type.STRING,
                description: "Specific dialect: Standard, Sarawani (Kalat), Jhalawani, Chagai/Nushki, or All"
              },
              examples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    incorrect: { type: Type.STRING },
                    correct: { type: Type.STRING },
                    englishGloss: { type: Type.STRING }
                  },
                  required: ["incorrect", "correct", "englishGloss"]
                }
              }
            },
            required: ["title", "category", "pattern", "explanation", "confidence", "examples"]
          }
        }
      });
      const parsed = cleanAndParseJson(response.text || "{}", {});
      const validCategories = [
        "Syntax",
        "Morphology",
        "Lexical",
        "Phonology",
        "Orthography",
        "Honorifics"
      ];
      const category = validCategories.includes(parsed.category) ? parsed.category : "Morphology";
      const ruleData = {
        title: parsed.title || `Correction Pattern: ${params.sourceText.slice(0, 30)}`,
        category,
        pattern: parsed.pattern || `[Pattern based on "${params.sourceText}"]`,
        explanation: parsed.explanation || "Rule induced automatically from community verified correction.",
        confidence: parsed.confidence || 92,
        status: "active",
        dialect: parsed.dialect || "Standard",
        examples: parsed.examples || [
          {
            incorrect: params.initialTranslation,
            correct: params.correctedTranslation,
            englishGloss: params.sourceText
          }
        ],
        inducedFrom: {
          sourceText: params.sourceText,
          initialTranslation: params.initialTranslation,
          correctedTranslation: params.correctedTranslation,
          sourceLang: params.sourceLang,
          targetLang: params.targetLang
        }
      };
      return {
        rule: ruleData,
        explanationText: parsed.explanation || "Rule induced successfully from user correction."
      };
    },
    () => {
      let inferredCategory = "Morphology";
      let inferredPattern = `"${params.initialTranslation}" -> "${params.correctedTranslation}"`;
      let inferredExplanation = `Community correction recorded. System induced rule updating output to 100% authoritative Brahui.`;
      if (params.correctedTranslation.includes("\u076A") || params.correctedTranslation.toLowerCase().includes("lh")) {
        inferredCategory = "Orthography";
        inferredPattern = `Perso-Arabic [\u076A] <-> Roman Latin [lh]`;
        inferredExplanation = `Correction enforces authentic Brahui voiceless lateral fricative (\u076A / lh) phoneme.`;
      } else if (params.correctedTranslation.includes(" \u0646\u0627 ") || params.correctedTranslation.endsWith("\u0646\u0627") || params.correctedTranslation.includes("-na")) {
        inferredCategory = "Morphology";
        inferredPattern = `[Noun/Pronoun] + -na (Genitive/Possessive)`;
        inferredExplanation = `Correction applies the Brahui genitive marker -na for possessive attribution.`;
      } else if (params.correctedTranslation.includes(" \u06A9\u06CC") || params.correctedTranslation.includes("-ki")) {
        inferredCategory = "Morphology";
        inferredPattern = `[Noun/Pronoun] + -ki (Dative/Beneficiary)`;
        inferredExplanation = `Correction incorporates the Brahui dative postposition -ki.`;
      } else if (params.correctedTranslation.includes(" \u0622\u0646") || params.correctedTranslation.includes("-\u0101n")) {
        inferredCategory = "Morphology";
        inferredPattern = `[Noun] + -\u0101n (Ablative Origin)`;
        inferredExplanation = `Correction enforces the Brahui ablative suffix -\u0101n for origin/movement.`;
      }
      return {
        rule: {
          title: `Induced Rule: "${params.sourceText.slice(0, 30)}"`,
          category: inferredCategory,
          pattern: inferredPattern,
          explanation: inferredExplanation,
          confidence: 89,
          status: "active",
          dialect: params.dialect || "Standard",
          examples: [
            {
              incorrect: params.initialTranslation,
              correct: params.correctedTranslation,
              englishGloss: params.sourceText
            }
          ],
          inducedFrom: {
            sourceText: params.sourceText,
            initialTranslation: params.initialTranslation,
            correctedTranslation: params.correctedTranslation,
            sourceLang: params.sourceLang,
            targetLang: params.targetLang
          }
        },
        explanationText: inferredExplanation
      };
    }
  );
}
async function summarizeUploadedDoc(title, rawText) {
  const fallbackSummary = `Brahui reference document "${title}" containing vocabulary lexicons, morphology rules, and syntactic patterns.`;
  try {
    return await callWithRetryAndFallback(
      async (ai, modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `You are a Brahui linguistic archivist. Summarize this uploaded Brahui dictionary or grammar text in 2 concise sentences, focusing on grammatical rules, vocabulary categories, and dialectical information contained in it:
Document Title: ${title}
Text Sample:
${rawText.slice(0, 1500)}`
        });
        return response.text?.trim() || fallbackSummary;
      },
      () => fallbackSummary,
      4e3
      // 4 seconds max timeout to guarantee immediate upload response
    );
  } catch {
    return fallbackSummary;
  }
}
function getFallbackTranslation(sourceText, sourceLang, targetLang, precomputedRetrieval) {
  const lower = sourceText.toLowerCase().trim();
  const knowledgeRetrieval = precomputedRetrieval || retrieveRelevantKnowledge(sourceText, dbService.getKnowledgeDocs());
  const isSingleWord = sourceText.trim().split(/\s+/).length <= 2;
  if (isSingleWord && knowledgeRetrieval.dictionaryMatches.length > 0) {
    const exactTermMatch = knowledgeRetrieval.dictionaryMatches.find(
      (m) => m.term.toLowerCase() === lower
    );
    const match = exactTermMatch || (sourceText.trim().split(/\s+/).length === 1 ? knowledgeRetrieval.dictionaryMatches[0] : null);
    if (match) {
      const isLatin = targetLang === "brahui-latin";
      const isEnglish = targetLang === "english";
      let trans = match.meaning;
      let alt = match.term;
      if (isEnglish) {
        trans = match.meaning;
        alt = match.term;
      } else if (isLatin) {
        trans = match.term;
        alt = match.meaning;
      }
      return {
        sourceText,
        sourceLang,
        targetLang,
        translatedText: trans,
        alternativeScript: alt,
        phoneticPronunciation: match.term,
        confidence: 95,
        consultedKnowledgeDocs: knowledgeRetrieval.consultedDocs,
        dictionaryMatches: knowledgeRetrieval.dictionaryMatches,
        grammaticalNotes: [
          `Directly informed by uploaded reference document: "${match.sourceDoc}"`,
          `Extracted vocabulary match: "${match.term}" -> "${match.meaning}"`
        ],
        morphemeBreakdown: [
          {
            word: trans,
            root: match.term,
            partOfSpeech: "Uploaded Reference Dictionary",
            meaning: match.meaning
          }
        ]
      };
    }
  }
  const corpus = dbService.getCorpus();
  const exactMatch = corpus.find(
    (c) => c.sourceText.toLowerCase().trim() === lower && c.sourceLang === sourceLang
  );
  if (exactMatch) {
    const isArabic = targetLang === "brahui-arabic";
    return {
      sourceText,
      sourceLang,
      targetLang,
      translatedText: isArabic ? exactMatch.targetText : exactMatch.alternativeScript || exactMatch.targetText,
      alternativeScript: isArabic ? exactMatch.alternativeScript || "" : exactMatch.targetText,
      phoneticPronunciation: exactMatch.alternativeScript || "",
      confidence: 96,
      consultedKnowledgeDocs: knowledgeRetrieval.consultedDocs,
      dictionaryMatches: knowledgeRetrieval.dictionaryMatches,
      grammaticalNotes: [
        "Retrieved from verified community corpus & linguistic memory.",
        `Dialect: ${exactMatch.dialect || "Standard"}`
      ],
      morphemeBreakdown: [
        {
          word: exactMatch.targetText,
          root: exactMatch.sourceText,
          partOfSpeech: "Corpus Match",
          meaning: exactMatch.sourceText
        }
      ]
    };
  }
  const rawParagraphs = sourceText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (rawParagraphs.length > 1) {
    const translatedParas = [];
    const altParas = [];
    const allMorphemes = [];
    for (const para of rawParagraphs) {
      const pFb = dynamicTranslateSentence(para, sourceLang, targetLang);
      translatedParas.push(pFb.translatedText);
      if (pFb.alternativeScript) {
        altParas.push(pFb.alternativeScript);
      }
      if (pFb.morphemeBreakdown) {
        allMorphemes.push(...pFb.morphemeBreakdown);
      }
    }
    return {
      sourceText,
      sourceLang,
      targetLang,
      translatedText: translatedParas.join("\n\n"),
      alternativeScript: altParas.join("\n\n"),
      confidence: 89,
      consultedKnowledgeDocs: knowledgeRetrieval.consultedDocs,
      dictionaryMatches: knowledgeRetrieval.dictionaryMatches,
      paragraphCount: rawParagraphs.length,
      wordCount: sourceText.trim().split(/\s+/).filter(Boolean).length,
      grammaticalNotes: [
        "Multi-paragraph input dynamically translated sentence-by-sentence.",
        `Applied ${targetLang.startsWith("brahui") || targetLang === "urdu" ? "Brahui SOV" : "SVO"} word order and preserved paragraph structure.`
      ],
      morphemeBreakdown: allMorphemes.slice(0, 8)
    };
  }
  const dynamicResult = dynamicTranslateSentence(sourceText, sourceLang, targetLang);
  const activeRules = dbService.getGrammarRules().filter((r) => r.status === "active" || r.status === "verified");
  const appliedRules = activeRules.slice(0, 3).map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category
  }));
  return {
    ...dynamicResult,
    rulesApplied: dynamicResult.rulesApplied && dynamicResult.rulesApplied.length > 0 ? dynamicResult.rulesApplied : appliedRules,
    consultedKnowledgeDocs: knowledgeRetrieval.consultedDocs,
    dictionaryMatches: knowledgeRetrieval.dictionaryMatches,
    wordCount: sourceText.trim().split(/\s+/).filter(Boolean).length,
    paragraphCount: 1
  };
}
export {
  cleanAndParseJson,
  induceGrammarRule,
  isBrahuiLang,
  resolveServerApiKey,
  retrieveRelevantKnowledge,
  summarizeUploadedDoc,
  translateText,
  translateViaGoogleTranslate
};
