/**
 * Content for the DEMO clinic website only (the "stage" for the widget).
 * Keep it in line with apps/api/data/tenants/bright-smile/clinic.md, so the site and the assistant agree.
 * The real product never reads this file: clinic data for the assistant lives in the tenant config.
 */

export interface OpeningDay {
  /** 0 = Sunday ... 6 = Saturday (same as Date.getDay()). */
  day: number;
  label: string;
  /** 24h "HH:MM". Leave out both for a closed day. */
  open?: string;
  close?: string;
  note?: string;
}

export const clinic = {
  name: 'Bright Smile Dental',
  tenant: 'bright-smile',
  assistantName: 'Sophie',
  area: 'Islington',
  phone: '020 7946 0321',
  phoneHref: 'tel:+442079460321',
  email: 'hello@brightsmile-demo.co.uk',
  address: ['42 Upper Street', 'Islington', 'London N1 0PN'],
  transport: 'Angel Underground station (Northern line) is a 5-minute walk.',
  access: 'Ground floor with step-free access and an accessible toilet.',
  parking: 'No private car park. Pay-and-display parking on nearby streets.',
  rating: { score: '4.9', count: '300+' },
  /** The sales page for clinic owners (docs/UI-GUIDE.md section 4). */
  ownerViewHref: '/demo/dashboard',
} as const;

/** Sent to the chat by every "Book appointment" control. */
export const BOOKING_MESSAGE = "I'd like to book an appointment";
export const NERVOUS_MESSAGE = "I'm nervous about visiting the dentist";

/** Monday first, the way UK sites list them. */
export const openingHours: OpeningDay[] = [
  { day: 1, label: 'Monday', open: '08:30', close: '18:00' },
  { day: 2, label: 'Tuesday', open: '08:30', close: '18:00' },
  { day: 3, label: 'Wednesday', open: '08:30', close: '19:30', note: 'Late evening' },
  { day: 4, label: 'Thursday', open: '08:30', close: '18:00' },
  { day: 5, label: 'Friday', open: '08:30', close: '17:00' },
  { day: 6, label: 'Saturday', open: '09:00', close: '13:00', note: 'Every Saturday' },
  { day: 0, label: 'Sunday' },
];

export const navLinks = [
  { label: 'Treatments', href: '#treatments' },
  { label: 'Prices', href: '#prices' },
  { label: 'Nervous patients', href: '#nervous' },
  { label: 'Team', href: '#team' },
  { label: 'Contact', href: '#contact' },
];

export type TreatmentIcon = 'checkup' | 'hygienist' | 'whitening' | 'invisalign' | 'implants' | 'emergency';

export const treatments: { icon: TreatmentIcon; title: string; text: string; from: string; question: string }[] = [
  {
    icon: 'checkup',
    title: 'Check-up & X-rays',
    text: 'A careful look at your teeth and gums, with X-rays when needed.',
    from: '£55',
    question: 'What does a check-up include and how much is it?',
  },
  {
    icon: 'hygienist',
    title: 'Hygienist',
    text: 'A 30-minute scale and polish for healthy gums and a fresh feel.',
    from: '£80',
    question: 'How much is a hygienist appointment?',
  },
  {
    icon: 'whitening',
    title: 'Teeth whitening',
    text: 'At-home trays or in-clinic whitening, after a check that it suits you.',
    from: '£350',
    question: 'How much is teeth whitening?',
  },
  {
    icon: 'invisalign',
    title: 'Invisalign',
    text: 'Clear aligners to straighten teeth, with a free first consultation.',
    from: '£2,900',
    question: 'How long does Invisalign take and how much is it?',
  },
  {
    icon: 'implants',
    title: 'Dental implants',
    text: 'A permanent replacement for a missing tooth, crown included.',
    from: '£2,400',
    question: 'How much are dental implants?',
  },
  {
    icon: 'emergency',
    title: 'Emergency care',
    text: 'Same-day appointments kept free every day, when available.',
    from: '£95',
    question: 'How much is an emergency appointment?',
  },
];

export const prices: { treatment: string; from: string; included: string }[] = [
  { treatment: 'New patient examination', from: '£75', included: 'Full check, 2 small X-rays and a written treatment plan' },
  { treatment: 'Routine check-up', from: '£55', included: 'For existing patients' },
  { treatment: "Children's check-up (under 16)", from: '£35', included: 'Gentle check from the first tooth' },
  { treatment: 'Hygienist appointment', from: '£80', included: '30-minute scale and polish' },
  { treatment: 'Emergency appointment', from: '£95', included: 'Same day when available' },
  { treatment: 'White filling', from: '£150', included: 'Tooth-coloured composite filling' },
  { treatment: 'Teeth whitening (at home)', from: '£350', included: 'Custom trays and gel' },
  { treatment: 'Invisalign clear aligners', from: '£2,900', included: 'Free Invisalign consultation first' },
  { treatment: 'Dental implant', from: '£2,400', included: 'Implant and crown. £95 consultation, deducted from the cost' },
];

export const team: { name: string; role: string; qualification: string; fact: string; tone: 'teal' | 'warm' | 'sand' | 'mint' }[] = [
  {
    name: 'Dr Amira Shah',
    role: 'Principal dentist',
    qualification: 'BDS (London) · GDC No. 000000 (demo)',
    fact: 'Loves explaining each step, so nothing is a surprise.',
    tone: 'teal',
  },
  {
    name: 'Dr Tom Ellis',
    role: 'Dentist, Invisalign',
    qualification: 'BDS (London) · GDC No. 000000 (demo)',
    fact: 'Runs our free Invisalign consultations.',
    tone: 'warm',
  },
  {
    name: 'Dr Kasia Nowak',
    role: "Dentist, children's care",
    qualification: 'BDS (London) · GDC No. 000000 (demo)',
    fact: 'Speaks English and Polish. Great with first visits.',
    tone: 'mint',
  },
  {
    name: 'Jess Morgan',
    role: 'Dental hygienist',
    qualification: 'Dip. Dental Hygiene · GDC No. 000000 (demo)',
    fact: 'Takes extra time with nervous patients.',
    tone: 'sand',
  },
];

export const reviews: { text: string; author: string; date: string }[] = [
  {
    text: 'I had not been to a dentist in years. They explained everything and let me take breaks. No judgement at all.',
    author: 'Sarah K.',
    date: 'Oct 2026',
  },
  {
    text: 'Asked the chat about whitening prices at 10pm and got a call back the next morning. Very easy.',
    author: 'Daniel M.',
    date: 'Sep 2026',
  },
  {
    text: 'Saturday appointments are a lifesaver with two kids. The hygienist was lovely with my son.',
    author: 'Priya R.',
    date: 'Aug 2026',
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: 'Are you taking new patients?',
    a: 'Yes. You start with a new patient examination (£75), which includes 2 small X-rays and a treatment plan. Please arrive 10 minutes early to fill in a medical history form.',
  },
  {
    q: 'Do you offer NHS treatment?',
    a: 'No. Bright Smile Dental is a private practice only.',
  },
  {
    q: 'Are you open on Saturdays?',
    a: 'Yes, every Saturday from 9:00am to 1:00pm. Saturday appointments are popular, so please request early.',
  },
  {
    q: 'Can I spread the cost?',
    a: 'Interest-free finance (0%) is available for treatments over £1,000, over 6 or 12 months, subject to approval.',
  },
  {
    q: 'What if I need to cancel?',
    a: "Please give at least 24 hours' notice. Missed appointments or cancellations with less than 24 hours' notice may be charged £30.",
  },
  {
    q: 'Do you see children?',
    a: "Yes, from their first tooth. Children's check-ups cost £35, and children under 16 must come with a parent or guardian.",
  },
];
