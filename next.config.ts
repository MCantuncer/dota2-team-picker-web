import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Captain mode is gone: every party plans its draft on /draft.
  async redirects() {
    return [{ source: "/admin/captain", destination: "/draft", permanent: true }];
  },
  images: {
    // Steam sends hero art and avatars without a Cache-Control header, so the 4 hour default made Vercel
    // resize the same images again several times a day. Hero art changes only with a game patch.
    minimumCacheTTL: 2678400, // 31 days
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
