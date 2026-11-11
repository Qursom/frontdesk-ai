'use client';

import { PhoneCall, RefreshCw, RotateCcw, Send, X } from 'lucide-react';
import { CSSProperties, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api, ChatAction, HandoffReason, isRateLimited, isValidationError, TenantPublicConfig } from '@/lib/api';
import { contrastTextFor, HEX_RE } from '@/lib/contrast';
import { isOpenNow, nextOpeningText } from '@/lib/opening-hours';
import LeadForm from './LeadForm';
import LinkedText from './LinkedText';

type Msg =
  | { kind: 'bot'; content: string; action?: ChatAction; handoffReason?: HandoffReason; sources?: string[] }
  | { kind: 'user'; content: string }
  | { kind: 'system'; content: string }
  | { kind: 'error'; content: string; retryText?: string };

interface Stored {
  conversationId?: string;
  messages: Msg[];
  leadSent: boolean;
}

type Connection = 'connecting' | 'ready' | 'failed';

// v2: the message shape changed, so old sessions start fresh instead of breaking.
const storageKey = (t: string) => `fd-chat:v2:${t}`;
const CONFIG_ATTEMPTS = 3;
const CONFIG_TIMEOUT_MS = 8000; // a sleeping free Render server can take a while to wake up
const SLOW_REPLY_MS = 8000; // after this, the typing indicator says the answer is still coming
const INPUT_MAX_HEIGHT = 120; // px; the textarea grows with its text up to here, then scrolls

function load(t: string): Stored | null {
  try {
    const raw = sessionStorage.getItem(storageKey(t));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}
function save(t: string, s: Stored) {
  try {
    sessionStorage.setItem(storageKey(t), JSON.stringify(s));
  } catch {
    /* storage blocked (e.g. third-party iframe in Safari) - chat still works in memory */
  }
}
function clear(t: string) {
  try {
    sessionStorage.removeItem(storageKey(t));
  } catch {
    /* ignore */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

async function loadConfig(tenant: string): Promise<TenantPublicConfig> {
  let lastError: unknown;
  for (let i = 0; i < CONFIG_ATTEMPTS; i++) {
    try {
      return await withTimeout(api.tenant(tenant), CONFIG_TIMEOUT_MS);
    } catch (e) {
      lastError = e;
      if (i < CONFIG_ATTEMPTS - 1) await sleep(1500 * (i + 1));
    }
  }
  throw lastError;
}

const postToParent = (data: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.parent !== window) window.parent.postMessage(data, '*');
};

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** "Clinic (demo) > Prices (guide prices in GBP) > Cosmetic treatments" -> "Cosmetic treatments" */
const sourceLabel = (heading: string) =>
  (heading.split('>').pop() ?? heading).replace(/\s*\([^)]*\)/g, '').trim();

/** Text colour on the clinic's brand colour: the API's value, or the same WCAG check done here if it is missing. */
function primaryContrast(theme?: TenantPublicConfig['theme']): string | undefined {
  if (theme?.primaryContrast) return theme.primaryContrast;
  return theme?.primaryColor && HEX_RE.test(theme.primaryColor) ? contrastTextFor(theme.primaryColor) : undefined;
}

/** Honest handoff note: never promise a quick call-back when the clinic is closed. */
function handoffNote(config: TenantPublicConfig): string {
  const hours = config.openingHours ?? [];
  if (!hours.length) return "I've let the team know. Leave your number and they'll contact you as soon as possible.";
  if (isOpenNow(hours, config.timezone)) return "I've let the team know. Leave your number and they'll contact you shortly.";
  const next = nextOpeningText(hours, config.timezone);
  return next
    ? `The clinic is closed now. Leave your number and we'll call you ${next}.`
    : 'The clinic is closed now. Leave your number and the team will contact you when it reopens.';
}

export default function ChatWidget({ tenant, fallbackPhone }: { tenant: string; fallbackPhone?: string }) {
  const [config, setConfig] = useState<TenantPublicConfig | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [attempt, setAttempt] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [queued, setQueued] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const newBtnRef = useRef<HTMLButtonElement>(null);
  const focusWanted = useRef(false);
  const confirmOpen = useRef(false); // read by the Esc handler, which is registered once
  confirmOpen.current = confirmNew;

  const phone = config?.phone || fallbackPhone || '';
  const botName = config?.botName ?? 'Assistant';
  const clinicName = config?.name ?? 'the clinic';

  // Load tenant config (with retries while the server wakes up) + restore this tab's conversation.
  useEffect(() => {
    if (!tenant) {
      setConnection('failed');
      return;
    }
    let cancelled = false;
    setConnection('connecting');
    loadConfig(tenant)
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        setConnection('ready');
        postToParent({
          type: 'frontdesk:theme',
          color: cfg.theme?.primaryColor,
          contrast: primaryContrast(cfg.theme),
          name: cfg.name,
        });
        const stored = load(tenant);
        if (stored?.messages?.length) {
          setMessages(stored.messages);
          setConversationId(stored.conversationId);
          setLeadSent(stored.leadSent);
        } else {
          setMessages([{ kind: 'bot', content: cfg.welcomeMessage }]);
        }
      })
      .catch(() => !cancelled && setConnection('failed'));
    return () => {
      cancelled = true;
    };
  }, [tenant, attempt]);

  useEffect(() => {
    if (config && messages.length) save(tenant, { conversationId, messages, leadSent });
  }, [config, tenant, conversationId, messages, leadSent]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, showLead, connection]);

  // Auto-growing input: one line when empty, taller as the visitor types, scrolling after INPUT_MAX_HEIGHT.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const border = el.offsetHeight - el.clientHeight;
    const wanted = el.scrollHeight + border;
    el.style.height = `${Math.min(wanted, INPUT_MAX_HEIGHT)}px`;
    el.style.overflowY = wanted > INPUT_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [input, config]);

  // A slow answer (cold server, busy model) gets an honest "still working" note instead of endless dots.
  useEffect(() => {
    if (!sending) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), SLOW_REPLY_MS);
    return () => clearTimeout(t);
  }, [sending]);

  // Focus the input once it is enabled, if the panel was opened while we were still connecting.
  useEffect(() => {
    if (connection === 'ready' && config && focusWanted.current) {
      focusWanted.current = false;
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [connection, config]);

  // Messages from loader.js: focus on open; site buttons ("Book appointment", "Ask about this") send a question.
  // The parent is the clinic's site (any origin), so only accept messages from the parent window itself.
  // (Which sites may frame the widget at all is enforced by frame-ancestors in middleware.ts.)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window.parent || !e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'frontdesk:open') {
        // The input is disabled until the config loads; remember the request and focus once it is enabled.
        focusWanted.current = true;
        if (inputRef.current && !inputRef.current.disabled) {
          inputRef.current.focus();
          focusWanted.current = false;
        }
      }
      if (e.data.type === 'frontdesk:prefill' && typeof e.data.text === 'string' && e.data.text.trim()) {
        setQueued(e.data.text.slice(0, 1000));
      }
    };
    // Esc closes the panel; loader.js returns focus to the launcher.
    // If the "new conversation" question is open, Esc only cancels that.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmOpen.current) {
        setConfirmNew(false);
        newBtnRef.current?.focus();
      } else {
        postToParent({ type: 'frontdesk:close' });
      }
    };
    window.addEventListener('message', onMsg);
    window.addEventListener('keydown', onKey);
    postToParent({ type: 'frontdesk:ready' });
    return () => {
      window.removeEventListener('message', onMsg);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const send = useCallback(
    async (text: string, isRetry = false) => {
      const message = text.trim();
      if (!message || sending || !config) return;
      setInput('');
      setMessages((m) => {
        const withoutErrors = m.filter((x) => x.kind !== 'error');
        return isRetry ? withoutErrors : [...withoutErrors, { kind: 'user', content: message }];
      });
      setSending(true);
      try {
        const res = await api.chat(tenant, message, conversationId);
        setConversationId(res.conversationId);
        const urgent = res.action === 'HANDOFF' && res.handoffReason === 'EMERGENCY';
        const next: Msg[] = [
          { kind: 'bot', content: res.reply, action: res.action, handoffReason: res.handoffReason, sources: res.sources },
        ];
        if (res.action === 'HANDOFF' && !urgent) next.push({ kind: 'system', content: handoffNote(config) });
        setMessages((m) => [...m, ...next]);
        // The form follows the latest reply: it opens when the API asks for it and closes again when the
        // conversation moves on (e.g. the visitor asks a price question instead of filling it in).
        // The urgent card has its own "Leave my number" button, so the form is not forced on someone in pain.
        setShowLead(!leadSent && (res.action === 'SHOW_LEAD_FORM' || (res.action === 'HANDOFF' && !urgent)));
      } catch (e) {
        setMessages((m) => [
          ...m,
          isRateLimited(e)
            ? {
                kind: 'error',
                content: 'You are sending messages very quickly. Please wait a minute and try again.',
                retryText: message,
              }
            : isValidationError(e)
              ? // 400: retrying the same text cannot work, so show what the API said instead of a retry button.
                { kind: 'error', content: `Sorry, that message could not be sent: ${(e as Error).message}.` }
              : {
                kind: 'error',
                content: `Sorry, I'm having trouble connecting. Try again${phone ? `, or call us on ${phone}` : ''}.`,
                  retryText: message,
                },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [tenant, conversationId, sending, leadSent, config, phone],
  );

  // A queued site-button message is sent as soon as the widget can send (config loaded, nothing in flight).
  useEffect(() => {
    if (!queued || connection !== 'ready' || !config || sending) return;
    setQueued(null);
    void send(queued);
  }, [queued, connection, config, sending, send]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const onLeadDone = (firstName: string) => {
    setShowLead(false);
    setLeadSent(true);
    setMessages((m) => [
      ...m,
      { kind: 'bot', content: `✅ Thanks${firstName ? `, ${firstName}` : ''}! The team will contact you soon.` },
    ]);
  };

  // Closing keeps the conversation for this tab; only "New conversation" clears it.
  const closePanel = () => postToParent({ type: 'frontdesk:close' });
  const hasConversation = messages.length > 1 || !!conversationId;
  const cancelNew = () => {
    setConfirmNew(false);
    newBtnRef.current?.focus();
  };
  const startNew = () => {
    clear(tenant);
    setConversationId(undefined);
    setLeadSent(false);
    setShowLead(false);
    setInput('');
    setConfirmNew(false);
    // The welcome message (with the AI disclosure) always starts the new conversation.
    if (config) setMessages([{ kind: 'bot', content: config.welcomeMessage }]);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const theme = config?.theme;
  const contrast = primaryContrast(theme);
  const style = {
    ...(theme?.primaryColor ? { '--fd-primary': theme.primaryColor } : {}),
    ...(contrast ? { '--fd-primary-contrast': contrast } : {}),
    ...(theme?.radius ? { '--fd-radius': `${theme.radius}px` } : {}),
    ...(theme?.font ? { '--fd-font': theme.font } : {}),
  } as CSSProperties;

  const showChips = connection === 'ready' && messages.length === 1 && !sending && !!config?.quickReplies?.length;

  return (
    <div className="fd" style={style} role="dialog" aria-label={`Chat with ${clinicName}`}>
      <header className="fd-header">
        <div className="fd-avatar" aria-hidden="true">
          {botName.charAt(0)}
        </div>
        <div className="fd-title">
          <div className="fd-name-row">
            <strong>{botName}</strong>
            <span className="fd-pill">AI assistant</span>
          </div>
          <span className="fd-sub">{config ? `${clinicName} · replies instantly` : 'Connecting…'}</span>
        </div>
        <button
          ref={newBtnRef}
          type="button"
          className="fd-icon-btn"
          aria-label="New conversation"
          title="New conversation"
          aria-expanded={confirmNew}
          disabled={!hasConversation || sending}
          onClick={() => setConfirmNew((v) => !v)}
        >
          <RotateCcw size={20} aria-hidden="true" />
        </button>
        <button type="button" className="fd-icon-btn" aria-label="Close chat" title="Close chat" onClick={closePanel}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      {confirmNew && (
        <div className="fd-confirm" role="alertdialog" aria-labelledby="fd-confirm-text">
          <p id="fd-confirm-text">Start a new conversation? This clears the current chat.</p>
          <div className="fd-actions">
            {/* Focus moves here so keyboard and screen-reader users land on the question. */}
            <button type="button" className="fd-btn fd-btn-primary" autoFocus onClick={startNew}>
              Start new
            </button>
            <button type="button" className="fd-btn fd-btn-outline" onClick={cancelNew}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Focusable so keyboard users can scroll the history even when it holds no buttons (WCAG 2.1.1). */}
      <div className="fd-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Messages">
        {connection === 'connecting' && (
          <div className="fd-connecting">
            <div className="fd-skeleton" aria-hidden="true" />
            <p role="status">Connecting…</p>
          </div>
        )}

        {connection === 'failed' && (
          <div className="fd-msg fd-bot fd-error" role="alert">
            <p>
              Sorry, I&apos;m having trouble connecting. Try again{phone ? `, or call us on ${phone}` : ''}.
            </p>
            <div className="fd-actions">
              <button type="button" className="fd-btn fd-btn-primary" onClick={() => setAttempt((a) => a + 1)}>
                <RefreshCw size={16} aria-hidden="true" />
                Try again
              </button>
              {phone && (
                <a className="fd-btn fd-btn-outline" href={telHref(phone)} target="_top">
                  <PhoneCall size={16} aria-hidden="true" />
                  Call {phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Only complete messages are added to the log, so each is announced once. */}
        <div className="fd-log" role="log" aria-live="polite" aria-label="Conversation">
          {messages.map((m, i) => {
            if (m.kind === 'user') {
              return (
                <div key={i} className="fd-msg fd-user">
                  <span className="visually-hidden">You: </span>
                  {m.content}
                </div>
              );
            }
            if (m.kind === 'system') {
              return (
                <p key={i} className="fd-system">
                  {m.content}
                </p>
              );
            }
            if (m.kind === 'error') {
              return (
                <div key={i} className="fd-msg fd-bot fd-error">
                  <p>{m.content}</p>
                  {m.retryText && (
                    <div className="fd-actions">
                      <button type="button" className="fd-btn fd-btn-outline" onClick={() => void send(m.retryText!, true)}>
                        <RefreshCw size={16} aria-hidden="true" />
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              );
            }
            if (m.handoffReason === 'EMERGENCY') {
              // Text comes from the API's fixed emergency reply: no clinical advice is generated here.
              return (
                <div key={i} className="fd-urgent">
                  <span className="visually-hidden">{botName}: </span>
                  <p>
                    <LinkedText text={m.content} phone={phone} />
                  </p>
                  <div className="fd-actions">
                    {phone && (
                      <a className="fd-btn fd-btn-danger" href={telHref(phone)} target="_top">
                        <PhoneCall size={16} aria-hidden="true" />
                        Call the clinic
                      </a>
                    )}
                    {!leadSent && (
                      <button type="button" className="fd-btn fd-btn-outline" onClick={() => setShowLead(true)}>
                        Leave my number
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            const source = m.sources?.[0];
            return (
              <div key={i} className="fd-bot-group">
                <div className="fd-msg fd-bot">
                  <span className="visually-hidden">{botName}: </span>
                  <LinkedText text={m.content} phone={phone} />
                </div>
                {source && <span className="fd-source">From: {sourceLabel(source)}</span>}
              </div>
            );
          })}
        </div>

        {sending && (
          <div className="fd-typing-row" aria-hidden="true">
            <div className="fd-typing">
              <span className="fd-dot" />
              <span className="fd-dot" />
              <span className="fd-dot" />
            </div>
            <span className="fd-typing-label">{slow ? 'Still working on it…' : `${botName} is typing…`}</span>
          </div>
        )}
        {/* The visible indicator is hidden from screen readers; this status line is what they hear. */}
        <div className="visually-hidden" role="status">
          {sending ? (slow ? `${botName} is still working on your answer` : `${botName} is typing`) : ''}
        </div>

        {showChips && (
          <div className="fd-chips">
            {config!.quickReplies.map((q) => (
              <button key={q} type="button" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        {showLead && config && (
          <LeadForm
            tenant={tenant}
            clinicName={config.name}
            privacyUrl={config.privacyUrl}
            conversationId={conversationId}
            onDone={onLeadDone}
            onCancel={() => setShowLead(false)}
          />
        )}
      </div>

      <form className="fd-input" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={1000}
          placeholder="Type your question…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!config}
          aria-label="Your message"
        />
        <button type="submit" className="fd-send" disabled={!input.trim() || sending || !config} aria-label="Send message">
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
      <footer className="fd-footer">
        AI assistant · may make mistakes · please don&apos;t share medical details
        {config?.privacyUrl && (
          <>
            {' · '}
            <a href={config.privacyUrl} target="_blank" rel="noreferrer">
              Privacy
            </a>
          </>
        )}
      </footer>
    </div>
  );
}
