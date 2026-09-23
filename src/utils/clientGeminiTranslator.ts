import { Language, TranslationResult } from '../types/index.js';

/**
 * Client-side Gemini fallback translator for environments like Vercel (static deployments),
 * serverless cold starts, or when external host APIs need client-side key execution.
 */

function cleanJson(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function translateOnClient(
  sourceText: string,
  sourceLang: Language,
  targetLang: Language,
  apiKey: string
): Promise<TranslationResult | null> {
  if (!apiKey || !sourceText.trim()) return null;

  const prompt = `You are the authoritative Brahui Linguistic Expert. Translate the following user input text from ${sourceLang} to ${targetLang}:

USER INPUT TEXT:
"""
${sourceText.trim()}
"""

MANDATORY RULES:
1. Translate strictly and specifically the exact input text provided above.
2. ZERO RAW FOREIGN/ENGLISH TOKENS: Under NO circumstances may foreign or English words (e.g. 'study', 'class', 'one', 'school', 'grade', 'student') leak untranslated into the Brahui output. Every term must be fully translated into native Brahui vocabulary (e.g. "I study in class one" -> "ای اولیکو جماعت ٹی خوانوہ" / "I awwalīko jamā'at-ţī khwāniva").
3. Observe Brahui Dravidian syntax: Strict SOV (Subject - Object - Verb) word order, placing subjects first, modifiers in the middle, and inflected verbs/copulas at the end.
4. Inflect postpositions accurately (-na for genitive, -ki for dative/purposive, -e for accusative/dative, -ān for ablative, -ṭí for locative, -to for associative).
5. Orthography:
   - If target is 'brahui-arabic': 'translatedText' must be authentic Brahui Perso-Arabic (using ݪ, ڑ, ٹ, ڈ), and 'alternativeScript' must be Brolikwar Roman (using á, í, ú, lh, ŕ, đ, ţ).
   - If target is 'brahui-latin' || target is 'brahui-roman': 'translatedText' must be Brolikwar Roman, and 'alternativeScript' in Brahui Perso-Arabic.
   - If target is 'urdu': 'translatedText' must be in Urdu Nastaliq, and 'alternativeScript' in Roman Urdu.
   - If target is 'english': 'translatedText' must be in idiomatic English, and 'alternativeScript' in Brahui Roman.

Respond ONLY with a valid JSON object in this exact schema:
{
  "translatedText": "primary translation text",
  "alternativeScript": "parallel script translation",
  "confidence": 98,
  "grammaticalNotes": ["concise note on SOV order and morphology"],
  "morphemeBreakdown": [
    { "word": "example", "root": "root", "partOfSpeech": "Noun", "meaning": "meaning" }
  ]
}`;

  const models = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey.trim()
      )}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        console.warn(`[Client Gemini] Model ${model} returned HTTP ${response.status}`);
        continue;
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = cleanJson(rawText);
      if (parsed && parsed.translatedText) {
        return {
          sourceText: sourceText.trim(),
          sourceLang,
          targetLang,
          translatedText: parsed.translatedText,
          alternativeScript: parsed.alternativeScript || '',
          phoneticPronunciation: '',
          confidence: parsed.confidence || 95,
          grammaticalNotes: parsed.grammaticalNotes || ['Direct Gemini dynamic translation.'],
          morphemeBreakdown: parsed.morphemeBreakdown || [],
          rulesApplied: [{ id: 'rule-sov-syntax-01', title: 'Strict SOV (Subject - Object - Verb) Word Order', category: 'Syntax' }],
          paragraphCount: 1,
          wordCount: sourceText.trim().split(/\s+/).length,
        };
      }
    } catch (err) {
      console.warn(`[Client Gemini] Failed with model ${model}:`, err);
    }
  }

  return null;
}
