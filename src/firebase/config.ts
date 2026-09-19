import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

/**
 * `apiKey` and `authDomain` are additive, and Firebase Authentication does not
 * work without them.
 *
 * This config carried only `databaseURL` and `projectId`, which is all an
 * UNAUTHENTICATED Realtime Database client needs — and unauthenticated is
 * exactly what every client here was. Signing in with a custom token calls
 * Google's Identity Toolkit, which identifies the project by `apiKey`, so
 * leaving it out makes `signInWithCustomToken` fail before it reaches the
 * network.
 *
 * A Firebase web API key is not a secret. It identifies the project rather than
 * authorising anything, which is why it is expected to ship inside the bundle;
 * what protects the data is the security rules, not the key. It still comes from
 * the environment rather than being hardcoded, because it differs per project
 * and this file should not have to change to point at another one.
 */
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || '',
  authDomain:
    (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'capstonedata-3589c.firebaseapp.com',
  databaseURL: (import.meta as any).env?.VITE_FIREBASE_DATABASE_URL || 'https://capstonedata-3589c-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'capstonedata-3589c',
};

/** True when this build can actually authenticate, rather than only connect. */
export const isFirebaseAuthConfigured = Boolean(firebaseConfig.apiKey);

export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const database = getDatabase(firebaseApp);
