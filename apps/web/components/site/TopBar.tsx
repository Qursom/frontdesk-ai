'use client';

import { CalendarCheck, Clock, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clinic } from '@/lib/clinic-content';
import { openDaysCount, todayStatus } from '@/lib/hours';

export default function TopBar() {
  // The page is pre-rendered at build time, so "today" must be worked out in the browser.
  // Until then, show a sentence that is true on any day (also avoids a hydration mismatch).
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setStatus(todayStatus());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="site-topbar">
      <div className="container site-topbar-inner">
        <span className="site-topbar-item">
          <Clock size={16} aria-hidden="true" />
          {status ?? `Open ${openDaysCount} days a week`}
        </span>
        <a className="site-topbar-item" href={clinic.phoneHref}>
          <Phone size={16} aria-hidden="true" />
          <span className="visually-hidden">Call us on </span>
          {clinic.phone}
        </a>
        <span className="site-topbar-item site-topbar-extra">
          <CalendarCheck size={16} aria-hidden="true" />
          Same-day emergency appointments
        </span>
      </div>
    </div>
  );
}
