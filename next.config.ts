import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Hero portraits and Steam avatars.
      new URL("https://cdn.cloudflare.steamstatic.com/apps/dota2/images/**"),
      new URL("https://avatars.steamstatic.com/**"),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
