import { team } from '@/lib/clinic-content';

const initials = (name: string) =>
  name
    .replace(/^Dr\s+/, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

/** Illustrated initials avatars: fictional people, so no stock faces pretending to be real staff. */
export default function Team() {
  return (
    <section id="team" className="section" aria-labelledby="team-title">
      <div className="container">
        <header className="site-section-head">
          <h2 id="team-title">Meet the team</h2>
          <p>3 dentists, 2 hygienists and a friendly reception team. Team members shown are fictional (demo).</p>
        </header>
        <ul className="site-team">
          {team.map((m) => (
            <li key={m.name} className="card site-person">
              <svg className={`site-avatar site-avatar-${m.tone}`} viewBox="0 0 96 96" aria-hidden="true" focusable="false">
                <circle cx="48" cy="48" r="48" />
                <circle cx="76" cy="20" r="10" className="site-avatar-dot" />
                <text x="48" y="58" textAnchor="middle">
                  {initials(m.name)}
                </text>
              </svg>
              <h3>{m.name}</h3>
              <p className="site-person-role">{m.role}</p>
              <p className="site-person-qual">{m.qualification}</p>
              <p>{m.fact}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
