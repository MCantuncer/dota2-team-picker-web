import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // "server-only" throws outside a React Server Component build; tests import those modules directly.
    alias: { "server-only": new URL("./test/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // The engine copy is tested in the backend repo.
      exclude: ["src/**/*.test.{ts,tsx}", "src/lib/engine/**"],
      reporter: ["text-summary", "lcov"],
    },
  },
});
