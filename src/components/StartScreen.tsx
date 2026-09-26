import { useId, useState, type FormEvent } from 'react';
import type { CompanyProfile } from '../data/companies';
import { validateResumeFile } from '../lib/pdf';
import { PrepGuide } from './PrepGuide';

interface StartScreenProps {
  companies: CompanyProfile[];
  busy: boolean;
  error: string;
  onStart: (file: File, companyId: string) => void;
}

export function StartScreen({ companies, busy, error, onStart }: StartScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState('general');
  const [consent, setConsent] = useState(false);
  const hintId = useId();
  const fileError = file ? validateResumeFile(file) : null;
  const message = fileError ?? error;
  const selectedCompany = companies.find((company) => company.id === companyId) ?? null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (file && !fileError && consent && !busy) onStart(file, companyId);
  }

  return (
    <section className="card" aria-labelledby="start-title">
      <h2 id="start-title">Put your resume in the hot seat</h2>
      <p>
        Interviewers pick lines from your resume and dig until you run out of answers. HotSeat does it first, line by
        line, and shows you exactly which claims you can defend.
      </p>
      <ol className="steps">
        <li>Upload your resume and pick the company you are preparing for.</li>
        <li>Answer the follow-up questions on each claim, typed or spoken.</li>
        <li>See which lines hold up, and get a fix plan for the rest.</li>
      </ol>
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          <span>Resume (PDF, max 10 MB)</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            aria-describedby={hintId}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <p id={hintId} className="hint">
          Tip: remove your phone number and address before uploading.
        </p>
        <label className="field">
          <span>Target company</span>
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            <option value="general">General (any company)</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.reports} interview reports)
              </option>
            ))}
          </select>
        </label>
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            I understand my resume is sent to Google Gemini to generate questions, and that on the free tier Google may
            use it to improve its products.
          </span>
        </label>
        {message && (
          <p role="alert" className="error">
            {message}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy || !file || Boolean(fileError) || !consent}>
          {busy ? 'Reading your resume…' : 'Start the hot seat'}
        </button>
      </form>
      {selectedCompany && <PrepGuide company={selectedCompany} />}
    </section>
  );
}
