'use client';

import { Accessibility, Car, ExternalLink, MapPin, TrainFront } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clinic, openingHours } from '@/lib/clinic-content';
import { formatRange, londonWeekday } from '@/lib/hours';
import MapIllustration from './MapIllustration';

const mapsHref = `https://www.openstreetmap.org/search?query=${encodeURIComponent(clinic.address.join(', '))}`;

export default function HoursAndMap() {
  // Computed in the browser: the page is pre-rendered, so the build day would be wrong.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(londonWeekday()), []);

  return (
    <section id="contact" className="section section-warm" aria-labelledby="contact-title">
      <div className="container">
        <header className="site-section-head">
          <h2 id="contact-title">Opening hours &amp; find us</h2>
        </header>
        <div className="site-find">
          <div id="hours" className="card">
            <table className="site-hours">
              <caption>Opening hours</caption>
              <tbody>
                {openingHours.map((d) => {
                  const isToday = d.day === today;
                  return (
                    <tr key={d.label} className={isToday ? 'is-today' : undefined}>
                      <th scope="row">
                        {d.label}
                        {isToday && <span className="badge site-today">Today</span>}
                      </th>
                      <td>
                        {formatRange(d)}
                        {d.note && <span className="site-hours-note"> · {d.note}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="site-muted">Closed on bank holidays.</p>
          </div>

          <div className="card site-address">
            <address>
              <strong>{clinic.name}</strong>
              {clinic.address.map((line) => (
                <span key={line}>{line}</span>
              ))}
              <a href={clinic.phoneHref}>{clinic.phone}</a>
              <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
            </address>
            <ul className="site-facts">
              <li>
                <TrainFront size={20} aria-hidden="true" />
                {clinic.transport}
              </li>
              <li>
                <Accessibility size={20} aria-hidden="true" />
                {clinic.access}
              </li>
              <li>
                <Car size={20} aria-hidden="true" />
                {clinic.parking}
              </li>
            </ul>
          </div>

          <figure className="card site-map">
            <MapIllustration />
            <figcaption>
              <MapPin size={16} aria-hidden="true" />
              Illustration, not to scale.{' '}
              <a href={mapsHref} target="_blank" rel="noreferrer">
                Open in OpenStreetMap
                <ExternalLink size={14} aria-hidden="true" />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
