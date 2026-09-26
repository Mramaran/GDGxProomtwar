import { useId } from 'react';
import type { CompanyProfile } from '../data/companies';
import { resourceLink } from '../data/resourceLinks';

interface GuideSection {
  title: string;
  items: string[];
  /** When set, each item becomes a link that opens in a new tab. */
  link?: (item: string) => string;
}

/** What to prepare for one company, distilled from anonymised interview reports. */
export function PrepGuide({ company }: { company: CompanyProfile }) {
  const headingId = useId();
  const sections: GuideSection[] = [
    {
      title: 'Rounds',
      items: company.rounds.map((round) =>
        [round.name, round.format].filter(Boolean).join(' · ') + (round.focus.length > 0 ? `: ${round.focus.join(', ')}` : ''),
      ),
    },
    { title: 'Areas to prepare', items: company.techTopics },
    { title: 'Resources to use', items: company.resources, link: resourceLink },
    { title: 'Questions asked', items: company.sampleQuestions },
    { title: 'HR questions', items: company.hrQuestions },
    { title: 'Tips', items: company.tips },
  ].filter((section) => section.items.length > 0);

  return (
    <section className="guide" aria-labelledby={headingId}>
      <h3 id={headingId}>Preparation guide: {company.name}</h3>
      <p className="meta">
        Based on {company.reports} anonymised interview reports
        {company.roles.length > 0 && ` · Roles: ${company.roles.join(', ')}`}
      </p>
      {sections.map((section, index) => (
        <details key={section.title} open={index < 3}>
          <summary>
            {section.title} ({section.items.length})
          </summary>
          <ul>
            {section.items.map((item, i) => (
              <li key={`${i}:${item}`}>
                {section.link ? (
                  <a href={section.link(item)} target="_blank" rel="noopener noreferrer">
                    {item}
                    <span aria-hidden="true"> ↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  item
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
