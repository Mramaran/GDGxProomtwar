import { describe, expect, it } from 'vitest';
import type { Assessment, Claim } from './model';
import { defensibilityScore, initialSession, MAX_TURNS_PER_CLAIM, sessionReducer, type SessionState } from './session';

const claim = (id: string): Claim => ({
  id,
  kind: 'project',
  resumeLine: `Line ${id}`,
  focus: 'focus',
  openingQuestion: `Open ${id}?`,
});

const assess = (overrides: Partial<Assessment> = {}): Assessment => ({
  verdict: 'defended',
  depthReached: 1,
  evidence: 'quote',
  gap: '',
  decision: 'conclude',
  nextQuestion: '',
  ...overrides,
});

const started = (): SessionState =>
  sessionReducer(sessionReducer(initialSession, { type: 'extractStarted', companyId: 'zoho' }), {
    type: 'claimsExtracted',
    claims: [claim('c1'), claim('c2')],
  });

describe('sessionReducer', () => {
  it('starts the interview on the first claim', () => {
    const s = started();
    expect(s.phase).toBe('interview');
    expect(s.companyId).toBe('zoho');
    expect(s.currentQuestion).toBe('Open c1?');
    expect(s.claims.every((c) => c.result.verdict === 'untested')).toBe(true);
  });

  it('returns to start with an error when no claims are found', () => {
    const extracting = sessionReducer(initialSession, { type: 'extractStarted', companyId: 'general' });
    const s = sessionReducer(extracting, { type: 'claimsExtracted', claims: [] });
    expect(s.phase).toBe('start');
    expect(s.error).toMatch(/no resume claims/i);
  });

  it('asks the follow-up when the model decides to probe', () => {
    const s = sessionReducer(started(), {
      type: 'answerAssessed',
      answer: 'A1',
      assessment: assess({ decision: 'probe', nextQuestion: 'Deeper?', verdict: 'shaky' }),
    });
    expect(s.activeIndex).toBe(0);
    expect(s.currentQuestion).toBe('Deeper?');
    expect(s.claims[0].turns).toEqual([{ question: 'Open c1?', answer: 'A1' }]);
    expect(s.claims[0].result.verdict).toBe('shaky');
  });

  it('moves to the next claim after the maximum number of turns', () => {
    let s = started();
    for (let i = 0; i < MAX_TURNS_PER_CLAIM; i++) {
      s = sessionReducer(s, {
        type: 'answerAssessed',
        answer: `A${i}`,
        assessment: assess({ decision: 'probe', nextQuestion: 'More?' }),
      });
    }
    expect(s.activeIndex).toBe(1);
    expect(s.currentQuestion).toBe('Open c2?');
    expect(s.claims[0].turns).toHaveLength(MAX_TURNS_PER_CLAIM);
  });

  it('shows results after the last claim concludes', () => {
    let s = sessionReducer(started(), { type: 'answerAssessed', answer: 'A', assessment: assess() });
    s = sessionReducer(s, { type: 'answerAssessed', answer: 'B', assessment: assess({ verdict: 'exposed' }) });
    expect(s.phase).toBe('results');
    expect(s.claims.map((c) => c.result.verdict)).toEqual(['defended', 'exposed']);
  });

  it('finishes early and leaves unanswered claims untested', () => {
    const s = sessionReducer(started(), { type: 'finishNow' });
    expect(s.phase).toBe('results');
    expect(s.claims[1].result.verdict).toBe('untested');
  });

  it('re-defends a single claim and returns to results', () => {
    let s = sessionReducer(started(), { type: 'finishNow' });
    s = sessionReducer(s, {
      type: 'fixPlanLoaded',
      claimId: 'c2',
      fixPlan: { learn: ['x'], practiceQuestion: 'q', honestRewrite: 'r' },
    });
    s = sessionReducer(s, { type: 'redefendStarted', claimId: 'c2' });
    expect(s.phase).toBe('interview');
    expect(s.currentQuestion).toBe('Open c2?');
    expect(s.claims[1].fixPlan).toBeUndefined();
    s = sessionReducer(s, { type: 'answerAssessed', answer: 'Good', assessment: assess() });
    expect(s.phase).toBe('results');
    expect(s.claims[1].result.verdict).toBe('defended');
  });

  it('returns to start when extraction fails', () => {
    const extracting = sessionReducer(initialSession, { type: 'extractStarted', companyId: 'general' });
    const s = sessionReducer(extracting, { type: 'failed', message: 'boom' });
    expect(s.phase).toBe('start');
    expect(s.error).toBe('boom');
  });
});

describe('defensibilityScore', () => {
  it('averages tested claims only', () => {
    let s = sessionReducer(started(), { type: 'answerAssessed', answer: 'A', assessment: assess({ verdict: 'shaky' }) });
    s = sessionReducer(s, { type: 'finishNow' });
    expect(defensibilityScore(s.claims)).toBe(50);
  });

  it('is null when nothing was tested', () => {
    expect(defensibilityScore(started().claims)).toBeNull();
  });
});
