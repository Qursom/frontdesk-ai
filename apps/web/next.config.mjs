import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the monorepo root so Next doesn't pick up a stray lockfile from a parent folder.
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Every page: no content-type guessing, and only the origin is sent as referrer.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Only /embed may be framed by other sites (middleware.ts sets its frame-ancestors per tenant).
        // Everything else, including /admin, can only be framed by this app: no clickjacking.
        source: '/((?!embed(?:/|$)).*)',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }],
      },
      {
        // loader.js is loaded by clinic websites: allow cross-origin + short cache so updates roll out fast.
        source: '/loader.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
