import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { ClaimState } from '../domain/model';
import { MAX_TURNS_PER_CLAIM } from '../domain/session';
import { useSpeechInput } from '../hooks/useSpeechInput';

export const MAX_ANSWER_CHARS = 1500;

interface HotSeatProps {
  active: ClaimState;
  position: number;
  total: number;
  question: string;
  busy: boolean;
  error: string;
  onAnswer: (answer: string) => void;
  onFinish: () => void;
}

export function HotSeat({ active, position, total, question, busy, error, onAnswer, onFinish }: HotSeatProps) {
  const [answer, setAnswer] = useState('');
  const questionRef = useRef<HTMLHeadingElement>(null);
  const answerId = useId();
  const speech = useSpeechInput((text) => setAnswer((prev) => `${prev} ${text}`.trim().slice(0, MAX_ANSWER_CHARS)));

  useEffect(() => {
    questionRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || busy) return;
    speech.stop();
    onAnswer(trimmed);
  }

  return (
    <section className="card" aria-labelledby="question">
      <p className="eyebrow">
        Claim {position} of {total} · Question {active.turns.length + 1} of up to {MAX_TURNS_PER_CLAIM}
      </p>
      <blockquote className="claim-line">“{active.claim.resumeLine}”</blockquote>
      <h2 id="question" className="question" ref={questionRef} tabIndex={-1}>
        {question}
      </h2>
      <form onSubmit={handleSubmit} className="stack">
        <label htmlFor={answerId} className="label">
          Your answer
        </label>
        <textarea
          id={answerId}
          value={answer}
          maxLength={MAX_ANSWER_CHARS}
          rows={6}
          placeholder="Answer like you would in the interview…"
          disabled={busy}
          onChange={(event) => setAnswer(event.target.value)}
        />
        <div className="row">
          {speech.supported && (
            <button
              type="button"
              className="secondary"
              aria-pressed={speech.listening}
              disabled={busy}
              onClick={speech.listening ? speech.stop : speech.start}
            >
              <span aria-hidden="true">{speech.listening ? '■' : '🎤'}</span> {speech.listening ? 'Stop speaking' : 'Speak answer'}
            </button>
          )}
          <button type="submit" className="primary" disabled={busy || !answer.trim()}>
            {busy ? 'Assessing…' : 'Submit answer'}
          </button>
          <button type="button" className="link" disabled={busy} onClick={onFinish}>
            Finish now
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {busy ? 'Assessing your answer' : ''}
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
