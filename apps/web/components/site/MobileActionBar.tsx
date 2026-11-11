import { CalendarDays, Phone } from 'lucide-react';
import { clinic } from '@/lib/clinic-content';
import BookButton from './BookButton';

/** Shown only at 640px and below (CSS). data-fd-bottom-bar tells loader.js to lift the launcher above it while visible. */
export default function MobileActionBar() {
  return (
    <nav className="site-mobile-bar" aria-label="Quick actions" data-fd-bottom-bar="">
      <a className="btn btn-secondary" href={clinic.phoneHref}>
        <Phone className="icon" aria-hidden="true" />
        Call<span className="visually-hidden"> us on {clinic.phone}</span>
      </a>
      <BookButton className="btn btn-primary">
        <CalendarDays className="icon" aria-hidden="true" />
        Book<span className="visually-hidden"> an appointment</span>
      </BookButton>
    </nav>
  );
}
