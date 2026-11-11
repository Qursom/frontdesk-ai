'use client';

import { FormEvent, useId, useRef, useState } from 'react';
import { api, isRateLimited } from '@/lib/api';

interface Props {
  tenant: string;
  clinicName: string;
  privacyUrl?: string;
  conversationId?: string;
  /** Called with the visitor's first name, for the thank-you message. */
  onDone: (firstName: string) => void;
  onCancel: () => void;
}

type Field = 'name' | 'phone' | 'email' | 'preferredTime' | 'reason' | 'consent';
type Errors = Partial<Record<Field, string>>;

const TIMES = ['Morning', 'Afternoon', 'Saturday'];
const FIELD_ORDER: Field[] = ['name', 'phone', 'email', 'preferredTime', 'reason', 'consent'];

// Same rules as the API's CreateLeadDto, so the visitor sees the problem before sending.
const PHONE_RE = /^[+()\d\s-]{6,25}$/;
// Local-part: safe printable chars; domain: labels separated by dots; TLD: 2+ alpha chars only.
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function validate(v: { name: string; phone: string; email: string; time: string; reason: string; consent: boolean }): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  if (name.length < 2) e.name = 'Please enter your name.';
  else if (name.length > 100) e.name = 'Please use 100 characters or fewer.';
  const digits = v.phone.replace(/\D/g, '');
  if (!v.phone.trim()) e.phone = 'Please enter a phone number so the team can call you.';
  else if (!PHONE_RE.test(v.phone.trim()) || digits.length < 6) e.phone = 'Please check the number. Use digits, spaces, + or brackets.';
  if (v.email.trim()) {
    if (!EMAIL_RE.test(v.email.trim())) e.email = 'Please enter a valid email address (e.g. name@example.com), or leave it empty.';
    else if (v.email.trim().length > 254) e.email = 'Email address is too long.';
  }
  if (v.time.trim().length > 100) e.preferredTime = 'Please keep this to 100 characters or fewer.';
  if (v.reason.trim().length > 300) e.reason = 'Please keep this to 300 characters or fewer.';
  if (!v.consent) e.consent = 'Please tick the box so the team can contact you.';
  return e;
}

export default function LeadForm({ tenant, clinicName, privacyUrl, conversationId, onDone, onCancel }: Props) {
  const id = useId();
  const fid = (f: Field) => `${id}-${f}`;
  const [form, setForm] = useState({ name: '', phone: '', email: '', timeText: '', reason: '' });
  const [consent, setConsent] = useState(false); // GDPR: must start unticked
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    // Clear a field's error as soon as the visitor edits it.
    const field: Field = k === 'timeText' ? 'preferredTime' : k;
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  /** Validate a single field when focus leaves it, so the visitor doesn't have to submit to see errors. */
  const blur = (k: keyof typeof form) => () => {
    const v = form[k].trim();
    const field: Field = k === 'timeText' ? 'preferredTime' : k;
    let msg: string | undefined;
    if (k === 'name') {
      if (v.length > 0 && v.length < 2) msg = 'Please enter your full name.';
      else if (v.length > 100) msg = 'Please use 100 characters or fewer.';
    } else if (k === 'phone' && v.length > 0) {
      const digits = v.replace(/\D/g, '');
      if (!PHONE_RE.test(v) || digits.length < 6) msg = 'Please check the number. Use digits, spaces, + or brackets.';
    } else if (k === 'email' && v.length > 0) {
      if (!EMAIL_RE.test(v)) msg = 'Please enter a valid email address (e.g. name@example.com).';
      else if (v.length > 254) msg = 'Email address is too long.';
    }
    if (msg) setErrors((er) => ({ ...er, [field]: msg }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const preferredTime = form.timeText.trim();
    const found = validate({ ...form, time: preferredTime, consent });
    setErrors(found);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      refs.current[first]?.focus(); // screen readers read the label + the inline error
      return;
    }

    setBusy(true);
    try {
      // Only fields CreateLeadDto accepts (the API rejects unknown fields); optional ones are left out when empty.
      await api.lead({
        tenant,
        ...(conversationId ? { conversationId } : {}),
        name: form.name.trim(),
        phone: form.phone.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(preferredTime ? { preferredTime } : {}),
        ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
        consent: true,
      });
      onDone(form.name.trim().split(/\s+/)[0] ?? '');
    } catch (err) {
      // 429 = leads limit (5 per minute). 400 = the API's own validation message, shown as it is.
      setSubmitError(
        isRateLimited(err)
          ? 'Too many requests just now. Please wait a minute and try again.'
          : (err as Error).message || 'Could not send. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  /** Props that link an input to its inline error. */
  const a11y = (f: Field) => ({
    id: fid(f),
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `${fid(f)}-error` : undefined,
    ref: (el: HTMLInputElement | null) => {
      refs.current[f] = el;
    },
  });
  const errorText = (f: Field) =>
    errors[f] ? (
      <p id={`${fid(f)}-error`} className="fd-field-error">
        {errors[f]}
      </p>
    ) : null;

  return (
    <form className="fd-lead" onSubmit={submit} aria-labelledby={`${id}-title`} noValidate>
      <p id={`${id}-title`} className="fd-lead-title">
        Leave your details and the team will contact you
      </p>

      <div className="fd-field">
        <label htmlFor={fid('name')}>Name</label>
        <input {...a11y('name')} value={form.name} onChange={set('name')} onBlur={blur('name')} maxLength={100} autoComplete="name" />
        {errorText('name')}
      </div>

      <div className="fd-field">
        <label htmlFor={fid('phone')}>Phone</label>
        <input
          {...a11y('phone')}
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={set('phone')}
          onBlur={blur('phone')}
          maxLength={25}
          autoComplete="tel"
        />
        {errorText('phone')}
      </div>

      <div className="fd-field">
        <label htmlFor={fid('email')}>
          Email <span className="fd-optional">(optional)</span>
        </label>
        <input
          {...a11y('email')}
          type="email"
          inputMode="email"
          value={form.email}
          onChange={set('email')}
          onBlur={blur('email')}
          maxLength={254}
          autoComplete="email"
          placeholder="e.g. name@example.com"
        />
        {errorText('email')}
      </div>

      <fieldset className="fd-field fd-fieldset">
        <legend>
          Preferred time <span className="fd-optional">(optional)</span>
        </legend>
        <div className="fd-times">
          {TIMES.map((t) => (
            <button
              key={t}
              type="button"
              className="fd-time"
              aria-pressed={form.timeText.trim() === t}
              // A chip only fills the preferredTime text: the API has one free-text field for it.
              onClick={() => {
                setForm((f) => ({ ...f, timeText: f.timeText.trim() === t ? '' : t }));
                if (errors.preferredTime) setErrors((er) => ({ ...er, preferredTime: undefined }));
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <label htmlFor={fid('preferredTime')} className="visually-hidden">
          Other day or time
        </label>
        <input
          {...a11y('preferredTime')}
          value={form.timeText}
          onChange={set('timeText')}
          maxLength={100}
          placeholder="Or type a day or time, e.g. Tuesday after 4pm"
        />
        {errorText('preferredTime')}
      </fieldset>

      <div className="fd-field">
        <label htmlFor={fid('reason')}>
          Reason <span className="fd-optional">(optional)</span>
        </label>
        <input {...a11y('reason')} value={form.reason} onChange={set('reason')} maxLength={300} placeholder="e.g. check-up" />
        {errorText('reason')}
      </div>

      <div className="fd-field">
        <label className="fd-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (errors.consent) setErrors((er) => ({ ...er, consent: undefined }));
            }}
            {...a11y('consent')}
          />
          <span>
            I agree that {clinicName} can contact me about my enquiry.{' '}
            {privacyUrl && (
              <a href={privacyUrl} target="_blank" rel="noreferrer">
                Privacy notice<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            )}
          </span>
        </label>
        {errorText('consent')}
      </div>

      {submitError && (
        <p className="fd-form-error" role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" className="fd-btn fd-btn-primary fd-btn-block fd-btn-lg" disabled={busy}>
        {busy ? 'Sending…' : 'Send to the team'}
      </button>
      <button type="button" className="fd-link-btn" onClick={onCancel}>
        Not now
      </button>
    </form>
  );
}
