import { BadgeCheck, CalendarClock, HeartHandshake, ShieldCheck } from 'lucide-react';

const items = [
  { Icon: ShieldCheck, label: 'GDC-registered dentists' },
  { Icon: BadgeCheck, label: 'Registered with CQC' },
  { Icon: HeartHandshake, label: 'Nervous patients welcome' },
  { Icon: CalendarClock, label: 'Evening & Saturday appointments' },
];

export default function TrustStrip() {
  return (
    <section className="site-trust" aria-label="Our standards">
      <ul className="container site-trust-list">
        {items.map(({ Icon, label }) => (
          <li key={label}>
            <span className="site-trust-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
