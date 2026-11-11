import { ArrowLeft, ArrowRight, Mail, MessageCircle, PhoneMissed, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import type { Metadata } from 'next';
import Script from 'next/script';
import BrandingPanel from '@/components/dashboard/BrandingPanel';
import BookButton from '@/components/site/BookButton';
import { API_URL } from '@/lib/api';
import { clinic } from '@/lib/clinic-content';

export const metadata: Metadata = {
  title: 'Clinic owner view - Demo | FrontDesk AI',
  description: 'What FrontDesk AI does for a dental clinic: leads captured, after-hours enquiries and a branded AI assistant.',
};

// Revalidate every 5 minutes so the page stays fresh without blocking every request.
export const revalidate = 300;

/** Placeholder: replace with the real sales inbox before showing this page to prospects. */
const SALES_EMAIL = 'hello@frontdesk-ai.example';

interface DashboardStats {
  days: number;
  conversations: number;
  leads: number;
  handoffs: number;
  afterHours: number;
  repliesByRoute: { _id: string; count: number }[];
}

/** Server-side fetch — key never reaches the browser. Returns null when unconfigured or API down. */
async function fetchStats(): Promise<DashboardStats | null> {
  const adminKey = process.env.DASHBOARD_ADMIN_KEY;
  const tenant = process.env.DASHBOARD_TENANT ?? 'bright-smile';
  if (!adminKey) return null;
  try {
    const res = await fetch(
      `${API_URL}/v1/admin/stats?tenant=${encodeURIComponent(tenant)}&days=7`,
      {
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as DashboardStats;
  } catch {
    return null;
  }
}

type Status = 'New' | 'Called' | 'Booked';
// Fictional leads table — real patient names must not appear on a public page (GDPR).
const demoLeads: { name: string; interest: string; time: string; status: Status }[] = [
  { name: 'Sarah K.', interest: 'Teeth whitening', time: 'Mon 19:42', status: 'New' },
  { name: 'James P.', interest: 'New patient check-up', time: 'Mon 21:10', status: 'Called' },
  { name: 'Aisha R.', interest: 'Invisalign', time: 'Tue 07:55', status: 'Booked' },
  { name: 'Tom W.', interest: 'Toothache (urgent)', time: 'Tue 12:30', status: 'Called' },
  { name: 'Maria L.', interest: 'Hygienist', time: 'Wed 20:05', status: 'New' },
];

const without = ['Patient calls at 19:40', 'Voicemail', 'Books elsewhere'];
const withAi = ['Chat at 19:40', 'Price answered', 'Callback requested', 'Lead in your inbox'];

const tryIt = ['How much is Invisalign?', 'Are you open Saturday?', "I'm scared of injections"];

// Only claims that are true of this build.
const compliance = [
  'AI disclosure at first message (EU AI Act Art. 50)',
  'Widget designed to WCAG 2.2 AA',
  'GDPR consent capture',
  'Auto-delete chats after 30 days',
];

function DemoTag() {
  return <span className="badge badge-accent">Demo data</span>;
}

function LiveTag() {
  return (
    <span className="badge badge-live">
      <Wifi size={12} aria-hidden="true" />
      Live data
    </span>
  );
}

function OfflineTag() {
  return (
    <span className="badge badge-accent">
      <WifiOff size={12} aria-hidden="true" />
      Demo data
    </span>
  );
}

export default async function ClinicOwnerView() {
  const liveStats = await fetchStats();
  const isLive = liveStats !== null;

  const afterHoursPct =
    isLive && liveStats.conversations > 0
      ? Math.round((liveStats.afterHours / liveStats.conversations) * 100)
      : 39;

  const kpis = isLive
    ? [
        { value: String(liveStats.leads), label: 'Leads captured this week' },
        {
          value: String(liveStats.afterHours),
          suffix: `(${afterHoursPct}%)`,
          label: 'After-hours enquiries',
        },
        { value: '< 2s', label: 'Average reply time' },
        { value: String(liveStats.handoffs), label: 'Handed to staff' },
      ]
    : [
        { value: '23', label: 'Leads captured this week' },
        { value: '9', suffix: '(39%)', label: 'After-hours enquiries' },
        { value: '2s', label: 'Average reply time' },
        { value: '4', label: 'Handed to staff' },
      ];

  return (
    <div className="dash">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="dash-topbar">
        <div className="container dash-topbar-inner">
          <strong className="dash-brand">FrontDesk AI · Clinic owner view</strong>
          <a className="btn btn-ghost" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Demo clinic website
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="section section-warm dash-hero" aria-labelledby="dash-title">
          <div className="container">
            <DemoTag />
            <h1 id="dash-title">Never miss an enquiry again, even at 19:40.</h1>
            <p>
              This is what a clinic owner sees after a week with FrontDesk AI on their website. Everything on this page is
              demo data for the fictional {clinic.name}.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="kpi-title">
          <div className="container">
            <div className="dash-head">
              <h2 id="kpi-title">This week</h2>
              {isLive ? <LiveTag /> : <OfflineTag />}
            </div>
            <ul className="dash-kpis">
              {kpis.map((k) => (
                <li key={k.label} className="card dash-kpi">
                  <span className="dash-kpi-value">
                    {k.value}
                    {k.suffix && <small> {k.suffix}</small>}
                  </span>
                  <span className="dash-kpi-label">{k.label}</span>
                </li>
              ))}
            </ul>

            <div className="dash-head dash-head-spaced">
              <h2 id="leads-title">Latest leads</h2>
              <DemoTag />
            </div>
            <div className="card dash-table-card">
              <div className="site-table-wrap" role="region" aria-labelledby="leads-title" tabIndex={0}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Interest</th>
                      <th scope="col">Time</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoLeads.map((l) => (
                      <tr key={l.name}>
                        <th scope="row">{l.name}</th>
                        <td>{l.interest}</td>
                        <td>{l.time}</td>
                        <td>
                          <span className={`dash-status dash-status-${l.status.toLowerCase()}`}>{l.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-warm" aria-labelledby="ba-title">
          <div className="container">
            <div className="dash-head">
              <h2 id="ba-title">The enquiry you would have lost</h2>
            </div>
            <div className="dash-ba">
              <div className="card dash-ba-card dash-ba-without">
                <h3>
                  <PhoneMissed size={22} aria-hidden="true" />
                  Without FrontDesk AI
                </h3>
                <ol className="dash-steps">
                  {without.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
              <div className="card dash-ba-card dash-ba-with">
                <h3>
                  <MessageCircle size={22} aria-hidden="true" />
                  With FrontDesk AI
                </h3>
                <ol className="dash-steps">
                  {withAi.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
            <p className="dash-note">
              One 2026 vendor analysis found 38% of inbound dental calls went unanswered (vendor data).
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="try-title">
          <div className="container">
            <div className="dash-head">
              <h2 id="try-title">Try it yourself</h2>
            </div>
            <p className="dash-lead">Each button opens the real assistant in the corner and asks the question for you.</p>
            <div className="dash-try">
              {tryIt.map((q) => (
                <BookButton key={q} className="btn btn-secondary" message={q}>
                  <MessageCircle className="icon" aria-hidden="true" />
                  &ldquo;{q}&rdquo;
                </BookButton>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-warm" aria-labelledby="brand-title">
          <div className="container">
            <div className="dash-head">
              <h2 id="brand-title">Your brand, your assistant</h2>
            </div>
            <p className="dash-lead">
              Change the name and colour. The contrast guard keeps text readable: if white text would fall below 4.5:1,
              the widget uses dark text instead.
            </p>
            <BrandingPanel />
          </div>
        </section>

        <section className="section" aria-labelledby="compliance-title">
          <div className="container">
            <div className="dash-head">
              <h2 id="compliance-title">Built for UK and EU rules</h2>
            </div>
            <ul className="dash-badges">
              {compliance.map((c) => (
                <li key={c}>
                  <ShieldCheck size={20} aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-soft" aria-labelledby="cta-title">
          <div className="container dash-cta">
            <h2 id="cta-title">Want this on your clinic&apos;s website?</h2>
            <p>We set it up with your own prices, hours and FAQs. One line of code on your site.</p>
            <a className="btn btn-primary" href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('FrontDesk AI demo')}`}>
              <Mail className="icon" aria-hidden="true" />
              Get a free demo with your own content
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="dash-footer">
        <div className="container">
          {isLive
            ? `KPI counts are live from ${clinic.name} (fictional demo tenant). Lead names are sample data.`
            : `All figures, leads and names on this page are demo data. ${clinic.name} is fictional.`}
        </div>
      </footer>

      <Script
        src="/loader.js"
        data-tenant={clinic.tenant}
        data-color="#0F766E"
        data-phone={clinic.phone}
        data-api={API_URL}
        strategy="afterInteractive"
      />
    </div>
  );
}
