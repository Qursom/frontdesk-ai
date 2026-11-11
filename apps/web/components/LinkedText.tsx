import { Fragment, ReactNode } from 'react';

const URL_PART = 'https?:\\/\\/[^\\s<>"\']+|www\\.[^\\s<>"\']+';
const EMAIL_PART = '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+';
const TRAILING = /[.,!?;:)\]]+$/; // sentence punctuation that follows a link, not part of it

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Only http(s) links are ever created, so a reply can never produce a javascript: or data: link. */
function safeHttpHref(raw: string): string | null {
  try {
    const url = new URL(/^www\./i.test(raw) ? `https://${raw}` : raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Plain text with simple links: web addresses, email addresses and the clinic's own phone number.
 * No markdown and no HTML: everything else is rendered as text, exactly as the API sent it.
 */
export default function LinkedText({ text, phone }: { text: string; phone?: string }) {
  const clinicPhone = phone?.trim() ?? '';
  const parts = [URL_PART, EMAIL_PART];
  if (clinicPhone.length >= 6) parts.push(escapeRe(clinicPhone));
  // One capturing group, so split() returns text and matches alternately (matches at odd positions).
  const pieces = text.split(new RegExp(`(${parts.join('|')})`, 'gi'));

  return (
    <>
      {pieces.map((piece, i): ReactNode => {
        if (i % 2 === 0 || !piece) return <Fragment key={i}>{piece}</Fragment>;

        if (clinicPhone && piece === clinicPhone) {
          return (
            <a key={i} href={`tel:${piece.replace(/[^\d+]/g, '')}`} target="_top">
              {piece}
            </a>
          );
        }

        const tail = TRAILING.exec(piece)?.[0] ?? '';
        const core = tail ? piece.slice(0, -tail.length) : piece;

        if (!/^(https?:|www\.)/i.test(core)) {
          return (
            <Fragment key={i}>
              <a href={`mailto:${core}`} target="_top">
                {core}
              </a>
              {tail}
            </Fragment>
          );
        }

        const href = safeHttpHref(core);
        if (!href) return <Fragment key={i}>{piece}</Fragment>;
        return (
          <Fragment key={i}>
            <a href={href} target="_blank" rel="noopener noreferrer">
              {core}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            {tail}
          </Fragment>
        );
      })}
    </>
  );
}
