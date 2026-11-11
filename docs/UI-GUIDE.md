# FrontDesk AI — UI Guide (Demo Clinic Website + Chat Widget)

> This file lives at `docs/UI-GUIDE.md`. It describes the UI as built against the real backend (see section 0.1).
> Goal: a calm, premium, **UK-realistic** dental clinic website that makes the **AI chat widget the hero**, plus a
> "Clinic owner view" that shows clinic owners why they should buy.

---

## 0. Design direction (one sentence)
**"Calm boutique clinic":** teal + warm neutrals, a soft serif for headings, a clean sans-serif for text, lots of white space,
rounded cards, friendly lifestyle photos (no drills or needles), and a "Book" button always within reach.

**Learn from these (ideas only, never copy their photos, logos, text or colours):**
Tend (boutique feel, repeated soft CTA) · Green Door Dental (teal, rating badge, one main action) ·
Siha Dental & Facial, London (Book dropdown, fee tables, finance, nervous-patients page) ·
ODL Dental Clinic, London (plain-English "what to expect") · Bupa Dental Care (simple "From £X" price tables).

**The backend is the source of truth.** The demo clinic is **Bright Smile Dental** (tenant slug `bright-smile`), a fictional
clinic in Islington, London. Its AI assistant is **Sophie**, its phone is 020 7946 0321 and its colour is `#0F766E`.
The widget reads all of these from `GET /v1/tenants/:slug/public`; nothing clinic-specific is hard-coded in the widget.
The demo website text (`apps/web/lib/clinic-content.ts`) must match `apps/api/data/tenants/bright-smile/clinic.md`.

### 0.1 API contract the UI is built on
| Endpoint | Request | Response |
|---|---|---|
| `GET /v1/tenants/:slug/public` | — | `slug`, `name`, `botName`, `welcomeMessage`, `quickReplies[]`, `theme { primaryColor, primaryContrast, radius?, font? }`, `phone`, `privacyUrl`, `allowedDomains[]`, `openingHours[] { day, open, close }`, `timezone` |
| `POST /v1/chat` (15/min per IP) | `tenant`, `message` (1–1000 chars), `conversationId?` | `conversationId`, `reply`, `action` (`NONE` \| `SHOW_LEAD_FORM` \| `HANDOFF`), `handoffReason?` (`EMERGENCY` \| `HUMAN` \| `ERROR`, only with `HANDOFF`), `sources[]` |
| `POST /v1/leads` (5/min per IP) | `tenant`, `conversationId?`, `name` (2–100), `phone` (digits, spaces, `+ ( ) -`, 6–25), `email?`, `preferredTime?` (max 100), `reason?` (max 300), `consent: true` | `{ ok, leadId }` |
| `GET /v1/admin/stats` · `/leads` · `/conversations` · `/conversations/:id/messages` | `x-admin-key` header + `?tenant=` | used only by `/admin` |

Rules that follow from it: the API rejects unknown fields, so send only the fields above and leave optional fields out when
they are empty (never `""`). HTTP 429 → a friendly "please wait a minute" message. HTTP 400 → show the API's message next to the form.

---

## 1. Design tokens (`apps/web/app/tokens.css`)

### 1.1 Colours (WCAG AA checked)
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--color-primary` | `#0F766E` | Buttons, links, chat header, launcher | White text ≈ 5.5:1 ✅ |
| `--color-primary-hover` | `#115E59` | Hover/active | White ≈ 7.6:1 ✅ |
| `--color-primary-soft` | `#F0FDFA` | Soft sections, bot bubbles | Ink ≈ 17:1 ✅ |
| `--color-ink` | `#0F172A` | Headings, body text | On white ≈ 17.8:1 ✅ |
| `--color-ink-muted` | `#475569` | Secondary text | On white ≈ 7.6:1 ✅ |
| `--color-surface` | `#FFFFFF` | Cards, chat panel | — |
| `--color-warm` | `#FAF7F2` | Hero, reviews background | Ink ≈ 16.8:1 ✅ |
| `--color-accent` | `#B45309` | Small highlights ("0% finance") | On white ≈ 5.0:1 ✅ |
| `--color-border` | `#E2E8F0` | Decorative dividers only | — |
| `--color-input-border` | `#64748B` | Inputs, checkboxes | ≈ 4.8:1 ✅ (needs ≥ 3:1) |
| `--color-success` | `#15803D` | "Sent", "Lead saved" | ≈ 5.0:1 ✅ |
| `--color-danger` | `#B91C1C` | Emergency card, errors | ≈ 6.5:1 ✅ |
| `--color-focus` | `#1D4ED8` | 3px focus ring | ≈ 6.7:1 ✅ |

Don't use light teal like `#0D9488` for small text (≈ 3.7:1).

### 1.2 Typography (self-host with `next/font/google`, so visitors' browsers never call Google, which helps with GDPR)
| Role | Font | Weights |
|---|---|---|
| Headings | **Fraunces** (soft serif) | 500, 600 |
| Body, UI, chat | **Inter** | 400, 500, 600 |

Scale: 14 / 16 (body) / 18 / 22 / 28 / 36 / 48 px. Line-height: 1.6 for body, 1.2 for headings. Chat text 15–16 px (never below 14).

### 1.3 Tokens file
```css
:root {
  /* colours */
  --color-primary:#0F766E; --color-primary-hover:#115E59; --color-primary-soft:#F0FDFA;
  --color-ink:#0F172A; --color-ink-muted:#475569; --color-surface:#FFFFFF; --color-warm:#FAF7F2;
  --color-accent:#B45309; --color-border:#E2E8F0; --color-input-border:#64748B;
  --color-success:#15803D; --color-danger:#B91C1C; --color-focus:#1D4ED8;

  /* type */
  --font-heading: var(--font-fraunces), Georgia, serif;
  --font-body: var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --text-sm:14px; --text-base:16px; --text-lg:18px; --text-xl:22px; --text-2xl:28px; --text-3xl:36px; --text-4xl:48px;

  /* spacing */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:24px; --space-6:32px; --space-7:48px; --space-8:72px;

  /* shape */
  --radius-sm:8px; --radius-md:14px; --radius-lg:20px; --radius-pill:999px;
  --shadow-sm:0 1px 2px rgba(15,23,42,.06);
  --shadow-md:0 6px 20px rgba(15,23,42,.08);
  --shadow-lg:0 18px 48px rgba(15,23,42,.16);

  /* motion */
  --ease:cubic-bezier(.2,.8,.2,1); --dur:200ms;

  /* layout */
  --container:1160px; --header-h:72px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation:none !important; transition:none !important; scroll-behavior:auto !important; }
}
:focus-visible { outline:3px solid var(--color-focus); outline-offset:2px; }
html { scroll-padding-top: calc(var(--header-h) + 16px); } /* WCAG 2.4.11: sticky header must not hide focus */
```

### 1.4 Widget theming (per clinic)
The widget reads these from the tenant's public config (`theme`). The tokens above are the fallback only.
`--fd-primary` (`theme.primaryColor`), `--fd-primary-contrast` (`theme.primaryContrast`), `--fd-radius` (`theme.radius`), `--fd-font` (`theme.font`).
**Contrast guard:** the API computes `primaryContrast` from the contrast ratio with white: below 4.5:1 it returns `#0F172A`
(dark text). If the field is missing, the widget does the same check itself (`apps/web/lib/contrast.ts`).

### 1.5 Components (build once, reuse)
| Component | Spec |
|---|---|
| Button primary | bg primary, white text, 600 weight, `--radius-pill`, min-height 44px, padding 12px 22px, hover → primary-hover |
| Button secondary | white bg, 1.5px primary border, primary text |
| Button ghost/link | primary text, underline on hover |
| Card | white, 1px border, `--radius-md`, `--shadow-sm`, padding 24px; hover → `--shadow-md` (no movement under reduced motion) |
| Badge/pill | `--radius-pill`, 12–13px, soft bg (primary-soft or accent at 10%) |
| Section | padding `--space-8` top/bottom (48px on mobile), container max `--container` |
| Input | 44px height, 1px `--color-input-border`, `--radius-sm`, **visible label** above (not only a placeholder) |
| Icon | **Lucide** (ISC licence) via `lucide-react`, 20–24px, `aria-hidden` when decorative |

---

## 2. Demo clinic website — sections in order

The file is `apps/web/app/page.tsx`, split into components under `apps/web/components/site/`.

| # | Section | Layout and content |
|---|---|---|
| 0 | **Demo banner** | Thin warm bar: "Demo website for a fictional clinic, built to show FrontDesk AI. [Clinic owner view →]" |
| 1 | **Top bar** | primary-soft bg, 14px: "Open today 8:30–18:00 · 📞 020 7946 0321 · Same-day emergency appointments". "Open today" is computed from the hours. |
| 2 | **Sticky header** | Logo (tooth icon + "Bright Smile Dental" in Fraunces) · Nav: Treatments · Prices · Nervous patients · Team · Contact · right side: phone icon button + **Book appointment** (opens chat with the booking flow). Mobile: logo + menu button + **sticky bottom bar** with [📞 Call] [📅 Book] (the chat launcher moves up 72px so it never covers it). |
| 3 | **Hero** | Two columns on `--color-warm`. Left: H1 "Gentle, modern dentistry in Islington", subline "Private family dental care. Nervous patients welcome. Open Saturdays.", CTAs [Book appointment] [See prices], trust row: ★ 4.9 · 300+ reviews (demo) · CQC registered · 0% finance. Right: rounded image card (calm lifestyle photo or illustration) with a **floating chat-preview bubble**: "Hi, I'm Sophie, the clinic's AI assistant. Ask me about prices 👋" (clicking it opens the chat). |
| 4 | **Trust strip** | 4 icon items: GDC-registered dentists · Registered with CQC · Nervous patients welcome · Evening & Saturday appointments |
| 5 | **Treatments** | 3-column grid (1 column on mobile), 6 cards: Check-up & X-rays, Hygienist, Whitening, Invisalign, Implants, Emergency. Each: Lucide icon, title, one plain-English line, "From £X", "Ask about this →" (opens the chat with the question pre-filled). |
| 6 | **Prices** | A real `<table>`: Treatment · From · What's included. Note: "Guide prices. Final price confirmed at your consultation. Written treatment plan before any work." Finance callout (accent badge): "0% finance on treatments over £1,000 (demo)". |
| 7 | **Nervous patients** | Soft teal panel: H2 "Scared of the dentist? You're not alone." Text: about 1 in 2 adults in England feel some dental anxiety, and about 1 in 8 feel extreme anxiety (Adult Oral Health Survey 2021). List: Tell us your worries privately · Agree a stop signal · Extra-long first visit · Step-by-step explanations. CTA: **"Ask our assistant privately"** (opens the chat with a nervous-patient message). |
| 8 | **Meet the team** | 3–4 cards: illustrated avatar (no real faces), name, role, "BDS (London) · GDC No. 000000 (demo)", one friendly fact. |
| 9 | **Reviews** | 3 cards on warm bg: stars, short text, "Sarah K. · Oct 2026". Section label: **"Sample reviews (demo)"**. |
| 10 | **Smile gallery placeholder** | Dashed card: "Before & after gallery: add your own consented, unedited cases here (UK ASA rules)." Never show fake before/after photos. |
| 11 | **Emergency** | Red-outlined card: "Toothache, swelling or a broken tooth? Call 020 7946 0321, we keep same-day slots. Severe swelling or trouble breathing: call 999. Out of hours: NHS 111." |
| 12 | **Hours + Find us** | Hours table with **today highlighted** · address, transport, step-free access · a **static map image or illustration** (no Google Maps embed, so no cookies before consent). |
| 13 | **FAQ** | 6 `<details>` items (accessible by default): new patients, NHS?, Saturday, finance, cancellations, children. |
| 14 | **Footer** | Address, phone, email · GDC link · Complaints procedure · Privacy & cookies · CQC registration · **"Website last updated: [date]"** · "Bright Smile Dental is a fictional demo clinic created by FrontDesk AI." |

**Why the UK items matter:** the GDC expects practice sites to show contact details, a GDC link, a complaints procedure, the
last-updated date and GDC numbers for clinicians. ASA rules say before/after photos must be genuine with signed proof.
Clear "From £X" pricing matters because the CMA is studying private dentistry pricing (2026). Showing these makes your demo
look real to UK clinic owners. (Not legal advice; clinics should check with their adviser.)

**Images and icons (legal):**
- Icons: **Lucide** (ISC) or Heroicons (MIT); keep the licence file in the repo.
- People: prefer **illustrated avatars** (e.g. DiceBear) or your own SVG illustrations for the team.
- Photos: Unsplash or Pexels; choose rooms, hands or soft-focus scenes. Don't present stock faces as real dentists or patients.
- Never use real clinics' photos, logos, names or reviews.

**Performance targets:** LCP < 2.5s, INP < 200ms, CLS < 0.1. Use `next/image` with set sizes, `next/font`, and no heavy libraries.

---

## 3. Chat widget — every state

Files: `apps/web/components/ChatWidget.tsx`, `LeadForm.tsx`, `apps/web/public/loader.js`, CSS with the `fd-` prefix.

**Size:** desktop panel 380×600 px, `--radius-lg`, `--shadow-lg`, 24px from bottom-right. Mobile ≤ 640px: full screen with `100dvh`;
the header and input stay fixed and work with the iOS keyboard open.

| # | State | Design | Microcopy |
|---|---|---|---|
| 1 | **Launcher (closed)** | 60px circle, primary bg, white Lucide `MessageCircle`. `<button aria-expanded="false" aria-label="Open chat with Bright Smile Dental assistant">`. No bounce or pulse. | — |
| 2 | **Teaser** | Small card above the launcher after **8s**, **once per session**, **not on mobile** at first load. Dismiss "×" (≥ 24px). Text depends on the page or section. | Default: "Hi! I'm Sophie, the clinic's AI assistant. Questions about prices or appointments?" |
| 3 | **Open / welcome** | Header: avatar · **"Sophie"** · pill **"AI assistant"** · subline "Bright Smile Dental · replies instantly" · **New conversation** button (asks "Start a new conversation? This clears the current chat." first) + close button (closing keeps the chat for this tab). The first message contains the AI disclosure. Then the chips. Name, clinic, message and chips are shown **exactly as the API returns them** (`botName`, `name`, `welcomeMessage`, `quickReplies`). | Current tenant values: "Hi, I'm Sophie 👋 I'm an **AI assistant** for Bright Smile Dental, not a person. I can help with prices, opening times and appointment requests. For medical advice, our team will help." Chips: **Book an appointment · Prices · I'm in pain · Talk to the team** |
| 4 | **Typing** | 3 pulsing dots (brand colour) in a bot bubble with a visible label; under reduced motion the dots stand still. A hidden status region announces it. The input grows with its text up to 120px, then scrolls. | "Sophie is typing…" After 8s: "Still working on it…" |
| 5 | **Answer** | Bot bubble: primary-soft bg, ink text, `--radius-md` (bottom-left 4px). User bubble: primary bg, white text. Max width 85%. Web addresses, email addresses and the clinic's phone number in a reply become simple underlined links (`LinkedText.tsx`; http/https only, no markdown or HTML). Optional "From: Prices" source chip. | "A new patient check-up is from £75 and takes about 40 minutes. Would you like me to request a time for you?" |
| 6 | **Lead form (inline card)** | Visible labels: Name · Phone · Email (optional) · Preferred time (chips Morning / Afternoon / Saturday just fill the one `preferredTime` text field) · Reason (optional) · **unticked consent checkbox** · big "Send to the team" button. Validated with the same limits as the API; a 400 message from the API is shown above the button, a 429 as "please wait a minute". | Consent: "I agree that Bright Smile Dental can contact me about my enquiry. Privacy notice." Success: "✅ Thanks, Sam! The team will contact you soon." |
| 7 | **Urgent** | Red-outlined card with a phone button, and **no clinical advice**. Shown when the API returns `action: HANDOFF` with `handoffReason: EMERGENCY`. | The card text is the API's `reply`, unchanged (it includes the clinic phone and the tenant's `emergencyInfo`: 999 / A&E / NHS 111). Buttons: [📞 Call the clinic] (`tel:` from the tenant phone) [Leave my number] (opens the lead form) |
| 8 | **Handoff** | Any other `HANDOFF` (`handoffReason` `HUMAN` or `ERROR`): the API's `reply`, then a system message line (centered, muted) and the lead form. Phase 1 is a lead-form handoff only; a live human chat comes later. Be honest about out-of-hours, using `openingHours` + `timezone` from the public config. | In hours: "I've let the team know. Leave your number and they'll contact you shortly." After hours: "The clinic is closed now. Leave your number and we'll call you tomorrow from 8:30am." |
| 9 | **Waking up / error** | Skeleton bubble + "Connecting…" for up to 8s while a free Render server wakes up, then a "Try again" button. Always show the phone number as a fallback. | "Sorry, I'm having trouble connecting. Try again, or call us on 020 7946 0321." Rate limit (429): "You are sending messages very quickly. Please wait a minute and try again." |
| 10 | **Footer (always)** | Muted 12px text under the input. | "AI assistant · may make mistakes · please don't share medical details · Privacy" |

**Accessibility checklist (WCAG 2.2 AA):**
- [ ] Launcher is a `<button>` with `aria-expanded`; panel is `role="dialog"` + `aria-label="Chat with Bright Smile Dental"`.
- [ ] Message list uses `role="log"` + `aria-live="polite"`; announce a bot message only when it is complete.
- [ ] Opening the chat focuses the input; **Esc** closes it and focus returns to the launcher.
- [ ] Tab order: header → messages → chips → input → send.
- [ ] Chips are real `<button>`s, ≥ 44px tall, and wrap (no horizontal scroll).
- [ ] Every icon button has a label ("Open chat", "Close chat", "Send message").
- [ ] Text can grow to 200% without breaking; check contrast for each clinic colour.
- [ ] The launcher never covers the mobile Call/Book bar or focused page elements (WCAG 2.4.11).
- [ ] `prefers-reduced-motion` turns off all animations.

**Performance:** `loader.js` loads with `defer`, draws only the launcher, and makes no API call until the visitor interacts.
The one exception is a silent `GET /health` ping to wake a sleeping free server. It uses fetch mode `no-cors` and never reads
the response, because the API's CORS only allows the web app's origin. The widget retries the tenant config call (3 attempts).

**loader.js ↔ widget messages:** `frontdesk:ready`, `frontdesk:open`, `frontdesk:close`, `frontdesk:theme`
and `frontdesk:prefill` (`{ text }`, cut to 1000 chars), so site buttons like "Ask about this →" can open the chat with a question.
The demo site calls `window.FrontDesk.open({ message })`, which `loader.js` exposes. A prefilled message is sent through the
same `POST /v1/chat` call as a typed one. Embedding stays `loader.js` → iframe `/embed?tenant=<slug>`; which sites may frame it
comes from `tenant.allowedDomains` (`frame-ancestors` in `middleware.ts`).

---

## 4. "Clinic owner view": the page that sells

Route: `apps/web/app/demo/dashboard/page.tsx` (link in the demo banner). **All numbers are labelled "Demo data".**

| Block | Content |
|---|---|
| KPI cards | Leads captured this week: 23 · After-hours enquiries: 9 (39%) · Avg. reply time: 2s · Handed to staff: 4 |
| Leads table | Name · Interest · Time · Status chip (New / Called / Booked) |
| "Before / After" graphic | **Without FrontDesk AI:** call at 19:40 → voicemail → patient books elsewhere. **With FrontDesk AI:** chat at 19:40 → price answered → callback requested → lead in your inbox. Add a small note: "One 2026 vendor analysis found 38% of inbound dental calls went unanswered (vendor data)." |
| Try-it prompts | 3 buttons that open the widget: "How much is Invisalign?" · "Are you open Saturday?" · "I'm scared of injections" |
| Branding panel | Clinic name input + colour picker + AI name → live preview of the widget (with the contrast guard). Frontend-only: it never calls or saves to the API. |
| Compliance badges | "AI disclosure at first message (EU AI Act Art. 50)" · "WCAG 2.2 AA widget" · "GDPR consent capture" · "Auto-delete chats after 30 days" (only claim what is true) |
| CTA | "Want this on your clinic's website? Get a free demo with your own content →" (mailto or form) |

This page stays static. The real numbers live on `/admin`, which uses only the existing admin endpoints
(`/v1/admin/stats`, `/leads`, `/conversations`, `/conversations/:id/messages`) with the `x-admin-key` header and `?tenant=`.

---

## 5. Files to create or change
```
apps/web/app/tokens.css                    (new: tokens)
apps/web/app/globals.css                   (import tokens, base styles, site + fd + admin styles)
apps/web/app/layout.tsx                    (next/font Fraunces + Inter, metadata)
apps/web/app/page.tsx                      (compose site sections)
apps/web/components/site/*.tsx             (TopBar, Header, MobileActionBar, Hero, TrustStrip, Treatments,
                                            Prices, Nervous, Team, Reviews, GalleryPlaceholder, Emergency,
                                            HoursAndMap, Faq, Footer, DemoBanner)
apps/web/lib/clinic-content.ts             (site content data: hours, treatments, prices, team, FAQ)
apps/web/components/ChatWidget.tsx         (states 3–10, a11y)
apps/web/components/LeadForm.tsx           (labels, time chips, consent)
apps/web/public/loader.js                  (launcher, teaser rules, dialog a11y, prefill, Esc, mobile offset, health ping)
apps/web/app/demo/dashboard/page.tsx       (Clinic owner view)
```
UI work never changes `apps/api`. If a design idea needs a backend change, drop or adapt the idea.
Dependencies allowed: `lucide-react` only. No UI frameworks, no Tailwind (keep plain CSS as in CLAUDE.md).

---

## 6. Definition of done (UI)
- [ ] Looks right at 375px, 768px, 1280px and 1440px.
- [ ] Lighthouse: Accessibility ≥ 95, Performance ≥ 90 (desktop), no CLS from fonts or images.
- [ ] Keyboard only: you can open the chat, use chips, fill the lead form, submit and close (Esc).
- [ ] Screen reader (VoiceOver or NVDA) announces new bot messages once.
- [ ] Reduced motion: no animations.
- [ ] The AI disclosure is visible in the header badge, the first message and the footer.
- [ ] Every demo number, review and team member is labelled demo or fictional.
- [ ] `npm run build` passes; `npm run eval` passes for `bright-smile`, without editing the eval questions.
