import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";
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

/** A made-up SteamID64 no other test uses, since profiles.steam_id is unique and tests run in parallel. */
function uniqueSteamId() {
  return `7656119${String(randomInt(1e10)).padStart(10, "0")}`;
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
  const steamId = uniqueSteamId();
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

/**
 * Links a made-up Steam account to the user and saves game feedback for them, as the
 * refresh-trends job would: one strength and one problem over 6 games.
 */
export async function seedFeedback(email: string) {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  if (!id) throw new Error(`No user ${email}`);
  const steamId = uniqueSteamId();
  const { error: steamError } = await db.from("profiles").update({ steam_id: steamId }).eq("id", id);
  if (steamError) throw steamError;
  const day = 24 * 60 * 60 * 1000;
  const { error: saveError } = await db.from("player_feedback").insert({
    user_id: id,
    version: 1,
    games: 6,
    parsed_games: 5,
    first_game_at: new Date(Date.now() - 9 * day).toISOString(),
    last_game_at: new Date(Date.now() - day).toISOString(),
    improved: [{ kind: "laning", headline: "You fall behind in lane" }],
    findings: [
      {
        kind: "farm",
        tone: "strength",
        score: 1.4,
        headline: "Strong farm",
        happened: ["Monkey King: 84th percentile for farm (GPM and last hits)"],
        pattern: "Across 5 games on Monkey King, you had higher farm (GPM and last hits) than 81% of games on these heroes on OpenDota (all ranks).",
        cost: null,
        change: null,
        matchIds: [1, 2, 3, 4, 5],
      },
      {
        kind: "early_deaths",
        tone: "problem",
        score: 1.2,
        headline: "Early deaths are costing your lanes",
        happened: ["Monkey King: died at 6:20 to Ember Spirit (210 gold lost, 18s dead)"],
        pattern: "You died 6 times before 10 minutes in 4 of your last 5 games.",
        cost: "1260 gold lost and 108 seconds dead before 10 minutes.",
        change:
          "Most early deaths came from Ember Spirit. Before minute 10, keep a Town Portal Scroll, stand behind your creep wave and step back when the enemy mid goes missing after a rune.",
        matchIds: [1, 2, 3, 4],
      },
    ],
  });
  if (saveError) throw saveError;
  const finding = (tone: string, headline: string, change: string | null) => ({
    kind: tone === "strength" ? "farm" : "early_deaths",
    tone,
    score: 1,
    headline,
    happened: [tone === "strength" ? "84th percentile for farm" : "Died at 6:20 to Ember Spirit (210 gold lost, 18s dead)"],
    pattern: null,
    cost: null,
    change,
    matchIds: [],
  });
  const game = (matchId: number, daysAgo: number, isWin: boolean, findings: ReturnType<typeof finding>[]) => ({
    user_id: id,
    match_id: matchId,
    hero_id: 114,
    position: 1,
    is_win: isWin,
    started_at: new Date(Date.now() - daysAgo * day).toISOString(),
    duration_s: 2045,
    status: "parsed",
    summary: {
      card: { kills: 9, deaths: 2, assists: 7, goldPerMin: 712, xpPerMin: 640, lastHits: 310, denies: 12 },
      lastHitsAt10: 52,
      deniesAt10: 6,
      laneNetWorthDiffAt10: -640,
      deaths: [
        { time: 380, goldLost: 210, timeDead: 18, killerHeroId: 106, isKillerFromMid: true, buildingsLost: [] },
        { time: 545, goldLost: 260, timeDead: 21, killerHeroId: 106, isKillerFromMid: true, buildingsLost: [] },
      ],
    },
    summary_version: 1,
    findings,
  });
  const { error: gamesError } = await db
    .from("player_game_facts")
    .insert([
      game(8100000001 + Math.floor(Math.random() * 1e6), 1, true, [finding("strength", "Strong farm", null)]),
      game(8200000001 + Math.floor(Math.random() * 1e6), 2, false, [
        finding("problem", "2 deaths before 10 minutes", "Keep a Town Portal Scroll and step back when Ember Spirit goes missing."),
      ]),
    ]);
  if (gamesError) throw gamesError;
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

/** Seeds the player's own feedback row for the reported game, linked to its party draft like the backend does. */
export async function seedReportFeedback(email: string, draftId: string) {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  if (!id) throw new Error(`No user ${email}`);
  const { error: factError } = await db.from("player_game_facts").insert({
    user_id: id,
    match_id: 9072422905, // The match seedReport plays.
    draft_id: draftId,
    hero_id: 145,
    position: 1,
    is_win: true,
    started_at: new Date().toISOString(),
    duration_s: 2066,
    status: "waiting_parse",
  });
  if (factError) throw factError;
}

/**
 * Stands in for the browser's share prompt: a canvas showing a hero select screenshot plays the Dota
 * window for Watch Dota. The default shows nine picks and the bans; "draft-strategy-ten-picked.png" is
 * strategy time, the first moment the enemy's last pick shows.
 */
export async function fakeDotaWindow(page: Page, fixture = "draft-nine-picked.png") {
  const screenshot = readFileSync(join(__dirname, "fixtures", fixture)).toString("base64");
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

/**
 * A Stack owned by a signed-up user, with players who never open the site: each gets an account
 * with the given name, joins as a member and, if given, a favorite position. Returns the Stack id.
 */
export async function seedStack(ownerEmail: string, name: string, players: { name: string; position?: number; role?: "player" | "co_captain" }[]) {
  const db = admin();
  const { data: owner, error } = await db.rpc("user_id_by_email", { address: ownerEmail });
  if (error) throw error;
  if (!owner) throw new Error(`No user ${ownerEmail}`);
  const { data: team, error: teamError } = await db.from("teams").insert({ owner_id: owner, name }).select("id").single();
  if (teamError) throw teamError;
  for (const p of players) {
    const { data: created, error: userError } = await db.auth.admin.createUser({
      email: uniqueEmail("stack-mate"),
      password: PASSWORD,
      email_confirm: true,
    });
    if (userError) throw userError;
    const id = created.user.id;
    const steps = [
      db.from("profiles").update({ display_name: p.name }).eq("id", id),
      db.from("team_members").insert({ team_id: team.id, user_id: id, role: p.role ?? "player" }),
      ...(p.position ? [db.from("favorite_positions").insert({ user_id: id, position: p.position })] : []),
    ];
    for (const step of steps) {
      const { error: stepError } = await step;
      if (stepError) throw stepError;
    }
  }
  return team.id;
}

/** Moves the user's started games back in time, as if Start Game was pressed `minutes` ago. */
export async function backdateGameStart(email: string, minutes: number) {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  if (!id) throw new Error(`No user ${email}`);
  const { error: updateError } = await db
    .from("game_check_ins")
    .update({ started_at: new Date(Date.now() - minutes * 60_000).toISOString() })
    .eq("user_id", id)
    .not("started_at", "is", null);
  if (updateError) throw updateError;
}

/** The user's saved games with their check-in answers. */
export async function savedCheckIns(email: string) {
  const db = admin();
  const { data: id, error } = await db.rpc("user_id_by_email", { address: email });
  if (error) throw error;
  const { data, error: readError } = await db
    .from("game_check_ins")
    .select("played, player_won, picks_feel, tags, note, answered_at, skipped_at")
    .eq("user_id", id!);
  if (readError) throw readError;
  return data;
}
