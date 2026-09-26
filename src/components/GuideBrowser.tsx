import { useId, useState } from 'react';
import type { CompanyProfile } from '../data/companies';
import { PrepGuide } from './PrepGuide';

/** Browse any company's preparation guide without uploading a resume. */
export function GuideBrowser({ companies }: { companies: CompanyProfile[] }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? '');
  const selectId = useId();
  const company = companies.find((c) => c.id === companyId) ?? null;

  return (
    <section className="card" aria-labelledby="guides-title">
      <h2 id="guides-title">Preparation guides</h2>
      <p>
        Rounds, areas to prepare, resources, real questions and tips for {companies.length} companies, distilled from
        anonymised placement interview reports.
      </p>
      {companies.length === 0 ? (
        <p>No company guides are available yet.</p>
      ) : (
        <div className="field">
          <label htmlFor={selectId}>Company</label>
          <select id={selectId} value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.reports} interview reports)
              </option>
            ))}
          </select>
        </div>
      )}
      {company && <PrepGuide company={company} />}
    </section>
  );
}
