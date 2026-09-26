import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './ai/client';
import App from './App';

const claim = {
  id: 'c1',
  kind: 'project' as const,
  resumeLine: 'Built a chat app with WebSockets',
  focus: 'WebSockets',
  openingQuestion: 'How do WebSockets differ from HTTP polling?',
};

const fakeClient = (): AiClient => ({
  extractClaims: vi.fn().mockResolvedValue([claim]),
  assess: vi.fn().mockResolvedValue({
    verdict: 'exposed',
    depthReached: 0,
    evidence: 'not sure',
    gap: 'A persistent full-duplex connection',
    decision: 'conclude',
    nextQuestion: '',
  }),
  fixPlan: vi.fn().mockResolvedValue({
    learn: ['WebSocket handshake'],
    practiceQuestion: 'Explain the Upgrade header',
    honestRewrite: 'Built a chat app prototype using a WebSocket library',
  }),
});

describe('App', () => {
  it('runs a full session from upload to fix plan', async () => {
    const user = userEvent.setup();
    render(<App client={fakeClient()} />);
    await user.upload(screen.getByLabelText(/resume \(pdf/i), new File(['%PDF-1.4 test'], 'cv.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /start the hot seat/i }));
    expect(await screen.findByRole('heading', { name: /websockets differ/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/your answer/i), 'not sure');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(await screen.findByText('Exposed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /get fix plan/i }));
    expect(await screen.findByText(/honest rewrite/i)).toBeInTheDocument();
  });

  it('shows setup instructions when Firebase is not configured', () => {
    render(<App client={null} />);
    expect(screen.getByRole('heading', { name: /setup needed/i })).toBeInTheDocument();
  });

  it('opens the preparation guide tab without a resume or AI', async () => {
    const user = userEvent.setup();
    render(<App client={null} />);
    const tab = screen.getByRole('button', { name: /preparation guide/i });
    await user.click(tab);
    expect(tab).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: /preparation guides/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /preparation guide: /i })).toBeInTheDocument();
  });
});
