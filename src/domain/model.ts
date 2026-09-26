import { z } from 'zod';

export const claimKinds = ['skill', 'project', 'experience', 'achievement'] as const;
export const testedVerdicts = ['defended', 'shaky', 'exposed'] as const;

const text = (max: number) => z.string().min(1).max(max);

export const claimSchema = z.object({
  id: text(12),
  kind: z.enum(claimKinds),
  resumeLine: text(300),
  focus: text(160),
  openingQuestion: text(400),
});

export const extractionSchema = z.object({ claims: z.array(claimSchema).max(8) });

export const assessmentSchema = z.object({
  verdict: z.enum(testedVerdicts),
  depthReached: z.number().int().min(0).max(3),
  evidence: z.string().max(400),
  gap: z.string().max(400),
  decision: z.enum(['probe', 'conclude']),
  nextQuestion: z.string().max(400),
});

export const fixPlanSchema = z.object({
  learn: z.array(text(160)).min(1).max(3),
  practiceQuestion: text(400),
  honestRewrite: text(300),
});

export type Claim = z.infer<typeof claimSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type FixPlan = z.infer<typeof fixPlanSchema>;
export type TestedVerdict = (typeof testedVerdicts)[number];
export type Verdict = TestedVerdict | 'untested';

export interface Turn {
  question: string;
  answer: string;
}

export interface ClaimResult {
  verdict: Verdict;
  depthReached: number;
  evidence: string;
  gap: string;
}

export interface ClaimState {
  claim: Claim;
  turns: Turn[];
  result: ClaimResult;
  fixPlan?: FixPlan;
}
