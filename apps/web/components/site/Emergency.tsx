import { PhoneCall, TriangleAlert } from 'lucide-react';
import { clinic } from '@/lib/clinic-content';

export default function Emergency() {
  return (
    <section id="emergency" className="section" aria-labelledby="emergency-title">
      <div className="container">
        <div className="site-emergency">
          <TriangleAlert className="site-emergency-icon" size={28} aria-hidden="true" />
          <div>
            <h2 id="emergency-title">Toothache, swelling or a broken tooth?</h2>
            <p>
              Call <a href={clinic.phoneHref}>{clinic.phone}</a>, we keep same-day slots. Severe swelling or trouble
              breathing: call 999. Out of hours: NHS 111.
            </p>
          </div>
          <a className="btn site-btn-danger" href={clinic.phoneHref}>
            <PhoneCall className="icon" aria-hidden="true" />
            Call {clinic.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
