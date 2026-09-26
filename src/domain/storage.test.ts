import { describe, expect, it } from 'vitest';
import { initialSession } from './session';
import { clearSession, loadSession, saveSession } from './storage';

describe('session storage', () => {
  it('round-trips a session', () => {
    const state = { ...initialSession, phase: 'results' as const, companyId: 'zoho' };
    saveSession(state);
    expect(loadSession()).toEqual(state);
  });

  it('falls back to a fresh session on corrupt data', () => {
    localStorage.setItem('hotseat.session.v1', '{not json');
    expect(loadSession()).toEqual(initialSession);
  });

  it('sends an interrupted extraction back to the start screen', () => {
    saveSession({ ...initialSession, phase: 'extracting' });
    expect(loadSession().phase).toBe('start');
  });

  it('clears saved data', () => {
    saveSession({ ...initialSession, phase: 'results' });
    clearSession();
    expect(loadSession()).toEqual(initialSession);
  });
});
