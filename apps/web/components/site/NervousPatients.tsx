import { Check, MessageCircle } from 'lucide-react';
import { NERVOUS_MESSAGE } from '@/lib/clinic-content';
import BookButton from './BookButton';

const promises = [
  'Tell us your worries privately',
  'Agree a stop signal',
  'Extra-long first visit',
  'Step-by-step explanations',
];

export default function NervousPatients() {
  return (
    <section id="nervous" className="section" aria-labelledby="nervous-title">
      <div className="container">
        <div className="site-nervous">
          <div>
            <h2 id="nervous-title">Scared of the dentist? You&apos;re not alone.</h2>
            <p>
              About 1 in 2 adults in England feel some dental anxiety, and about 1 in 8 feel extreme anxiety (Adult Oral
              Health Survey 2021). We go at your pace, and you can ask to stop at any time.
            </p>
            <BookButton className="btn btn-primary" message={NERVOUS_MESSAGE}>
              <MessageCircle className="icon" aria-hidden="true" />
              Ask our assistant privately
            </BookButton>
          </div>
          <ul className="site-nervous-list">
            {promises.map((p) => (
              <li key={p}>
                <span className="site-check" aria-hidden="true">
                  <Check size={16} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
