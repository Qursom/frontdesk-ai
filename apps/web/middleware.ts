import { NextRequest, NextResponse } from 'next/server';

/**
 * "CORS per tenant" for the widget:
 * the widget page (/embed) may only be framed by websites listed in the tenant's allowedDomains
 * (plus this app itself, for the demo site). Uses CSP frame-ancestors.
 * Every other page gets frame-ancestors 'self' from next.config.mjs.
 */
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/** domains === null means "the API says this tenant does not exist": nobody may frame it. */
type Entry = { at: number; domains: string[] | null };
const cache = new Map<string, Entry>();
const TTL = 5 * 60 * 1000;
const MAX_ENTRIES = 500; // made-up slugs must not grow the cache without limit
const API_TIMEOUT_MS = 4000; // a sleeping API must not hold the widget page back

function remember(slug: string, domains: string[] | null) {
  if (cache.size >= MAX_ENTRIES && !cache.has(slug)) cache.clear();
  cache.set(slug, { at: Date.now(), domains });
}

async function allowedDomains(slug: string): Promise<string[] | null> {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL) return hit.domains;
  try {
    const res = await fetch(`${API_URL}/v1/tenants/${encodeURIComponent(slug)}/public`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (res.ok) {
      const raw: unknown = (await res.json()).allowedDomains;
      const domains = Array.isArray(raw) ? raw.filter((d): d is string => typeof d === 'string') : [];
      remember(slug, domains);
      return domains;
    }
    if (res.status === 404) {
      remember(slug, null);
      return null;
    }
    // 429 / 5xx: a temporary API problem says nothing about the tenant, so it is never cached.
  } catch {
    // API asleep, unreachable or too slow: same as above.
  }
  // Temporary failure: keep using the last known answer if there is one, otherwise this app only.
  return hit ? hit.domains : [];
}

export async function middleware(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('tenant') ?? '';
  const res = NextResponse.next();
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) {
    res.headers.set('Content-Security-Policy', "frame-ancestors 'self'");
    return res;
  }
  const domains = await allowedDomains(slug);
  // Only origins (scheme + host + optional port, "*." subdomain wildcard allowed). A bare "https://*",
  // paths or quoted CSP keywords in the config are dropped.
  const ancestors =
    domains === null
      ? ["'none'"]
      : ["'self'", ...domains.filter((d) => /^https?:\/\/(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?$/i.test(d))];
  res.headers.set('Content-Security-Policy', `frame-ancestors ${ancestors.join(' ')}`);
  return res;
}

export const config = { matcher: ['/embed'] };
