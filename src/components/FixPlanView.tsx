import type { FixPlan } from '../domain/model';

export function FixPlanView({ plan }: { plan: FixPlan }) {
  return (
    <div className="fix-plan">
      <h3>Fix plan</h3>
      <p className="label">Learn</p>
      <ul>
        {plan.learn.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="label">Practise this question</p>
      <p>{plan.practiceQuestion}</p>
      <p className="label">Honest rewrite of the line</p>
      <p>{plan.honestRewrite}</p>
    </div>
  );
}
