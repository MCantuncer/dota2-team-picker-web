import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { test as base, expect, type Page } from "@playwright/test";
import { SNAPSHOT_URL } from "../src/lib/engine/snapshot";
import type { Database } from "../src/lib/supabase/database.types";

const BACKEND_REF = readFileSync("backend-ref.txt", "utf8").trim();
/** The backend's committed hero data at the pinned commit. Older than the bucket's, but fixed, so tests repeat. */
const HERO_DATA_FIXTURE = `https://raw.githubusercontent.com/MCantuncer/dota2-team-picker/${BACKEND_REF}/services/engine/data/snapshot.json`;

let heroDataCache: Promise<Record<string, unknown>> | undefined;

/** The hero data the tests serve in place of the Storage bucket, downloaded once per worker. */
export function heroData(): Promise<Record<string, unknown>> {
  heroDataCache ??= fetch(HERO_DATA_FIXTURE).then((res) => {
    if (!res.ok) throw new Error(`Hero data fixture download failed (${res.status})`);
    return res.json() as Promise<Record<string, unknown>>;
  });
  return heroDataCache;
}

/**
 * Playwright's `test`, with the hero data bucket answered from the fixture: the local Supabase stack runs
 * without Storage, so the site's real hero data URL has nothing behind it in tests.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(SNAPSHOT_URL, async (route) => route.fulfill({ json: await heroData() }));
    await provide(page);
  },
});

/** Fails on accessibility problems axe rates serious or critical (WCAG 2.2 AA rules). */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

/** A fresh email per test, so tests can run in parallel and again without cleanup. */
export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const PASSWORD = "e2e-password-123";

/** Admin access to the local test database, for setup the site has no UI for (like account types). */
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and E2E_SUPABASE_SECRET_KEY must point at the local stack");
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) throw new Error("E2E tests only run against a local Supabase");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export async function setUserType(email: string, type: "user" | "captain" | "admin") {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  if (!id) throw new Error(`No user ${email}`);
  const { error: updateError } = await db.from("profiles").update({ user_type: type }).eq("id", id);
  if (updateError) throw updateError;
}

export async function signUp(page: Page, email: string, name: string) {
  await page.goto("/signup?next=/profile");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up with email" }).click();
  // Match the path, not the whole URL: "/signup?next=/profile" also ends in "/profile".
  await expect(page).toHaveURL((url) => url.pathname === "/profile");
}

export async function logIn(page: Page, email: string, next = "/profile") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page).toHaveURL((url) => url.pathname === next);
}
