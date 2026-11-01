import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, (firebaseConfig as any).firestoreDatabaseId || undefined);
  } catch {
    return getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || undefined);
  }
})();

// Validate Connection to Firestore on boot (as required by Firebase skill)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('the client is offline or connection timed out')), 3500)
    );
    await Promise.race([testPromise, timeoutPromise]);
    console.log('[Firebase] Connected to Firestore database:', (firebaseConfig as any).firestoreDatabaseId);
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('timed out') || error.message.includes('backend'))) {
      console.warn('[Firebase] Firestore operating in local cache / offline mode until backend responds.');
    } else {
      console.warn('[Firebase] Firestore check note:', error);
    }
    return false;
  }
}

