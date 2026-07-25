import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Firebase App Hosting uses the standard Next.js build output. */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
  },
};

export default nextConfig;
