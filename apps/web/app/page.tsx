import Script from 'next/script';
import DemoBanner from '@/components/site/DemoBanner';
import Emergency from '@/components/site/Emergency';
import Faq from '@/components/site/Faq';
import Footer from '@/components/site/Footer';
import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import HoursAndMap from '@/components/site/HoursAndMap';
import MobileActionBar from '@/components/site/MobileActionBar';
import NervousPatients from '@/components/site/NervousPatients';
import Prices from '@/components/site/Prices';
import Privacy from '@/components/site/Privacy';
import Reviews from '@/components/site/Reviews';
import Team from '@/components/site/Team';
import TopBar from '@/components/site/TopBar';
import Treatments from '@/components/site/Treatments';
import TrustStrip from '@/components/site/TrustStrip';
import { API_URL } from '@/lib/api';
import { clinic } from '@/lib/clinic-content';

/**
 * Fake clinic website = the "stage" for the demo. Section order follows docs/UI-GUIDE.md section 2.
 * The widget is added EXACTLY like a real client would: one <script> tag.
 */
export default function DemoClinicSite() {
  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <DemoBanner />
      <TopBar />
      <Header />

      <main id="main" tabIndex={-1}>
        <Hero />
        <TrustStrip />
        <Treatments />
        <Prices />
        <NervousPatients />
        <Team />
        <Reviews />
        <Emergency />
        <HoursAndMap />
        <Faq />
        <Privacy />
      </main>

      <Footer />
      <MobileActionBar />

      {/* ↓↓↓ This is the ONLY line a real clinic adds to its website ↓↓↓ */}
      {/* data-phone: fallback number if the API cannot be reached. data-api: one silent /health ping to wake it.
          The launcher lifts itself above <MobileActionBar> because the bar has data-fd-bottom-bar. */}
      <Script
        src="/loader.js"
        data-tenant={clinic.tenant}
        data-color="#0F766E"
        data-phone={clinic.phone}
        data-api={API_URL}
        data-teaser={`Hi! I'm ${clinic.assistantName}, the clinic's AI assistant. Questions about prices or appointments?`}
        strategy="afterInteractive"
      />
    </div>
  );
}
