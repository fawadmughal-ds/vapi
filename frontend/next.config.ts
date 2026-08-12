import type { NextConfig } from "next";

// Internal address of the backend, reachable over the Docker network.
// Overridable for non-Docker setups (e.g. http://localhost:8000).
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

// Content-Security-Policy. Because access/refresh JWTs live in localStorage,
// a CSP is the primary defense against token theft via injected scripts: it
// restricts which origins may load/execute scripts and where the app may
// connect. Kept reasonably permissive for Next.js (inline styles, GA/GTM, the
// Vapi web SDK + its media/websocket endpoints) while blocking arbitrary hosts.
// Next.js dev mode (`next dev`) compiles with eval-based source maps and React
// dev tooling that require 'unsafe-eval'. Production builds never use eval, so
// we only relax the policy outside production.
const isDev = process.env.NODE_ENV !== "production";

// Vapi's in-browser web SDK (@vapi-ai/web) runs WebRTC through Daily.co, which
// loads a call bundle/worker from *.daily.co and opens websockets to it. These
// hosts must be whitelisted or the browser "Talk to your agent" call fails.
const DAILY = "https://*.daily.co";
const DAILY_WS = "wss://*.daily.co";

const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  "https://www.googletagmanager.com https://www.google-analytics.com",
  DAILY,
]
  .filter(Boolean)
  .join(" ");

// The browser talks to the API at NEXT_PUBLIC_API_URL when set (e.g.
// http://localhost:8000 in Docker dev); otherwise it uses the same origin via
// the Next.js rewrite. Whitelist that origin for fetch/XHR so CSP allows it.
function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

const connectSrc = isDev
  ? // Dev is local-only: allow localhost API/HMR websockets so hot reload and a
    // cross-port backend both work without fighting CSP.
    `connect-src 'self' http://localhost:* ws://localhost:* https://api.vapi.ai wss://*.vapi.ai https://*.vapi.ai ${DAILY} ${DAILY_WS} https://www.google-analytics.com`
  : [
      "connect-src 'self'",
      apiOrigin(),
      `https://api.vapi.ai wss://*.vapi.ai https://*.vapi.ai ${DAILY} ${DAILY_WS} https://www.google-analytics.com`,
    ]
      .filter(Boolean)
      .join(" ");

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; GA/GTM are loaded for analytics.
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // XHR/fetch/websocket: API origin + Vapi + Daily (WebRTC) + analytics.
  connectSrc,
  // Recordings can be served from Vapi storage or an arbitrary CDN/S3 host, and
  // the web call streams remote audio from Daily — allow any https media + blob.
  `media-src 'self' blob: https: ${DAILY}`,
  // Daily spawns web workers (blob:) and may mount a call frame from *.daily.co.
  "worker-src 'self' blob:",
  "child-src 'self' blob: https://*.daily.co",
  "frame-src 'self' https://*.daily.co",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
  // Allow same-origin microphone for in-app web calling; block camera/geo.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Allow the public tunnel host to make dev requests without warnings.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.io"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Serve the API under the same origin as the app so a single public URL
  // (e.g. one ngrok domain) works for both the UI and the backend.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_INTERNAL_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
