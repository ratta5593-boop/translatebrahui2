/**
 * Real-Time Firebase Firestore Synchronization Service for Brahui AI Translator
 * Project: attalibrary-1761f
 *
 * Ensures instant two-way cross-device synchronization:
 * Whenever any user or admin adds/approves a learned rule or submits a translation
 * correction on ANY device, it is immediately written to Firebase Firestore and
 * broadcasted via real-time onSnapshot listeners to all other connected devices.
 */

import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase.js';
import type { GrammarRule, CorpusEntry, DictionaryEntry } from '../types/index.js';

type RulesSubscriber = (rules: GrammarRule[]) => void;
type CorpusSubscriber = (corpus: CorpusEntry[]) => void;
type DictSubscriber = (dict: DictionaryEntry[]) => void;
type StatsSubscriber = (stats: { rulesCount: number; corpusCount: number; docsCount: number }) => void;
type NewRuleSubscriber = (rule: GrammarRule) => void;

class RealtimeSyncManager {
  private rulesSubscribers: Set<RulesSubscriber> = new Set();
  private corpusSubscribers: Set<CorpusSubscriber> = new Set();
  private dictSubscribers: Set<DictSubscriber> = new Set();
  private statsSubscribers: Set<StatsSubscriber> = new Set();
  private newRuleSubscribers: Set<NewRuleSubscriber> = new Set();

  private cachedRules: GrammarRule[] = [];
  private cachedCorpus: CorpusEntry[] = [];
  private cachedDict: DictionaryEntry[] = [];
  private knownRuleIds: Set<string> = new Set();
  private isInitialRulesLoad: boolean = true;
  private isInitialCorpusLoad: boolean = true;

  private unsubRules: Unsubscribe | null = null;
  private unsubCorpus: Unsubscribe | null = null;
  private unsubDict: Unsubscribe | null = null;
  private unsubDocs: Unsubscribe | null = null;
  private cachedDocsCount: number = 0;

  private isStarted: boolean = false;

  public start(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    console.log('[Realtime Sync] Initializing cross-device Firebase Firestore real-time listeners for attalibrary-1761f...');

    try {
      // 1. Real-time Grammar Rules Listener
      const rulesCol = collection(db, 'grammar_rules');
      this.unsubRules = onSnapshot(
        rulesCol,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const rules: GrammarRule[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as GrammarRule;
            rules.push({ ...data, id: data.id || docSnap.id });
          });

          // Sort by creation date (newest first)
          rules.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          // Detect newly arrived learned rules from other devices
          if (!this.isInitialRulesLoad) {
            for (const r of rules) {
              if (!this.knownRuleIds.has(r.id) && r.status !== 'deprecated') {
                console.log(`[Realtime Sync] ⚡ New learned rule broadcast received from cloud: "${r.title}"`);
                this.newRuleSubscribers.forEach((cb) => cb(r));
              }
            }
          }

          this.knownRuleIds = new Set(rules.map((r) => r.id));
          this.cachedRules = rules;
          this.isInitialRulesLoad = false;

          // Notify all subscribers
          this.rulesSubscribers.forEach((cb) => cb(rules));
          this.broadcastStats();
        },
        (error) => {
          console.warn('[Realtime Sync] Grammar rules listener warning:', error.message);
        }
      );

      // 2. Real-time Corpus / Translation Corrections Listener
      const corpusCol = collection(db, 'corpus');
      this.unsubCorpus = onSnapshot(
        corpusCol,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const corpus: CorpusEntry[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as CorpusEntry;
            corpus.push({ ...data, id: data.id || docSnap.id });
          });

          corpus.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          this.cachedCorpus = corpus;
          this.isInitialCorpusLoad = false;

          this.corpusSubscribers.forEach((cb) => cb(corpus));
          this.broadcastStats();
        },
        (error) => {
          console.warn('[Realtime Sync] Corpus listener warning:', error.message);
        }
      );

      // 3. Real-time Dictionary Listener
      const dictCol = collection(db, 'dictionary');
      this.unsubDict = onSnapshot(
        dictCol,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const entries: DictionaryEntry[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as DictionaryEntry;
            entries.push({ ...data, id: data.id || docSnap.id });
          });
          this.cachedDict = entries;
          this.dictSubscribers.forEach((cb) => cb(entries));
        },
        (error) => {
          console.warn('[Realtime Sync] Dictionary listener warning:', error.message);
        }
      );

      // 4. Real-time Knowledge Documents Count Listener
      const docsCol = collection(db, 'knowledge_documents');
      this.unsubDocs = onSnapshot(
        docsCol,
        (snapshot: QuerySnapshot<DocumentData>) => {
          this.cachedDocsCount = snapshot.size;
          this.broadcastStats();
        },
        (error) => {
          console.warn('[Realtime Sync] Knowledge documents listener warning:', error.message);
        }
      );
    } catch (err) {
      console.error('[Realtime Sync] Error starting Firestore real-time synchronization:', err);
    }
  }

  private broadcastStats(): void {
    const stats = {
      rulesCount: this.cachedRules.filter((r) => r.status !== 'deprecated').length,
      corpusCount: this.cachedCorpus.length,
      docsCount: this.cachedDocsCount,
    };
    this.statsSubscribers.forEach((cb) => cb(stats));
  }

  public subscribeRules(callback: RulesSubscriber): () => void {
    this.rulesSubscribers.add(callback);
    if (this.cachedRules.length > 0) {
      callback(this.cachedRules);
    }
    this.start();
    return () => this.rulesSubscribers.delete(callback);
  }

  public subscribeCorpus(callback: CorpusSubscriber): () => void {
    this.corpusSubscribers.add(callback);
    if (this.cachedCorpus.length > 0) {
      callback(this.cachedCorpus);
    }
    this.start();
    return () => this.corpusSubscribers.delete(callback);
  }

  public subscribeDictionary(callback: DictSubscriber): () => void {
    this.dictSubscribers.add(callback);
    if (this.cachedDict.length > 0) {
      callback(this.cachedDict);
    }
    this.start();
    return () => this.dictSubscribers.delete(callback);
  }

  public subscribeStats(callback: StatsSubscriber): () => void {
    this.statsSubscribers.add(callback);
    callback({
      rulesCount: this.cachedRules.filter((r) => r.status !== 'deprecated').length,
      corpusCount: this.cachedCorpus.length,
      docsCount: this.cachedDocsCount,
    });
    this.start();
    return () => this.statsSubscribers.delete(callback);
  }

  public subscribeNewRule(callback: NewRuleSubscriber): () => void {
    this.newRuleSubscribers.add(callback);
    this.start();
    return () => this.newRuleSubscribers.delete(callback);
  }

  public getRules(): GrammarRule[] {
    return this.cachedRules;
  }

  public getCorpus(): CorpusEntry[] {
    return this.cachedCorpus;
  }

  public getDictionary(): DictionaryEntry[] {
    return this.cachedDict;
  }

  /**
   * Instantly saves a new learned rule to Firebase Firestore (attalibrary-1761f)
   * Broadcasts immediately to all other connected devices across the globe.
   */
  public async saveLearnedRule(rule: GrammarRule): Promise<void> {
    try {
      const ruleRef = doc(db, 'grammar_rules', rule.id);
      await setDoc(ruleRef, sanitizeForFirestore(rule));
      console.log(`[Realtime Sync] Rule "${rule.title}" broadcasted to Firestore attalibrary-1761f`);
    } catch (err) {
      console.error('[Realtime Sync] Failed to directly save rule to Firestore:', err);
    }
  }

  /**
   * Instantly saves a translation correction into the central Firestore corpus
   */
  public async saveCorpusCorrection(entry: CorpusEntry): Promise<void> {
    try {
      const entryRef = doc(db, 'corpus', entry.id);
      await setDoc(entryRef, sanitizeForFirestore(entry));
      console.log(`[Realtime Sync] Correction "${entry.sourceText}" broadcasted to Firestore attalibrary-1761f`);
    } catch (err) {
      console.error('[Realtime Sync] Failed to directly save corpus entry to Firestore:', err);
    }
  }
}

export function sanitizeForFirestore<T = any>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const realtimeSync = new RealtimeSyncManager();

// React hook / helper functions for components
export function useRealtimeRules(callback: RulesSubscriber) {
  return realtimeSync.subscribeRules(callback);
}

export function useRealtimeCorpus(callback: CorpusSubscriber) {
  return realtimeSync.subscribeCorpus(callback);
}

export function useRealtimeStats(callback: StatsSubscriber) {
  return realtimeSync.subscribeStats(callback);
}

export function useRealtimeNewRule(callback: NewRuleSubscriber) {
  return realtimeSync.subscribeNewRule(callback);
}
