import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import { SNAPSHOT_URL } from "../src/lib/engine/snapshot";
import type { Database, Json } from "../src/lib/supabase/database.types";

/**
 * The backend commit the tests run against: the newest one whose database types match the site's copy. CI sets
 * BACKEND_REF once for the job; a local run works it out (see scripts/check-backend-sync.mjs).
 */
const BACKEND_REF =
  process.env.BACKEND_REF ?? execFileSync("node", ["scripts/check-backend-sync.mjs", "--schema-commit"], { encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/.test(BACKEND_REF)) throw new Error("BACKEND_REF must be a full commit SHA");
/** The backend's committed hero data at that commit. Older than the bucket's, but fixed, so tests repeat. */
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
  // Typing scrolls the page by a different amount each run, which can leave a button half under the
  // sticky header; axe then reports it as too small. Check the page from the top so results are stable.
  await page.evaluate(() => window.scrollTo(0, 0));
  // With reduced motion every animation stops at its end state, so contrast is never measured mid-fade. The
  // motion itself is checked by eye in screenshots; tests after this go on with motion allowed.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  await page.emulateMedia({ reducedMotion: null });
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

/** The suggestion lists saved for a user in party drafts. */
export async function savedSuggestions(email: string) {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  const { data, error: readError } = await db.from("draft_suggestions").select("position, heroes").eq("user_id", id!);
  if (readError) throw readError;
  return data;
}

/**
 * Links a made-up Steam account to the user and opens a hero pool card for Monkey King at carry,
 * as the trends job would. Returns the card id.
 */
export async function seedPoolCard(email: string) {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  if (!id) throw new Error(`No user ${email}`);
  // A unique made-up SteamID64 per user, since profiles.steam_id is unique.
  const steamId = `7656119${String(Date.now()).slice(-7)}${String(Math.floor(Math.random() * 1e3)).padStart(3, "0")}`;
  const { error: steamError } = await db.from("profiles").update({ steam_id: steamId }).eq("id", id);
  if (steamError) throw steamError;
  const { data, error: cardError } = await db
    .from("pool_suggestions")
    .insert({
      user_id: id,
      hero_id: 114,
      position: 1,
      question: "Add Monkey King to your carry heroes?",
      reason: "You won 86% of your last 7 Monkey King games as carry (pos 1).",
      evidence: { games: 7, wins: 6 },
    })
    .select("id")
    .single();
  if (cardError) throw cardError;
  return data.id;
}

/** Makes two signed-up users friends, so one can invite the other to a party. */
export async function befriend(emailA: string, emailB: string) {
  const db = admin();
  const ids = await Promise.all(
    [emailA, emailB].map(async (address) => {
      const { data, error } = await db.rpc("user_id_by_email", { address });
      if (error) throw error;
      if (!data) throw new Error(`No user ${address}`);
      return data;
    }),
  );
  const { error } = await db.from("friendships").insert({ requester_id: ids[0]!, addressee_id: ids[1]!, status: "accepted" });
  if (error) throw error;
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

/** Seeds an ended party draft that the user played, with a match report holding `facts`. Returns the draft id. */
export async function seedReport(email: string, report: { status: string; facts: object | null }) {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  if (!id) throw new Error(`No user ${email}`);
  const { data: party, error: partyError } = await db.from("parties").insert({ leader_id: id, closed_at: new Date().toISOString() }).select("id").single();
  if (partyError) throw partyError;
  const matchId = 9072422905;
  const { data: draft, error: draftError } = await db
    .from("party_drafts")
    .insert({ party_id: party.id, started_by: id, ended_at: new Date().toISOString(), match_id: matchId, won: true })
    .select("id")
    .single();
  if (draftError) throw draftError;
  const { error: playerError } = await db.from("draft_players").insert({ draft_id: draft.id, user_id: id, hero_id: 145, hero_source: "position" });
  if (playerError) throw playerError;
  const { error: reportError } = await db.from("match_reports").insert({
    draft_id: draft.id,
    match_id: matchId,
    status: report.status,
    facts: report.facts as Json,
    facts_version: report.facts ? 1 : null,
    game_mode: 22, // Ranked All Pick, so the game counts in the player's records.
  });
  if (reportError) throw reportError;
  return draft.id;
}

/**
 * Stands in for the browser's share prompt: a canvas showing a hero select screenshot (both teams and
 * nine bans) plays the Dota window for Watch Dota.
 */
export async function fakeDotaWindow(page: Page) {
  const screenshot = readFileSync(join(__dirname, "fixtures", "draft-nine-picked.png")).toString("base64");
  await page.addInitScript((base64) => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d")!;
      setInterval(() => ctx.drawImage(image, 0, 0), 100);
      return canvas.captureStream(5);
    };
  }, screenshot);
}
