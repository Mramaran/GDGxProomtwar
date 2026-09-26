import type { z } from 'zod';
import type { CompanyProfile } from '../data/companies';
import {
  assessmentSchema,
  extractionSchema,
  fixPlanSchema,
  type Assessment,
  type Claim,
  type ClaimResult,
  type FixPlan,
  type Turn,
} from '../domain/model';
import { isQuotaError, UserFacingError } from '../lib/errors';
import type { RateLimiter } from '../lib/rateLimiter';
import { toGeminiJsonSchema } from './jsonSchema';
import { assessPrompt, extractClaimsPrompt, fixPlanPrompt } from './prompts';

/** `quality` reads the resume once; `fast` keeps each interview turn quick. */
export type ModelTier = 'quality' | 'fast';

export interface GenerateRequest {
  prompt: string;
  tier: ModelTier;
  pdfBase64?: string;
  responseJsonSchema: Record<string, unknown>;
}

/** Sends one prompt to the model and resolves with its raw text response. */
export type GenerateText = (request: GenerateRequest) => Promise<string>;

export interface AiClient {
  extractClaims(pdfBase64: string, company: CompanyProfile | null): Promise<Claim[]>;
  assess(claim: Claim, turns: Turn[], company: CompanyProfile | null): Promise<Assessment>;
  fixPlan(claim: Claim, result: ClaimResult, company: CompanyProfile | null): Promise<FixPlan>;
}

const MAX_ATTEMPTS = 2;

export function createAiClient(generate: GenerateText, limiter: RateLimiter): AiClient {
  /** Keeps the app working when the quality model's free quota runs out by retrying on the fast tier. */
  async function generateWithFallback(request: GenerateRequest): Promise<string> {
    try {
      return await generate(request);
    } catch (error) {
      if (request.tier === 'quality' && isQuotaError(error)) return generate({ ...request, tier: 'fast' });
      throw error;
    }
  }

  async function ask<T>(schema: z.ZodType<T>, request: Omit<GenerateRequest, 'responseJsonSchema'>): Promise<T> {
    const responseJsonSchema = toGeminiJsonSchema(schema);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (!limiter.tryAcquire()) {
        const seconds = Math.ceil(limiter.retryAfterMs() / 1000);
        throw new UserFacingError(`Slow down a little: try again in ${seconds} seconds.`);
      }
      const parsed = schema.safeParse(parseJson(await generateWithFallback({ ...request, responseJsonSchema })));
      if (parsed.success) return parsed.data;
    }
    throw new UserFacingError('The AI returned an unexpected answer. Please try again.');
  }

  return {
    extractClaims: async (pdfBase64, company) =>
      (await ask(extractionSchema, { prompt: extractClaimsPrompt(company), tier: 'quality', pdfBase64 })).claims,
    assess: (claim, turns, company) =>
      ask(assessmentSchema, { prompt: assessPrompt(claim, turns, company), tier: 'fast' }),
    fixPlan: (claim, result, company) =>
      ask(fixPlanSchema, { prompt: fixPlanPrompt(claim, result, company), tier: 'fast' }),
  };
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
