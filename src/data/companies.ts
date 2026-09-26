import { z } from 'zod';
import raw from './companies.json';

const list = z.array(z.string());

const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reports: z.number().int().nonnegative(),
  roles: list,
  rounds: z.array(z.object({ name: z.string(), format: z.string(), focus: list })),
  techTopics: list,
  sampleQuestions: list,
  hrQuestions: list,
  tips: list,
  resources: list.default([]),
});

/** Anonymised company profile distilled from past candidates' placement interview reports. */
export type CompanyProfile = z.infer<typeof companySchema>;

/** Keeps only well-formed profiles, sorted by name. */
export function parseCompanies(data: unknown): CompanyProfile[] {
  if (!Array.isArray(data)) return [];
  return data
    .flatMap((item) => {
      const parsed = companySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const companies = parseCompanies(raw);

export function findCompany(id: string): CompanyProfile | null {
  return companies.find((company) => company.id === id) ?? null;
}
