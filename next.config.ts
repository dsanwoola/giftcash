import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

if (process.env.CLOUDFLARE_DEV) {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
