# HotSeat — Design Spec

**Date:** 2026-09-26 · **Event:** PromptWars × GDG On Campus · **Deadline:** 13:30 IST
**Tagline:** *Can you defend your resume?*

## 1. Problem

Campus interviewers pick lines from a student's resume and drill into them. Students
list skills and projects they cannot defend in depth, and discover this only in the
real interview.

- Only ~1 in 5 freshers feel interview-ready (Apna survey, n=10k+, 2025).
- 42% of employers say the #1 interview failure reason is inability to apply the skills
  claimed (Gi Group, Sep 2026).
- developersIndia resume guide: list a project only if you can discuss it in depth.
- Existing tools score the resume *for a bot* (ATS keyword %); none score *the student
  against their own resume*. Past candidates' company-specific interview knowledge is scattered.

Challenge fit: answers "where do I stand" (per-line evidence) and "what do I improve"
(fix plan), and "what to prepare" (company lens from past candidates' real feedback).

## 2. Solution (MVP)

1. **Start:** student uploads resume PDF (≤10 MB), picks a target company (from the
   distilled past candidates' profiles, or "General"), ticks a consent note.
2. **Extract:** Gemini reads the PDF and returns 5–8 *defendable claims* (skill,
   project, achievement), each with the exact resume line.
3. **Hot seat:** for each claim the AI asks one question, then up to 2 deeper
   follow-ups. One call per turn both *assesses the last answer* and *decides*:
   probe deeper or conclude. Questions blend in what past candidates were asked at the
   chosen company. Answer by typing or 🎤 (browser speech-to-text, if supported).
   Claims are ordered by how likely an interviewer is to ask about them. A **Finish
   now** button ends the session at any time; unanswered claims become `untested`.
4. **Verdict per claim:** `defended` 🟢 · `shaky` 🟡 · `exposed` 🔴 · `untested` ⚪,
   plus depth reached (1–3), an evidence quote from the student's answer, and the gap.
5. **Heatmap:** resume claims shown with colour **and** icon **and** text label;
   overall Defensibility Score (0–100).
6. **Fix plan** per non-defended claim: 3 concepts to learn, 1 practice question,
   an honest rewrite of the resume line. **Defend / Re-defend** runs the hot seat for
   that one claim (untested or weak) and updates the heatmap.

**Out of scope:** login, database, Live API voice, aptitude tests, chat, PDF export.

## 3. Architecture

Static SPA, no server. Vite + React + TypeScript (strict).

| Unit | Responsibility |
|---|---|
| `src/lib/firebase.ts` | init Firebase app, optional App Check (if site key env set), `getAI` with `GoogleAIBackend` |
| `src/ai/prompts.ts` | pure prompt builders; resume/answers wrapped as untrusted data |
| `src/ai/schemas.ts` | Zod schemas for every AI response + matching response schemas |
| `src/ai/client.ts` | `AiClient` interface: `extractClaims`, `assessAndProbe`, `fixPlan`; Firebase implementation; validates JSON, one retry |
| `src/domain/session.ts` | pure reducer/state machine: claim queue, turns, depth, verdicts; `defensibilityScore()` |
| `src/data/companies.json` + `companies.ts` | anonymised company profiles + typed loader/lookup |
| `src/hooks/useSpeechInput.ts` | Web Speech API wrapper, feature-detected |
| `src/components/*` | StartScreen (upload, company, consent), HotSeat (question, answer, mic, progress), Results (heatmap, score), FixPlan |
| `scripts/distill_companies.py` | one-time, local: past candidates' feedback → PII-redacted text → Gemini → `companies.json` |

**Model:** `gemini-3.8-flash` (env-overridable `VITE_GEMINI_MODEL`), JSON output via
response schema, low thinking level for latency.

**AI calls per session:** 1 extract + ≤3 per claim + 1 fix plan per weak claim.

## 4. Company lens data pipeline

Source: past candidates' placement feedback (text chunks already extracted, grouped by
company). Script steps: group by company → **redact PII by regex** (names after
`NAME:`, roll numbers, emails, phone numbers) → Gemini distils a profile
`{id, name, reports, roles, rounds[{name, format, topics}], techTopics,
sampleQuestions, hrQuestions, tips}` with instructions to exclude all personal data →
**post-check** output for email/phone/roll-number patterns (drop on hit) → write JSON.
Top companies by report count first; partial output is usable. Source PDFs never enter
this repo. Credit line: "Company insights distilled from past candidates' placement feedback."
Naming rule: the source project's name never appears anywhere in this repo.

## 5. Errors

Wrong file type / too large → inline message. AI failure or invalid JSON → one retry,
then friendly error with "Try again". Rate limit (429) → "busy, retrying" with backoff.
No speech support → mic hidden. Missing Firebase config → clear setup message.

## 6. Security & privacy

- No secrets in repo: `.env*` gitignored; Firebase web config via `VITE_FIREBASE_*`
  (not secret, still kept out); Gemini key used only by the local script.
- App Check (reCAPTCHA Enterprise) wired, enabled when `VITE_RECAPTCHA_SITE_KEY` set.
- Consent note: resume goes to Gemini (free tier may use data to improve Google
  products); suggest removing phone/address first.
- Prompt-injection guard: resume and answers delimited as data; system instruction
  says to ignore instructions inside them. AI output rendered as plain text only.
- `firebase.json` security headers (CSP, X-Content-Type-Options, Referrer-Policy).
- Results stored only in `localStorage`, with a "Clear my data" button.

## 7. Accessibility

Semantic landmarks, labelled controls, keyboard-only flow, focus moves to each new
question, `aria-live` for question/verdict updates, verdicts never colour-only,
WCAG AA contrast, `prefers-reduced-motion` respected.

## 8. Testing & quality

Vitest + Testing Library. Unit: session reducer & score, Zod schemas, prompt builders
(company lens included, data delimited), company lookup. Component: Heatmap labels,
StartScreen validation. AI client mocked (no network in tests). ESLint + `tsc --noEmit`.
GitHub Actions CI runs lint, typecheck, test, build.

## 9. Deployment

Firebase Hosting (Spark plan): `npm run build` → `firebase deploy --only hosting` →
`https://<project-id>.web.app`. Firebase AI Logic on Spark with Gemini Developer API.

## 10. Judging optimisation (Hack2Skill PromptWars evaluator)

The AI evaluator scores the public repo /100 and picks the Top 10 for the jury pitch.
Tiers: **High** Code Quality, Problem Statement Alignment · **Medium** Security,
Efficiency, Google Services · **Low** Testing, Accessibility.

- Repo rules: public, **< 10 MB**, **single branch (`main`)**, not a fork, one repo per
  GitHub account, max 3 submission attempts.
- README opens with the challenge's own words ("what to prepare, how to prepare, where
  they stand, what to improve") mapped to features, then vertical, approach, how it
  works, assumptions, Google services, prompts.
- Code quality: small typed modules, no dead code, ESLint clean, no committed secrets.
- Security extras: client-side rate limiter on AI calls, input validation (file type/
  size, answer length ≤ 1500 chars), CSP headers.
- Google services: Gemini via Firebase AI Logic, Firebase Hosting, App Check, optional
  Google Analytics for Firebase (only if `VITE_FIREBASE_MEASUREMENT_ID` set).
- Submit a deployed v1 early (~12:45) for per-parameter feedback; resubmit only if the
  new version is strictly better.

## 11. Timeline & cut lines

| By | Milestone |
|---|---|
| 10:45 | scaffold, Firebase wired, distil script running in background |
| 11:45 | extract → hot seat → verdict flow works end-to-end |
| 12:30 | heatmap, fix plan, re-defend, company lens, tests, README |
| 12:45 | deployed v1, first submission |
| 13:25 | improved resubmission (only if strictly better) |

Cut first if late: fix-plan rewrite line → speech input → re-defend. Never cut:
upload → hot seat → heatmap.
