import { ArrowRight, ShieldPlus, Siren, Smile, Sparkles, Stethoscope, Toothbrush } from 'lucide-react';
import { TreatmentIcon, treatments } from '@/lib/clinic-content';
import BookButton from './BookButton';

const ICONS: Record<TreatmentIcon, typeof Smile> = {
  checkup: Stethoscope,
  hygienist: Toothbrush,
  whitening: Sparkles,
  invisalign: Smile,
  implants: ShieldPlus,
  emergency: Siren,
};

export default function Treatments() {
  return (
    <section id="treatments" className="section" aria-labelledby="treatments-title">
      <div className="container">
        <header className="site-section-head">
          <h2 id="treatments-title">Treatments</h2>
          <p>Everyday care and cosmetic treatments, explained in plain English.</p>
        </header>
        <ul className="site-treatments">
          {treatments.map((t) => {
            const Icon = ICONS[t.icon];
            return (
              <li key={t.title} className="card site-treatment">
                <span className="site-treatment-icon" aria-hidden="true">
                  <Icon size={24} />
                </span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
                <p className="site-treatment-price">
                  From <strong>{t.from}</strong>
                </p>
                <BookButton className="btn btn-ghost site-treatment-ask" message={t.question}>
                  Ask about this<span className="visually-hidden">: {t.title}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </BookButton>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
