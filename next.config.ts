import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.16.115", "100.82.139.63", "localhost", "127.0.0.1"],
  agentRules: false,
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["geoip-lite", "@prisma/client", "@prisma/adapter-pg", "pg"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
