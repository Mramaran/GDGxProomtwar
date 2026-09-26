import type { CompanyProfile } from '../data/companies';
import type { ClaimState } from '../domain/model';
import { defensibilityScore } from '../domain/session';
import { FixPlanView } from './FixPlanView';
import { PrepGuide } from './PrepGuide';
import { VerdictBadge } from './VerdictBadge';

interface ResultsProps {
  claims: ClaimState[];
  company: CompanyProfile | null;
  busyClaimId: string | null;
  error: string;
  onRedefend: (claimId: string) => void;
  onFixPlan: (claimId: string) => void;
  onRestart: () => void;
}

export function Results({ claims, company, busyClaimId, error, onRedefend, onFixPlan, onRestart }: ResultsProps) {
  const score = defensibilityScore(claims);
  return (
    <section className="card" aria-labelledby="results-title">
      <h2 id="results-title">Your resume heatmap</h2>
      <p className="score" aria-live="polite">
        {score === null ? (
          'No claims tested yet.'
        ) : (
          <>
            Defensibility score: <strong>{score}</strong>/100 for {company?.name ?? 'General'}
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <ol className="heatmap">
        {claims.map(({ claim, turns, result, fixPlan }) => (
          <li key={claim.id} className={`claim claim--${result.verdict}`}>
            <div className="claim-head">
              <VerdictBadge verdict={result.verdict} />
              <span className="kind">{claim.kind}</span>
            </div>
            <p className="claim-line">{claim.resumeLine}</p>
            {result.evidence && (
              <p>
                <span className="label">You said:</span> “{result.evidence}”
              </p>
            )}
            {result.gap && result.verdict !== 'defended' && result.verdict !== 'untested' && (
              <p>
                <span className="label">Missing:</span> {result.gap}
              </p>
            )}
            {turns.length > 0 && <p className="meta">Depth reached: {result.depthReached} of 3</p>}
            {fixPlan && <FixPlanView plan={fixPlan} />}
            <div className="row">
              {(result.verdict === 'shaky' || result.verdict === 'exposed') && !fixPlan && (
                <button type="button" className="secondary" disabled={busyClaimId !== null} onClick={() => onFixPlan(claim.id)}>
                  {busyClaimId === claim.id ? 'Building plan…' : 'Get fix plan'}
                </button>
              )}
              <button type="button" className="secondary" disabled={busyClaimId !== null} onClick={() => onRedefend(claim.id)}>
                {result.verdict === 'untested' ? 'Defend this' : 'Re-defend'}
              </button>
            </div>
          </li>
        ))}
      </ol>
      {company && <PrepGuide company={company} />}
      <button type="button" className="link" onClick={onRestart}>
        Start over with another resume
      </button>
    </section>
  );
}
