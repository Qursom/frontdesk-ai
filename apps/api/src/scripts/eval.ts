/**
 * Automatic test of the RUNNING API with real questions (data/eval/questions.json).
 * Each question runs in a fresh conversation.
 * Usage: (API running) npm run eval
 *
 * Checks per case:
 *  - expectAction:   NONE | SHOW_LEAD_FORM | HANDOFF   (exact match, or "ANY_LEAD" = SHOW_LEAD_FORM or HANDOFF)
 *  - mustIncludeAny: at least one of these words/phrases appears in the reply (case-insensitive)
 *  - mustNotInclude: none of these appear
 *  - expectHandoffReason: EMERGENCY | HUMAN | ERROR  (exact match of the response's handoffReason)
 *
 * Security / validation cases use "request" instead of "question": any method, path and JSON body,
 * checked with "expectStatus" (and optionally "expectMessageIncludes" on the error message).
 * "{tenant}" in a path or body string is replaced by the tenant slug. They never reach the AI.
 */
import 'dotenv/config';
import { promises as fs } from 'fs';
import * as path from 'path';

interface Case {
  id: string;
  question?: string;
  request?: { method?: 'GET' | 'POST'; path: string; body?: unknown; headers?: Record<string, string> };
  expectStatus?: number;
  expectMessageIncludes?: string;
  expectAction?: 'NONE' | 'SHOW_LEAD_FORM' | 'HANDOFF' | 'ANY_LEAD';
  mustIncludeAny?: string[];
  mustNotInclude?: string[];
  expectHandoffReason?: 'EMERGENCY' | 'HUMAN' | 'ERROR';
}

const API = process.env.API_URL ?? 'http://localhost:4000';
const TENANT = process.argv[2] ?? 'bright-smile';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Security / validation case: one raw HTTP request, checked by status code. */
async function runRequestCase(c: Case): Promise<boolean> {
  const fill = (s: string) => s.replace(/\{tenant\}/g, TENANT);
  const req = c.request!;
  const res = await fetch(`${API}${fill(req.path)}`, {
    method: req.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(req.headers ?? {}) },
    body: req.body === undefined ? undefined : fill(JSON.stringify(req.body)),
  });
  const body = (await res.json().catch(() => ({}))) as { message?: unknown };
  const message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message ?? '');
  const problems: string[] = [];

  if (c.expectStatus !== undefined && res.status !== c.expectStatus)
    problems.push(`HTTP ${res.status} expected ${c.expectStatus}`);
  if (c.expectMessageIncludes && !message.toLowerCase().includes(c.expectMessageIncludes.toLowerCase()))
    problems.push(`message "${message}" does not include "${c.expectMessageIncludes}"`);
  for (const w of c.mustNotInclude ?? [])
    if (JSON.stringify(body).toLowerCase().includes(w.toLowerCase())) problems.push(`response contains "${w}"`);

  const ok = problems.length === 0;
  console.log(`${ok ? '✅' : '❌'} ${c.id}: ${req.method ?? 'GET'} ${req.path}`);
  console.log(`   → [HTTP ${res.status}] ${message}`);
  if (!ok) console.log(`   ⚠ ${problems.join(' | ')}`);
  return ok;
}

async function main() {
  const file = path.resolve(__dirname, '../../data/eval/questions.json');
  const cases = JSON.parse(await fs.readFile(file, 'utf8')) as Case[];
  let passed = 0;

  for (const c of cases) {
    if (c.request) {
      const ok = await runRequestCase(c);
      if (ok) passed++;
      await sleep(300);
      continue;
    }
    const res = await fetch(`${API}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant: TENANT, message: c.question }),
    });
    const body = (await res.json()) as { reply?: string; action?: string; handoffReason?: string; message?: unknown };
    const reply = (body.reply ?? '').toLowerCase();
    const problems: string[] = [];

    // The error fallback must never count as a pass (e.g. AI quota exhausted).
    if (reply.includes('technical problem')) problems.push('got the error fallback reply (agent failed, see API log)');
    if (!res.ok) problems.push(`HTTP ${res.status} ${JSON.stringify(body.message)}`);
    if (c.expectAction) {
      const ok =
        c.expectAction === 'ANY_LEAD'
          ? body.action === 'SHOW_LEAD_FORM' || body.action === 'HANDOFF'
          : body.action === c.expectAction;
      if (!ok) problems.push(`action=${body.action} expected ${c.expectAction}`);
    }
    if (c.expectHandoffReason && body.handoffReason !== c.expectHandoffReason)
      problems.push(`handoffReason=${body.handoffReason} expected ${c.expectHandoffReason}`);
    if (c.mustIncludeAny?.length && !c.mustIncludeAny.some((w) => reply.includes(w.toLowerCase())))
      problems.push(`missing any of [${c.mustIncludeAny.join(', ')}]`);
    for (const w of c.mustNotInclude ?? []) if (reply.includes(w.toLowerCase())) problems.push(`contains "${w}"`);

    const ok = problems.length === 0;
    if (ok) passed++;
    console.log(`${ok ? '✅' : '❌'} ${c.id}: ${c.question}`);
    console.log(`   → [${body.action}] ${body.reply}`);
    if (!ok) console.log(`   ⚠ ${problems.join(' | ')}`);

    await sleep(4500); // stay under the 15/min chat rate limit + Gemini free-tier limits
  }

  console.log(`\nResult: ${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
