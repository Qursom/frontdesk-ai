# Deployment Guide

Stack: **NestJS API → Render (Frankfurt)** · **Next.js web → Vercel**

---

## 1 · Prerequisites

- MongoDB Atlas cluster with the `chunks_vector_index` vector index already created and in **READY** state (`npm run index:create` locally).
- Seed data uploaded: `npm run seed && npm run ingest -- bright-smile`.
- A Gemini API key (Google AI Studio).
- A long random string for `ADMIN_KEY` (e.g. `openssl rand -hex 32`).

---

## 2 · Deploy the API on Render

1. Push this repo to GitHub (already done).
2. Go to [render.com](https://render.com) → **New → Web Service** → connect the `frontdesk-ai` repo.
3. Render will detect `render.yaml` automatically. Confirm the detected settings:
   - **Root directory:** `apps/api`
   - **Build command:** `npm install && npm run build`
   - **Start command:** `node dist/main.js`
   - **Region:** Frankfurt (EU)
   - **Node version:** 20
4. Set the following **environment variables** in the Render dashboard (marked `sync: false` in `render.yaml` — Render will not auto-fill these):

   | Variable | Value |
   |---|---|
   | `CORS_ORIGINS` | Your Vercel URL (set after Step 3, update it then) |
   | `MONGODB_URI` | Full Atlas connection string |
   | `GEMINI_API_KEY` | Your Gemini key |
   | `ADMIN_KEY` | Long random string |
   | `HANDOFF_EMAIL` | Fallback alert email address |
   | `SMTP_HOST` | `smtp.gmail.com` or `smtp-relay.brevo.com` (optional) |
   | `SMTP_PORT` | `465` (Gmail) or `587` (Brevo) |
   | `SMTP_USER` | SMTP login |
   | `SMTP_PASS` | App password (no spaces) |
   | `SMTP_FROM` | `"FrontDesk AI <you@gmail.com>"` |
   | `NOTIFICATION_WEBHOOK_URL` | Slack/Discord/ntfy.sh URL (optional) |

5. Click **Deploy**. Wait for the build to finish.
6. Verify: `https://<your-render-service>.onrender.com/health` → should return `{"status":"ok"}`.
7. Note your Render URL — you need it in the next step.

---

## 3 · Deploy the web app on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the `frontdesk-ai` repo.
2. Set **Root Directory** to `apps/web` (Vercel auto-detects Next.js from there).
3. Set these **Environment Variables**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<your-render-service>.onrender.com` |
   | `DASHBOARD_ADMIN_KEY` | Same value as `ADMIN_KEY` on Render |
   | `DASHBOARD_TENANT` | `bright-smile` |

4. Click **Deploy**. Note your Vercel URL (e.g. `https://frontdesk-ai.vercel.app`).

---

## 4 · Wire CORS back to Render

1. In the Render dashboard → your service → **Environment**.
2. Set `CORS_ORIGINS` to your Vercel URL (no trailing slash), e.g.:
   ```
   https://frontdesk-ai.vercel.app
   ```
3. Render will restart the service automatically.

---

## 5 · Post-deploy checklist

- [ ] `GET /health` returns `{"status":"ok"}`.
- [ ] Widget loads at `https://<vercel-url>` — welcome message appears.
- [ ] A chat message returns a reply (RAG working).
- [ ] Submit the lead form — email or webhook alert fires.
- [ ] `/admin` page loads and shows leads (enter `ADMIN_KEY` when prompted).
- [ ] Run the eval suite against the live API:
  ```bash
  API_URL=https://<your-render-service>.onrender.com npm run eval
  ```
  All cases should pass.
- [ ] Confirm the widget footer says "Powered by AI" (EU AI Act disclosure).
- [ ] In the browser DevTools → Network: confirm API responses have `Cache-Control: no-store`.
- [ ] Confirm `/embed` is served with correct `frame-ancestors` CSP (check response headers).

---

## Render free-tier note

Free Render instances spin down after 15 minutes of inactivity. The first request after a cold start may take ~30 s. Upgrade to the Starter plan ($7/mo) or add an external uptime monitor (e.g. [uptimerobot.com](https://uptimerobot.com)) to keep it warm.
