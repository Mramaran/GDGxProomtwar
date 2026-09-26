import type { Assessment, Claim, ClaimResult, ClaimState, FixPlan, TestedVerdict } from './model';

export const MAX_TURNS_PER_CLAIM = 3;

export type Phase = 'start' | 'extracting' | 'interview' | 'results';

export interface SessionState {
  phase: Phase;
  companyId: string;
  claims: ClaimState[];
  /** Index of the claim being defended, or -1 when none is active. */
  activeIndex: number;
  currentQuestion: string;
  /** True while re-defending one claim from the results screen. */
  singleClaim: boolean;
  error: string;
}

export type SessionAction =
  | { type: 'extractStarted'; companyId: string }
  | { type: 'claimsExtracted'; claims: Claim[] }
  | { type: 'answerAssessed'; answer: string; assessment: Assessment }
  | { type: 'finishNow' }
  | { type: 'redefendStarted'; claimId: string }
  | { type: 'fixPlanLoaded'; claimId: string; fixPlan: FixPlan }
  | { type: 'failed'; message: string }
  | { type: 'reset' };

export const initialSession: SessionState = {
  phase: 'start',
  companyId: 'general',
  claims: [],
  activeIndex: -1,
  currentQuestion: '',
  singleClaim: false,
  error: '',
};

const untested = (): ClaimResult => ({ verdict: 'untested', depthReached: 0, evidence: '', gap: '' });

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'extractStarted':
      return { ...initialSession, phase: 'extracting', companyId: action.companyId };
    case 'claimsExtracted':
      if (action.claims.length === 0) {
        return { ...state, phase: 'start', error: 'No resume claims found in that file. Please upload your resume PDF.' };
      }
      return {
        ...state,
        phase: 'interview',
        claims: action.claims.map((claim) => ({ claim, turns: [], result: untested() })),
        activeIndex: 0,
        currentQuestion: action.claims[0].openingQuestion,
        singleClaim: false,
        error: '',
      };
    case 'answerAssessed':
      return applyAssessment(state, action.answer, action.assessment);
    case 'finishNow':
      return toResults(state);
    case 'redefendStarted': {
      const index = state.claims.findIndex((c) => c.claim.id === action.claimId);
      if (index < 0) return state;
      const claims = state.claims.map((c, i) => (i === index ? { claim: c.claim, turns: [], result: untested() } : c));
      return {
        ...state,
        phase: 'interview',
        claims,
        activeIndex: index,
        currentQuestion: claims[index].claim.openingQuestion,
        singleClaim: true,
        error: '',
      };
    }
    case 'fixPlanLoaded':
      return {
        ...state,
        error: '',
        claims: state.claims.map((c) => (c.claim.id === action.claimId ? { ...c, fixPlan: action.fixPlan } : c)),
      };
    case 'failed':
      return { ...state, phase: state.phase === 'extracting' ? 'start' : state.phase, error: action.message };
    case 'reset':
      return initialSession;
  }
}

function applyAssessment(state: SessionState, answer: string, assessment: Assessment): SessionState {
  const active = state.claims[state.activeIndex];
  if (!active) return state;
  const turns = [...active.turns, { question: state.currentQuestion, answer }];
  const { verdict, depthReached, evidence, gap } = assessment;
  const claims = state.claims.map((c, i) =>
    i === state.activeIndex ? { ...c, turns, result: { verdict, depthReached, evidence, gap } } : c,
  );
  const probe =
    assessment.decision === 'probe' && assessment.nextQuestion.trim() !== '' && turns.length < MAX_TURNS_PER_CLAIM;
  if (probe) return { ...state, claims, currentQuestion: assessment.nextQuestion, error: '' };
  const next = state.activeIndex + 1;
  if (!state.singleClaim && next < claims.length) {
    return { ...state, claims, activeIndex: next, currentQuestion: claims[next].claim.openingQuestion, error: '' };
  }
  return toResults({ ...state, claims });
}

function toResults(state: SessionState): SessionState {
  return { ...state, phase: 'results', activeIndex: -1, currentQuestion: '', singleClaim: false, error: '' };
}

const VERDICT_POINTS: Record<TestedVerdict, number> = { defended: 100, shaky: 50, exposed: 0 };

/** Average over tested claims (defended 100, shaky 50, exposed 0); null when nothing was tested. */
export function defensibilityScore(claims: ClaimState[]): number | null {
  const tested = claims.flatMap(({ result }) => (result.verdict === 'untested' ? [] : [result.verdict]));
  if (tested.length === 0) return null;
  return Math.round(tested.reduce((sum, verdict) => sum + VERDICT_POINTS[verdict], 0) / tested.length);
}
