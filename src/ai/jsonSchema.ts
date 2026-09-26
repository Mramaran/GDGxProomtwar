import { z } from 'zod';

const KEPT_KEYWORDS = new Set(['type', 'properties', 'required', 'items', 'enum', 'minimum', 'maximum', 'minItems', 'maxItems']);

/** Converts a Zod schema to the JSON Schema subset used for Gemini structured output. */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return prune(z.toJSONSchema(schema)) as Record<string, unknown>;
}

function prune(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(prune);
  if (node === null || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'properties') {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([name, child]) => [name, prune(child)]),
      );
    } else if (KEPT_KEYWORDS.has(key)) {
      out[key] = prune(value);
    }
  }
  return out;
}
