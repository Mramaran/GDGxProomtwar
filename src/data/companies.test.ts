import { describe, expect, it } from 'vitest';
import { findCompany, parseCompanies } from './companies';

const profile = (id: string, name: string) => ({
  id,
  name,
  reports: 1,
  roles: [],
  rounds: [],
  techTopics: [],
  sampleQuestions: [],
  hrQuestions: [],
  tips: [],
});

describe('companies', () => {
  it('skips malformed entries and sorts by name', () => {
    const result = parseCompanies([profile('z', 'Zoho'), { id: 'bad' }, profile('a', 'Accenture')]);
    expect(result.map((c) => c.name)).toEqual(['Accenture', 'Zoho']);
  });

  it('returns an empty list for non-array data', () => {
    expect(parseCompanies({})).toEqual([]);
  });

  it('treats "general" as no specific company', () => {
    expect(findCompany('general')).toBeNull();
  });
});
