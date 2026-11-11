import { ArrowRight } from 'lucide-react';
import { clinic } from '@/lib/clinic-content';

export default function DemoBanner() {
  return (
    <div className="site-demo-banner" role="note">
      <div className="container">
        Demo website for a fictional clinic, built to show FrontDesk AI.{' '}
        <a href={clinic.ownerViewHref}>
          Clinic owner view
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
