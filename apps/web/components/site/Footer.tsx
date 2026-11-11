import { clinic } from '@/lib/clinic-content';
import ToothLogo from './ToothLogo';

// Pre-rendered at build time, so this is the date the site was last published.
const lastUpdated = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-grid">
        <div>
          <p className="site-footer-logo">
            <ToothLogo className="site-logo-icon" />
            {clinic.name}
          </p>
          <address>
            {clinic.address.join(', ')}
            <br />
            <a href={clinic.phoneHref}>{clinic.phone}</a> · <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
          </address>
        </div>

        <nav aria-label="Patient information">
          <ul className="site-footer-links">
            <li>
              <a href="https://olr.gdc-uk.org/searchregister" target="_blank" rel="noreferrer">
                Check a dentist on the GDC register<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href="#complaints">Complaints procedure</a>
            </li>
            <li>
              <a href="#privacy">Privacy &amp; cookies</a>
            </li>
            <li>
              <a href="https://www.cqc.org.uk/" target="_blank" rel="noreferrer">
                CQC registration (demo)<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>

        <div id="complaints" className="site-footer-complaints">
          <h2>Complaints</h2>
          <p>
            Tell us first: call or email the practice manager and we will reply within 3 working days. If you are not happy
            with our answer, you can contact the Dental Complaints Service. (Demo text.)
          </p>
        </div>
      </div>

      <div className="container site-footer-bottom">
        <p>Website last updated: {lastUpdated}</p>
        <p>{clinic.name} is a fictional demo clinic created by FrontDesk AI.</p>
      </div>
    </footer>
  );
}
