import { expect, it } from 'vitest';
import { assessmentSchema } from '../domain/model';
import { toGeminiJsonSchema } from './jsonSchema';

it('keeps structure and drops keywords Gemini does not need', () => {
  const schema = toGeminiJsonSchema(assessmentSchema);
  const text = JSON.stringify(schema);
  expect(text).not.toContain('$schema');
  expect(text).not.toContain('additionalProperties');
  expect(text).not.toContain('maxLength');
  expect(schema).toMatchObject({
    type: 'object',
    properties: { verdict: { type: 'string', enum: ['defended', 'shaky', 'exposed'] } },
  });
  expect(schema.required).toEqual(expect.arrayContaining(['verdict', 'decision', 'nextQuestion']));
});
