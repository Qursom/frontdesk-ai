'use client';

import { RotateCcw, Send, TriangleAlert, X, CircleCheck } from 'lucide-react';
import { CSSProperties, useId, useState } from 'react';
import { contrastRatio, contrastTextFor, HEX_RE, INK, WHITE } from '@/lib/contrast';

/** Branding panel: clinic owners type their name and colour and see the real widget styles update live. */
export default function BrandingPanel() {
  const id = useId();
  const [clinicName, setClinicName] = useState('Bright Smile Dental');
  const [aiName, setAiName] = useState('Sophie');
  const [color, setColor] = useState('#0F766E');
  const [hexText, setHexText] = useState('#0F766E');

  const ratioWhite = contrastRatio(color, WHITE);
  const passes = ratioWhite >= 4.5;
  const textColor = contrastTextFor(color);
  const ratioUsed = contrastRatio(color, textColor);

  const name = clinicName.trim() || 'Your clinic';
  const bot = aiName.trim() || 'Assistant';

  const onHex = (v: string) => {
    setHexText(v);
    const withHash = v.startsWith('#') ? v : `#${v}`;
    if (HEX_RE.test(withHash)) setColor(withHash.toUpperCase());
  };

  const previewStyle = { '--fd-primary': color, '--fd-primary-contrast': textColor } as CSSProperties;

  return (
    <div className="dash-branding">
      <form className="card dash-branding-form" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label className="label" htmlFor={`${id}-clinic`}>
            Clinic name
          </label>
          <input id={`${id}-clinic`} className="input" value={clinicName} maxLength={40} onChange={(e) => setClinicName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${id}-ai`}>
            AI assistant name
          </label>
          <input id={`${id}-ai`} className="input" value={aiName} maxLength={20} onChange={(e) => setAiName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${id}-hex`}>
            Brand colour
          </label>
          <div className="dash-color-row">
            <input
              type="color"
              className="dash-color"
              value={color}
              aria-label="Pick brand colour"
              onChange={(e) => {
                setColor(e.target.value.toUpperCase());
                setHexText(e.target.value.toUpperCase());
              }}
            />
            <input
              id={`${id}-hex`}
              className="input"
              value={hexText}
              maxLength={7}
              spellCheck={false}
              aria-describedby={`${id}-contrast`}
              onChange={(e) => onHex(e.target.value.trim())}
            />
          </div>
        </div>

        <p id={`${id}-contrast`} className={`dash-contrast ${passes ? 'is-ok' : 'is-warn'}`} role="status">
          {passes ? (
            <>
              <CircleCheck size={18} aria-hidden="true" />
              <span>
                White text on this colour: <strong>{ratioWhite.toFixed(1)}:1</strong>. Passes WCAG AA (4.5:1).
              </span>
            </>
          ) : (
            <>
              <TriangleAlert size={18} aria-hidden="true" />
              <span>
                White text on this colour is only <strong>{ratioWhite.toFixed(1)}:1</strong>, below WCAG AA (4.5:1). The
                widget switches to dark text ({ratioUsed.toFixed(1)}:1). Pick a darker colour to keep white text.
              </span>
            </>
          )}
        </p>
      </form>

      <figure className="dash-preview">
        {/* Uses the real widget classes, so what owners see is what patients get. Static: not a working chat. */}
        <div className="fd" style={previewStyle}>
          <div className="fd-header">
            <div className="fd-avatar" aria-hidden="true">
              {bot.charAt(0)}
            </div>
            <div className="fd-title">
              <div className="fd-name-row">
                <strong>{bot}</strong>
                <span className="fd-pill">AI assistant</span>
              </div>
              <span className="fd-sub">{name} · replies instantly</span>
            </div>
            <span className="fd-icon-btn" aria-hidden="true">
              <RotateCcw size={20} />
            </span>
            <span className="fd-icon-btn" aria-hidden="true">
              <X size={20} />
            </span>
          </div>
          <div className="fd-scroll">
            <div className="fd-msg fd-bot">
              Hi, I&apos;m {bot} 👋 I&apos;m an AI assistant for {name}, not a person. I can help with prices, opening times
              and appointment requests.
            </div>
            <div className="fd-msg fd-user">How much is a check-up?</div>
            <div className="fd-bot-group">
              <div className="fd-msg fd-bot">A routine check-up is £55. Would you like me to request a time for you?</div>
              <span className="fd-source">From: Examinations and hygiene</span>
            </div>
            <div className="fd-chips" aria-hidden="true">
              <span className="dash-chip">Book an appointment</span>
              <span className="dash-chip">Prices</span>
            </div>
          </div>
          <div className="fd-input" aria-hidden="true">
            <span className="dash-fake-input">Type your question…</span>
            <span className="fd-send">
              <Send size={18} />
            </span>
          </div>
          <div className="fd-footer">AI assistant · may make mistakes · please don&apos;t share medical details</div>
        </div>
        <figcaption>
          Live preview · text colour <code>{textColor === INK ? 'dark' : 'white'}</code>
        </figcaption>
      </figure>
    </div>
  );
}
