import { BadgeCheck, MessageCircle, PoundSterling, Star } from 'lucide-react';
import { clinic } from '@/lib/clinic-content';
import BookButton from './BookButton';
import HeroIllustration from './HeroIllustration';

export default function Hero() {
  return (
    <section className="site-hero section-warm" aria-labelledby="hero-title">
      <div className="container site-hero-grid">
        <div className="site-hero-copy">
          <h1 id="hero-title">Gentle, modern dentistry in {clinic.area}</h1>
          <p className="site-hero-sub">Private family dental care. Nervous patients welcome. Open Saturdays.</p>

          <div className="site-hero-ctas">
            <BookButton>Book appointment</BookButton>
            <a className="btn btn-secondary" href="#treatments">
              See prices
            </a>
          </div>

          <ul className="site-trust-row" aria-label="Why patients choose us">
            <li>
              <Star className="site-star" size={18} aria-hidden="true" />
              <span>
                <strong>{clinic.rating.score}</strong> · {clinic.rating.count} reviews (demo)
              </span>
            </li>
            <li>
              <BadgeCheck size={18} aria-hidden="true" />
              CQC registered
            </li>
            <li>
              <PoundSterling size={18} aria-hidden="true" />
              0% finance
            </li>
          </ul>
        </div>

        <div className="site-hero-media">
          <div className="site-hero-card">
            <HeroIllustration />
          </div>
          <BookButton className="site-chat-preview">
            <span className="site-chat-preview-avatar" aria-hidden="true">
              <MessageCircle size={20} />
            </span>
            <span className="site-chat-preview-text">
              <span className="site-chat-preview-name">{clinic.assistantName} · AI assistant</span>
              Hi, I&apos;m {clinic.assistantName}, the clinic&apos;s AI assistant. Ask me about prices 👋
            </span>
          </BookButton>
        </div>
      </div>
    </section>
  );
}
