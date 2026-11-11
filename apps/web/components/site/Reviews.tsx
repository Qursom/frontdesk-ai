import { Star } from 'lucide-react';
import { reviews } from '@/lib/clinic-content';

export default function Reviews() {
  return (
    <section className="section section-warm" aria-labelledby="reviews-title">
      <div className="container">
        <header className="site-section-head">
          <p className="badge">Sample reviews (demo)</p>
          <h2 id="reviews-title">What patients say</h2>
          <p>These are made-up examples to show the layout. A real clinic shows its own verified reviews here.</p>
        </header>
        <ul className="site-reviews">
          {reviews.map((r) => (
            <li key={r.author} className="card site-review">
              <figure>
                <div className="site-stars" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={18} />
                  ))}
                </div>
                <span className="visually-hidden">5 out of 5 stars.</span>
                <blockquote>
                  <p>{r.text}</p>
                </blockquote>
                <figcaption>
                  {r.author} · {r.date}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
