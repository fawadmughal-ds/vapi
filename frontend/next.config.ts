import type { NextConfig } from "next";

// Internal address of the backend, reachable over the Docker network.
// Overridable for non-Docker setups (e.g. http://localhost:8000).
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // Allow the public tunnel host to make dev requests without warnings.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.io"],
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
