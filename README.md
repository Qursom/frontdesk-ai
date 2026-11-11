# FrontDesk AI

An AI front-desk assistant for clinics, sold to UK/EU small businesses.
Phase 1: a chat widget that answers questions from the clinic's own knowledge base (RAG),
collects leads, escalates emergencies, and always discloses it is an AI.

**Live demo:** [web-tau-silk-53.vercel.app](https://web-tau-silk-53.vercel.app)
**Demo clinic:** Bright Smile Dental (fictional)

---

## Architecture

```
Clinic website
  └── <script src="/loader.js" data-tenant="bright-smile">
        │
        ▼
  ┌─────────────────────────────────────┐
  │  Next.js (Vercel)                   │
  │                                     │
  │  /             demo clinic site     │
  │  /embed?tenant= widget iframe       │
  │  /admin         lead manager        │
  │  /demo/dashboard clinic owner view  │
  └──────────────┬──────────────────────┘
                 │  fetch (CORS)
                 ▼
  ┌─────────────────────────────────────┐
  │  NestJS API (Render · Frankfurt)    │
  │                                     │
  │  POST /v1/chat                      │
  │    └─ guardrails (emergency/human)  │
  │    └─ AgentService                  │
  │         └─ retrieval (vectorSearch) │
  │         └─ Gemini LLM (JSON reply)  │
  │    └─ save conversation + messages  │
  │                                     │
  │  GET  /v1/tenants/:slug/public      │
  │  POST /v1/leads                     │
  │  GET  /v1/admin/*  (x-admin-key)    │
  └──────────────┬──────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
  MongoDB Atlas      Google Gemini
  (free M0)          gemini-2.5-flash
  Conversations      gemini-embedding-001
  Messages           (768-dim vectors)
  Leads
  Chunks (RAG)
  Tenants
```

**Request flow:**
1. `loader.js` injects a launcher bubble and an `<iframe src="/embed?tenant=…">`.
2. Widget calls `GET /v1/tenants/:slug/public` for welcome message, theme, quick replies.
3. User message → `POST /v1/chat` → guardrails check (deterministic, before the LLM) →
   `AgentService` retrieves relevant chunks → Gemini generates a JSON reply →
   response `{ reply, action, sources }` is returned.
4. `action` drives widget behaviour: `NONE` (show reply), `SHOW_LEAD_FORM`, `HANDOFF`.

---

## Tech stack

| Layer | Technology |
|---|---|
| API | NestJS 11, TypeScript, Node 20 |
| Web | Next.js 15 App Router, React 19, TypeScript |
| Database | MongoDB Atlas (free M0), Mongoose |
| Vector search | Atlas Vector Search (768-dim, L2-normalised) |
| LLM | Google Gemini 2.5 Flash |
| Embeddings | Gemini `gemini-embedding-001` (768 dims) |
| API hosting | Render (Frankfurt, EU) |
| Web hosting | Vercel |
| Monorepo | npm workspaces |

---

## Local setup

### Prerequisites

- Node >= 20
- A free [MongoDB Atlas](https://mongodb.com/atlas) cluster (M0)
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit apps/api/.env — fill MONGODB_URI, GEMINI_API_KEY, ADMIN_KEY

# 3. Seed the demo tenant
npm run seed

# 4. Create the Atlas vector index
npm run index:create
# Wait in Atlas UI until the index status is READY

# 5. Ingest clinic knowledge
npm run ingest -- bright-smile

# 6. Start both apps
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:3000
```

### Commands

| Command | Description |
|---|---|
| `npm run dev:api` | NestJS API with hot reload |
| `npm run dev:web` | Next.js web app with hot reload |
| `npm run seed` | Upsert tenants from `data/tenants/*/tenant.json` |
| `npm run index:create` | Create Atlas vector index (run once) |
| `npm run ingest -- <slug>` | Chunk + embed clinic `.md` files |
| `npm test` | Jest unit tests (guardrails, chunker, DTOs, timeouts) |
| `npm run eval` | End-to-end eval against the running API |
| `npm run build` | Production build for both apps |

---

## Project structure

```
apps/api/src/
  config/           typed env config (single source of truth)
  schemas/          Mongoose models: Tenant, Chunk, Conversation, Message, Lead
  database/         global DB connection + TTL-index sync
  providers/        LLM + embeddings + notifier (behind interfaces)
  tenants/          tenant lookup with 60-second cache
  rag/              chunker, ingestion, retrieval ($vectorSearch)
  chat/             controller, ChatService, AgentService, guardrails, system prompt
  leads/            lead capture + admin endpoints
  common/           AdminKeyGuard, AllExceptionsFilter, withTimeout, Trim decorator
  scripts/          seed, create-vector-index, ingest, eval

apps/web/
  app/              Next.js pages: demo site, /embed widget, /admin, /demo/dashboard
  components/       ChatWidget, LeadForm, site sections, dashboard panels
  lib/              typed API client, opening-hours logic, clinic content
  public/           loader.js (vanilla JS launcher + iframe)
  middleware.ts     CSP frame-ancestors per tenant

apps/api/data/
  tenants/<slug>/   tenant.json config + *.md knowledge files
  eval/             questions.json (automatic test cases)
```

---

## Compliance

- **EU AI Act Art. 50:** widget discloses AI identity in welcome message and footer; bot answers "I am an AI" if asked.
- **No medical advice:** no diagnosis, no medicine recommendations; urgent cases directed to call clinic / 999 / NHS 111.
- **GDPR:** explicit consent checkbox on lead form; TTL indexes delete conversations after 30 days and leads after 90 days.
- **Multi-tenant isolation:** every DB document has `tenantId`; every query filters by it.

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for Render + Vercel step-by-step instructions.
