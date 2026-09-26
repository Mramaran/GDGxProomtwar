import { describe, expect, it, vi } from 'vitest';
import type { Claim } from '../domain/model';
import { friendlyError, UserFacingError } from '../lib/errors';
import { createRateLimiter } from '../lib/rateLimiter';
import { createAiClient, type GenerateText } from './client';

const claim: Claim = {
  id: 'c1',
  kind: 'project',
  resumeLine: 'Built a REST API with JWT auth',
  focus: 'JWT auth',
  openingQuestion: 'How does token refresh work?',
};

const assessment = {
  verdict: 'shaky',
  depthReached: 1,
  evidence: 'tokens expire',
  gap: 'refresh token rotation',
  decision: 'probe',
  nextQuestion: 'Where do you store the refresh token?',
};

const openLimiter = () => createRateLimiter(100, 60_000);

describe('createAiClient', () => {
  it('parses a valid structured response and sends a JSON schema', async () => {
    const generate = vi.fn<GenerateText>().mockResolvedValue(JSON.stringify(assessment));
    const client = createAiClient(generate, openLimiter());
    await expect(client.assess(claim, [{ question: 'Q', answer: 'A' }], null)).resolves.toEqual(assessment);
    const request = generate.mock.calls[0][0];
    expect(request.responseJsonSchema).toHaveProperty('properties.verdict');
    expect(request.prompt).toContain('Built a REST API with JWT auth');
  });

  it('retries once when the model returns invalid JSON', async () => {
    const generate = vi
      .fn<GenerateText>()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce(JSON.stringify(assessment));
    const client = createAiClient(generate, openLimiter());
    await expect(client.assess(claim, [], null)).resolves.toMatchObject({ verdict: 'shaky' });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('gives up with a user-facing error after two bad responses', async () => {
    const generate = vi.fn<GenerateText>().mockResolvedValue('{"verdict":"amazing"}');
    const client = createAiClient(generate, openLimiter());
    await expect(client.assess(claim, [], null)).rejects.toBeInstanceOf(UserFacingError);
  });

  it('sends the PDF with the extraction request and returns claims', async () => {
    const generate = vi.fn<GenerateText>().mockResolvedValue(JSON.stringify({ claims: [claim] }));
    const client = createAiClient(generate, openLimiter());
    await expect(client.extractClaims('BASE64', null)).resolves.toEqual([claim]);
    expect(generate.mock.calls[0][0].pdfBase64).toBe('BASE64');
  });

  it('uses the quality tier to read the resume and the fast tier for interview turns', async () => {
    const generate = vi
      .fn<GenerateText>()
      .mockResolvedValueOnce(JSON.stringify({ claims: [claim] }))
      .mockResolvedValueOnce(JSON.stringify(assessment));
    const client = createAiClient(generate, openLimiter());
    await client.extractClaims('BASE64', null);
    await client.assess(claim, [], null);
    expect(generate.mock.calls.map(([request]) => request.tier)).toEqual(['quality', 'fast']);
  });

  it('falls back to the fast tier when the quality model is out of quota', async () => {
    const generate = vi
      .fn<GenerateText>()
      .mockRejectedValueOnce(new Error('[429] RESOURCE_EXHAUSTED: quota exceeded'))
      .mockResolvedValueOnce(JSON.stringify({ claims: [claim] }));
    const client = createAiClient(generate, openLimiter());
    await expect(client.extractClaims('BASE64', null)).resolves.toEqual([claim]);
    expect(generate.mock.calls.map(([request]) => request.tier)).toEqual(['quality', 'fast']);
  });

  it('refuses calls beyond the rate limit without calling the model', async () => {
    const generate = vi.fn<GenerateText>();
    const client = createAiClient(generate, createRateLimiter(0, 60_000));
    const result = { verdict: 'exposed' as const, depthReached: 0, evidence: '', gap: '' };
    await expect(client.fixPlan(claim, result, null)).rejects.toThrow(/slow down/i);
    expect(generate).not.toHaveBeenCalled();
  });
});

describe('friendlyError', () => {
  it('explains rate limits', () => {
    expect(friendlyError(new Error('429 quota exceeded'))).toMatch(/busy/i);
  });

  it('passes user-facing messages through', () => {
    expect(friendlyError(new UserFacingError('custom'))).toBe('custom');
  });

  it('explains a project where Firebase AI Logic is not enabled', () => {
    const error = new Error('AI: The Firebase AI SDK requires the Firebase AI API to be enabled. (AI/api-not-enabled)');
    expect(friendlyError(error)).toMatch(/not enabled/i);
  });

  it('does not mistake words like "generate" for a rate limit', () => {
    expect(friendlyError(new Error('Failed to generate content'))).not.toMatch(/busy/i);
  });
});
