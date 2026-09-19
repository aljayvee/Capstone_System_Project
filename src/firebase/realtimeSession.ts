import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type Auth,
} from 'firebase/auth';
import { firebaseApp, isFirebaseAuthConfigured } from './config';
import { apiClient } from '../services/apiClient';

/**
 * The portal's Firebase identity, derived from the session it already holds.
 *
 * ## What this replaces
 *
 * Nothing. There was no Firebase identity at all: `getDatabase()` was called and
 * subscribed to immediately, as an anonymous client. That is why the security
 * rules had to be wide open for the map to work, and why tightening them took
 * out rider tracking, both chat channels and customer location sharing in one
 * go, silently.
 *
 * ## Why a second token is not a second login
 *
 * The user authenticates once, against the existing JWT flow. That flow is a
 * [LOCKED] contract and is untouched. This exchanges the session it produced for
 * a Firebase-shaped assertion of the same identity, so the rules can check who
 * is asking. Nobody types a password twice and there is no second user store.
 */

let auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(firebaseApp);
  return auth;
}

/**
 * In flight, so the several callers that all want a real-time session at mount
 * share one exchange.
 *
 * Without this, the tracking hook, the chat panel and the fleet roster each fire
 * their own `POST /auth/firebase-token` within the same tick, and the last
 * `signInWithCustomToken` to resolve wins while the others churn tokens for
 * nothing. The same single-flight discipline the refresh interceptor already
 * uses, for the same reason.
 */
let inFlight: Promise<boolean> | null = null;

export type RealtimeAuthState = 'signed-in' | 'signed-out' | 'unavailable';

let lastState: RealtimeAuthState = 'signed-out';
const listeners = new Set<(state: RealtimeAuthState) => void>();

function publish(state: RealtimeAuthState) {
  lastState = state;
  listeners.forEach((listener) => listener(state));
}

export function onRealtimeAuthChange(listener: (state: RealtimeAuthState) => void): () => void {
  listeners.add(listener);
  listener(lastState);
  return () => listeners.delete(listener);
}

export function realtimeAuthState(): RealtimeAuthState {
  return lastState;
}

/**
 * Ensures this tab has a Firebase session, minting one if it does not.
 *
 * Resolves false rather than throwing. A failure here must degrade the live map
 * and the chat panes, never break the page: the portal's real work runs over the
 * REST API, which is unaffected by anything that happens in this file.
 */
export async function ensureRealtimeSession(): Promise<boolean> {
  if (!isFirebaseAuthConfigured) {
    publish('unavailable');
    return false;
  }

  if (getFirebaseAuth().currentUser) {
    publish('signed-in');
    return true;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await apiClient.post('/auth/firebase-token');
      const token = res.data?.token;
      if (!token) throw new Error('No token in response');

      await signInWithCustomToken(getFirebaseAuth(), token);
      publish('signed-in');
      return true;
    } catch {
      // Includes the 503 the server returns when no service account is
      // configured. Treated the same as any other failure on purpose: from this
      // side both mean "no real-time identity", and the operator-facing reason
      // is already in the server log.
      publish('unavailable');
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Drops the Firebase session. Called on sign-out.
 *
 * Leaving it behind would keep this browser holding a credential for an account
 * that has signed out, and the RTDB session would go on reading rider positions
 * after the portal believes nobody is logged in.
 */
export async function endRealtimeSession(): Promise<void> {
  if (!isFirebaseAuthConfigured) return;
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // A failed sign-out must not block the app's own logout, which has already
    // cleared the session that matters.
  }
  publish('signed-out');
}

// Keeps `lastState` honest when the SDK ends a session on its own — a revoked
// key or a disabled account, neither of which routes through the calls above.
if (isFirebaseAuthConfigured) {
  onAuthStateChanged(getFirebaseAuth(), (user) => {
    if (!user && lastState === 'signed-in') publish('signed-out');
  });
}
