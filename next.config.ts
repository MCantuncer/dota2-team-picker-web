import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Hero portraits and Steam avatars.
      new URL("https://cdn.cloudflare.steamstatic.com/apps/dota2/images/**"),
      // Large hero renders, one graded render behind the best pick.
      new URL("https://cdn.cloudflare.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/**"),
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
