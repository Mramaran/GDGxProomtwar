import type { Verdict } from '../domain/model';

const VERDICTS: Record<Verdict, { icon: string; label: string }> = {
  defended: { icon: '✓', label: 'Defended' },
  shaky: { icon: '!', label: 'Shaky' },
  exposed: { icon: '✕', label: 'Exposed' },
  untested: { icon: '○', label: 'Not tested' },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { icon, label } = VERDICTS[verdict];
  return (
    <span className={`badge badge--${verdict}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
