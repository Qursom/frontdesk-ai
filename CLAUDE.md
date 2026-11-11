# CLAUDE.md — FrontDesk AI (Phase 1: Website Chat Demo)

## What this project is
An AI front-desk assistant for clinics (dental first), sold to UK/EU small businesses.
Phase 1 = **website chat only**: a chat widget that answers questions from the clinic's own
information (RAG), collects leads, hands urgent cases to staff, and says it is an AI.
Demo client: **Bright Smile Dental** (fictional), tenant slug `bright-smile`.

Later phases (do NOT build unless asked): WhatsApp channel, calendar booking, voice, multi-user admin.

## Tech stack
- Monorepo with npm workspaces: `apps/api` (NestJS 11 + TypeScript) and `apps/web` (Next.js 15 App Router + React 19 + TypeScript)
- Database: MongoDB Atlas (free M0) with Mongoose; RAG via **Atlas Vector Search**
- AI: Google Gemini (`@google/genai`) — chat `gemini-2.5-flash`, embeddings `gemini-embedding-001` (768 dims)
- Hosting: API on Render, web on Vercel. Node >= 20.
- No Tailwind, no UI libraries: plain CSS in `apps/web/app/globals.css` (prefixes `fd-` widget, `site-` demo site, `dash-` clinic owner view, `admin-`). Icons: `lucide-react` only.

## Folder map
```
apps/api/src/
  config/configuration.ts      # all env vars -> typed AppConfig (only place that reads process.env, except TTL in schemas)
  schemas/                     # Tenant, Chunk, Conversation, Message, Lead (+ index.ts ALL_MODELS)
  database/database.module.ts  # global Mongoose connection + models
  database/ttl-sync.service.ts # on start, corrects TTL indexes if retention days changed
  providers/                   # vendor adapters behind interfaces (global module)
    llm/llm.interface.ts       # LLM_PROVIDER token + LlmProvider interface
    llm/gemini-llm.provider.ts
    embeddings/                # EMBEDDING_PROVIDER token + Gemini implementation (L2-normalised)
    notify/notifier.service.ts # email via SMTP if configured, else log
  tenants/                     # tenant lookup (60s cache) + GET /v1/tenants/:slug/public
  rag/                         # chunker.ts (markdown by headings), ingestion.service.ts, retrieval.service.ts ($vectorSearch filtered by tenantId)
  chat/                        # WEB channel adapter + core
    chat.controller.ts         # POST /v1/chat
    chat.service.ts            # channel-independent orchestration (guardrails -> agent -> save)
    agent.service.ts           # retrieve -> prompt -> LLM (JSON) -> parse
    guardrails.ts              # deterministic emergency / human-request detection (runs BEFORE the LLM)
    prompts/system-prompt.ts   # built from tenant config
  leads/                       # POST /v1/leads + admin endpoints (x-admin-key)
  common/                      # AdminKeyGuard, AllExceptionsFilter, Trim() DTO decorator, withTimeout()
  scripts/                     # seed, create-vector-index, ingest, eval
apps/api/data/
  tenants/<slug>/tenant.json   # tenant CONFIG (name, bot name, welcome msg, phone, theme, openingHours, timezone, allowedDomains...)
  tenants/<slug>/*.md          # clinic knowledge for RAG
  eval/questions.json          # automatic test cases
apps/web/
  app/page.tsx                 # fake clinic website (sections in docs/UI-GUIDE.md order); embeds widget via <Script src="/loader.js" data-tenant=...>
  app/tokens.css               # design tokens (docs/UI-GUIDE.md section 1)
  app/embed/page.tsx           # widget page loaded inside the iframe
  app/admin/page.tsx           # leads, conversations, stats (needs ADMIN_KEY)
  app/demo/dashboard/page.tsx  # clinic owner view (sales page, all demo data) + components/dashboard/BrandingPanel.tsx
  components/ChatWidget.tsx, LeadForm.tsx
  components/site/*.tsx        # demo website sections (DemoBanner ... Footer)
  public/loader.js             # vanilla JS: launcher + iframe, postMessage with widget, window.FrontDesk.open({ message })
  middleware.ts                # CSP frame-ancestors for /embed from tenant.allowedDomains
  lib/api.ts                   # typed fetch client
  lib/opening-hours.ts         # open-now / next-opening logic in the clinic's time zone
  lib/clinic-content.ts        # DEMO site content only (the widget never reads it)
```

## Request flow
1. Clinic site loads `loader.js` → bubble → iframe `/embed?tenant=<slug>`.
2. Widget calls `GET /v1/tenants/:slug/public` (welcome message, theme, quick replies).
3. User message → `POST /v1/chat { tenant, conversationId?, message }`.
4. `ChatService`: load tenant → get/create conversation (filtered by tenantId) → last 8 messages → save user msg →
   `checkGuardrails()` → EMERGENCY / HUMAN → fixed safe reply + `HANDOFF` + notify staff;
   otherwise `AgentService.run()` → on error: fallback reply + `HANDOFF`.
5. Response `{ conversationId, reply, action: NONE|SHOW_LEAD_FORM|HANDOFF, handoffReason?: EMERGENCY|HUMAN|ERROR, sources }`.
6. Widget: EMERGENCY → urgent card (Call + "Leave my number"); other HANDOFF → handoff note (after-hours aware) + lead form;
   SHOW_LEAD_FORM → lead form → `POST /v1/leads` (consent required) → email alert.

## Architecture rules (always follow)
1. **Channel ≠ brain.** Controllers are thin channel adapters. All logic lives in `ChatService`/`AgentService`.
   A future WhatsApp adapter must call `ChatService.handle()` with `channel: 'whatsapp'` — never duplicate logic.
2. **Multi-tenant from day one.** Every document has `tenantId`. Every query filters by `tenantId`
   (including `$vectorSearch` filter). Never trust a conversationId without checking its tenantId.
3. **Config, not code.** Nothing clinic-specific in TypeScript. Clinic names, phones, prompts rules, colors live in `tenant.json` / the Tenant document.
4. **Vendors behind interfaces.** Only `providers/` imports `@google/genai`. Business code injects `LLM_PROVIDER` / `EMBEDDING_PROVIDER`.
5. **Safety in code, not only in the prompt.** Emergencies and "talk to a human" are handled by `guardrails.ts` before the LLM.
6. **New widget behaviour = new `action` value** (e.g. `SHOW_BOOKING_SLOTS` in Phase 2), not a new endpoint.
7. Keep it a **modular monolith**. No microservices, Redis, queues or Docker unless asked.

## Compliance rules (EU AI Act Art. 50, GDPR) — never remove
- Welcome message and widget footer must say the user is talking to an **AI**. The bot must answer "I'm an AI assistant" if asked.
- **No medical advice**: no diagnosis, no medicine/dose recommendations. Suggest a consultation; urgent → call clinic / 999 / NHS 111 (from `tenant.emergencyInfo`).
- Answer only from clinic information; unknown → say so + `SHOW_LEAD_FORM`. Never invent prices.
- Leads require an explicit consent checkbox (`consent: true`, stored as `consentAt`).
- TTL indexes: conversations/messages deleted after `CHAT_RETENTION_DAYS` (30), leads after `LEAD_RETENTION_DAYS` (90). Bad/zero values fall back to the defaults; `TtlSyncService` fixes the index on start if the value changes.
- Do not log full patient messages in production beyond what alerts need. Never put secrets in the web app (only `NEXT_PUBLIC_API_URL`).
- Free Gemini tier is for the **demo only** (fictional data). Real patient data needs a paid EU provider (add a new provider class).

## Security rules
- Global ValidationPipe (`whitelist`, `forbidNonWhitelisted`); every request body has a class-validator DTO.
- Rate limits: global 60/min, chat 15/min, leads 5/min per IP (`trust proxy` is on for Render). JSON body limit 20kb; every API response is `no-store`.
- The agent call has a 30s timeout; on timeout/error the visitor gets the fallback reply + `HANDOFF` (`ERROR`).
- Error messages never echo visitor input (e.g. unknown tenant slug). Visitor text in alert emails is kept on one line.
- CORS only for `CORS_ORIGINS` (the web app). Embedding sites are controlled by `frame-ancestors` in `middleware.ts`.
- Admin endpoints use `AdminKeyGuard` (`x-admin-key`, timing-safe compare).
- `loader.js` only accepts postMessages from its own origin.

## Commands
```bash
npm install                       # root, installs both apps
cp apps/api/.env.example apps/api/.env      # fill MONGODB_URI, GEMINI_API_KEY, ADMIN_KEY
cp apps/web/.env.example apps/web/.env.local
npm run seed                      # upsert tenants from data/tenants/*/tenant.json
npm run index:create              # create Atlas vector index (wait until READY)
npm run ingest -- bright-smile    # chunk + embed clinic .md files
npm run dev:api                   # http://localhost:4000  (health: /health)
npm run dev:web                   # http://localhost:3000  (demo site), /admin
npm run eval                      # run data/eval/questions.json against the running API
npm test                          # Jest unit tests in apps/api (src/**/*.spec.ts, no network: guardrails, chunker, agent JSON parsing, DTO validation, timeout)
npm run build                     # build both apps
```

## Coding conventions
- TypeScript strict. No `any` unless unavoidable (comment why).
- NestJS: one module per feature; services hold logic; inject by token for providers.
- Errors: throw Nest HttpExceptions; `AllExceptionsFilter` formats JSON. The chat must never return a blank reply.
- Web: client components only where needed (`'use client'`). Wrap `sessionStorage` in try/catch (iframes may block storage).
- Keep files small and named by responsibility. Comment the "why", not the "what".

## Definition of done for any change
1. `npm run build` passes for both apps.
2. `npm test` passes, and `npm run eval` still passes (add a test case to `data/eval/questions.json` for new behaviour).
3. Compliance + architecture rules above still hold.
4. Update this file if folders, commands or rules change.

## Do NOT
- Hard-code clinic data in code.
- Call Gemini from controllers, the web app, or anywhere outside `providers/`.
- Let the bot promise appointment times (Phase 1 only collects requests).
- Remove the AI disclosure, consent checkbox, TTL indexes or guardrails.
- Add heavy dependencies without asking.
