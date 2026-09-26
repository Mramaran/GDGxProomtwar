import { initialSession, type Phase, type SessionState } from './session';

const KEY = 'hotseat.session.v1';
const PHASES: readonly Phase[] = ['start', 'extracting', 'interview', 'results'];

/** Restores the saved session from this browser only; anything unreadable starts fresh. */
export function loadSession(storage: Storage = localStorage): SessionState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return initialSession;
    const saved = JSON.parse(raw) as SessionState;
    if (!PHASES.includes(saved.phase) || !Array.isArray(saved.claims)) return initialSession;
    return saved.phase === 'extracting' ? { ...saved, phase: 'start' } : saved;
  } catch {
    return initialSession;
  }
}

export function saveSession(state: SessionState, storage: Storage = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the session simply won't survive a reload.
  }
}

export function clearSession(storage: Storage = localStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Nothing stored or storage blocked: nothing to clear.
  }
}
