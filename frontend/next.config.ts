import type { NextConfig } from "next";

// Internal address of the backend, reachable over the Docker network.
// Overridable for non-Docker setups (e.g. http://localhost:8000).
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
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
