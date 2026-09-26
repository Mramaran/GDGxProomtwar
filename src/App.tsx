import { useEffect, useReducer, useState } from 'react';
import type { AiClient } from './ai/client';
import { GuideBrowser } from './components/GuideBrowser';
import { HotSeat } from './components/HotSeat';
import { Results } from './components/Results';
import { StartScreen } from './components/StartScreen';
import { companies, findCompany } from './data/companies';
import { sessionReducer } from './domain/session';
import { clearSession, loadSession, saveSession } from './domain/storage';
import { friendlyError } from './lib/errors';
import { readPdfAsBase64 } from './lib/pdf';

interface AppProps {
  client: AiClient | null;
}

type View = 'hotseat' | 'guide';

const VIEWS: { id: View; icon: string; label: string }[] = [
  { id: 'hotseat', icon: '🔥', label: 'Hot seat' },
  { id: 'guide', icon: '📘', label: 'Preparation guide' },
];

export default function App({ client }: AppProps) {
  const [view, setView] = useState<View>('hotseat');
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => loadSession());
  const [busy, setBusy] = useState(false);
  const [busyClaimId, setBusyClaimId] = useState<string | null>(null);
  const company = findCompany(state.companyId);
  const active = state.claims[state.activeIndex];

  useEffect(() => {
    saveSession(state);
  }, [state]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      dispatch({ type: 'failed', message: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  }

  function handleStart(file: File, companyId: string) {
    if (!client) return;
    void run(async () => {
      dispatch({ type: 'extractStarted', companyId });
      const pdf = await readPdfAsBase64(file);
      dispatch({ type: 'claimsExtracted', claims: await client.extractClaims(pdf, findCompany(companyId)) });
    });
  }

  function handleAnswer(answer: string) {
    if (!client || !active) return;
    const turns = [...active.turns, { question: state.currentQuestion, answer }];
    void run(async () => {
      dispatch({ type: 'answerAssessed', answer, assessment: await client.assess(active.claim, turns, company) });
    });
  }

  function handleFixPlan(claimId: string) {
    const target = state.claims.find((c) => c.claim.id === claimId);
    if (!client || !target) return;
    setBusyClaimId(claimId);
    client
      .fixPlan(target.claim, target.result, company)
      .then((fixPlan) => dispatch({ type: 'fixPlanLoaded', claimId, fixPlan }))
      .catch((error: unknown) => dispatch({ type: 'failed', message: friendlyError(error) }))
      .finally(() => setBusyClaimId(null));
  }

  function handleRestart() {
    clearSession();
    dispatch({ type: 'reset' });
  }

  return (
    <div className="app">
      <header className="site-header">
        <h1>
          <span aria-hidden="true">🔥</span> HotSeat
        </h1>
        <p className="tagline">Can you defend your resume?</p>
        <nav className="tabs" aria-label="Sections">
          {VIEWS.map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              className="tab"
              aria-current={view === id ? 'page' : undefined}
              onClick={() => setView(id)}
            >
              <span aria-hidden="true">{icon}</span> {label}
            </button>
          ))}
        </nav>
      </header>
      <main>{view === 'guide' ? <GuideBrowser companies={companies} /> : renderHotSeat()}</main>
      <footer className="site-footer">
        <p>
          Built by Ember Syndicate. Company guides come from anonymised placement interview reports. Powered by Gemini
          via Firebase AI Logic.
        </p>
        <button type="button" className="link" onClick={handleRestart}>
          Clear my data
        </button>
      </footer>
    </div>
  );

  function renderHotSeat() {
    return (
      <>
        {!client && <SetupNotice />}
        {client && (state.phase === 'start' || state.phase === 'extracting') && (
          <StartScreen companies={companies} busy={state.phase === 'extracting'} error={state.error} onStart={handleStart} />
        )}
        {client && state.phase === 'interview' && active && (
          <HotSeat
            key={`${active.claim.id}-${active.turns.length}`}
            active={active}
            position={state.activeIndex + 1}
            total={state.claims.length}
            question={state.currentQuestion}
            busy={busy}
            error={state.error}
            onAnswer={handleAnswer}
            onFinish={() => dispatch({ type: 'finishNow' })}
          />
        )}
        {client && state.phase === 'results' && (
          <Results
            claims={state.claims}
            company={company}
            busyClaimId={busyClaimId}
            error={state.error}
            onRedefend={(claimId) => dispatch({ type: 'redefendStarted', claimId })}
            onFixPlan={handleFixPlan}
            onRestart={handleRestart}
          />
        )}
      </>
    );
  }
}

function SetupNotice() {
  return (
    <section className="card" role="alert">
      <h2>Setup needed</h2>
      <p>
        Firebase is not configured. Copy <code>.env.example</code> to <code>.env.local</code>, add your Firebase web app
        settings, and restart the dev server.
      </p>
    </section>
  );
}
