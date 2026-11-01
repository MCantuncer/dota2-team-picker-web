import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { latestSentPlan } from "./team-game-plan";

/** A Supabase client whose team_game_plans query answers with `result`, recording the cutoff time. */
function fakeClient(result: { data: unknown; error: unknown }) {
  const gt = vi.fn();
  const query = { select: () => query, gt: (...args: unknown[]) => (gt(...args), query), order: () => query, limit: () => query, maybeSingle: async () => result };
  return { client: { from: () => query } as unknown as SupabaseClient<Database>, gt };
}

describe("latestSentPlan", () => {
  it("returns the newest plan from the last two hours with its team name", async () => {
    const row = { picks: [1, 2, 3, 4, 5], enemies: [6, 7, 8, 9, 10], rank_bracket: 5, players: ["a", null, null, null, null], created_at: "2026-11-01T18:00:00Z", teams: { name: "Radiant" } };
    const { client, gt } = fakeClient({ data: row, error: null });
    const now = Date.parse("2026-11-01T18:30:00Z");
    expect(await latestSentPlan(client, now)).toEqual({
      picks: [1, 2, 3, 4, 5],
      enemies: [6, 7, 8, 9, 10],
      rankBracket: 5,
      players: ["a", null, null, null, null],
      teamName: "Radiant",
      createdAt: "2026-11-01T18:00:00Z",
    });
    expect(gt).toHaveBeenCalledWith("created_at", "2026-11-01T16:30:00.000Z");
  });

  it("returns null when no plan was sent", async () => {
    expect(await latestSentPlan(fakeClient({ data: null, error: null }).client)).toBeNull();
  });

  it("throws when the query fails", async () => {
    await expect(latestSentPlan(fakeClient({ data: null, error: new Error("denied") }).client)).rejects.toThrow("denied");
  });
});
