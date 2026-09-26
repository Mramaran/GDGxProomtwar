import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClaimState, Verdict } from '../domain/model';
import { zohoProfile as zoho } from '../test/fixtures';
import { Results } from './Results';

const state = (id: string, verdict: Verdict): ClaimState => ({
  claim: { id, kind: 'skill', resumeLine: `Line ${id}`, focus: 'f', openingQuestion: 'q' },
  turns: verdict === 'untested' ? [] : [{ question: 'q', answer: 'a' }],
  result: { verdict, depthReached: 1, evidence: verdict === 'untested' ? '' : 'my answer', gap: 'the gap' },
});

const handlers = { onRedefend: vi.fn(), onFixPlan: vi.fn(), onRestart: vi.fn() };

describe('Results', () => {
  it('labels every claim with text, not only colour, and shows the score', () => {
    render(
      <Results
        claims={[state('c1', 'defended'), state('c2', 'exposed'), state('c3', 'untested')]}
        company={null}
        busyClaimId={null}
        error=""
        {...handlers}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Defended')).toBeInTheDocument();
    expect(within(items[1]).getByText('Exposed')).toBeInTheDocument();
    expect(within(items[2]).getByText('Not tested')).toBeInTheDocument();
    expect(screen.getByText(/defensibility score/i)).toHaveTextContent('50/100 for General');
  });

  it('offers a fix plan only for weak claims', () => {
    const onFixPlan = vi.fn();
    render(
      <Results
        claims={[state('c1', 'defended'), state('c2', 'shaky')]}
        company={null}
        busyClaimId={null}
        error=""
        {...handlers}
        onFixPlan={onFixPlan}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /get fix plan/i });
    expect(buttons).toHaveLength(1);
    buttons[0].click();
    expect(onFixPlan).toHaveBeenCalledWith('c2');
  });

  it('shows the company preparation guide under the heatmap', () => {
    render(<Results claims={[state('c1', 'shaky')]} company={zoho} busyClaimId={null} error="" {...handlers} />);
    expect(screen.getByText(/defensibility score/i)).toHaveTextContent('for ZOHO');
    expect(screen.getByRole('heading', { name: /preparation guide: zoho/i })).toBeInTheDocument();
  });
});
