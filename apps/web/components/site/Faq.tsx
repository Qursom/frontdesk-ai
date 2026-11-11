import { ChevronDown } from 'lucide-react';
import { faqs } from '@/lib/clinic-content';

/** Native <details>: keyboard and screen-reader support for free, no JavaScript. */
export default function Faq() {
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className="container site-faq-wrap">
        <header className="site-section-head">
          <h2 id="faq-title">Questions patients ask</h2>
          <p>Can&apos;t see your question? Ask our AI assistant in the corner.</p>
        </header>
        <div className="site-faq">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <ChevronDown className="site-faq-chevron" size={20} aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
