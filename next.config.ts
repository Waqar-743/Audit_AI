import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const connectSource = isDev
  ? "connect-src 'self' ws: wss:"
  : "connect-src 'self'";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com https://*.vercel.app${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' blob: data: https:",
  `${connectSource} https://vercel.live https://*.vercel-scripts.com https://*.vercel.app https://*.pusher.com wss://*.pusher.com`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'self' https://vercel.live",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
