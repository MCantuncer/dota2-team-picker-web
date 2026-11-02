import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { bestPair, getRecords, recordText } from "./records";

type Result = { data: unknown; error: unknown };

/** A Supabase client whose two record calls answer with the given results. */
function fakeClient(suggestions: Result, pairs: Result) {
  const answers: Record<string, Result> = { my_suggestion_record: suggestions, my_pair_records: pairs };
  return { rpc: async (name: string) => answers[name] } as unknown as SupabaseClient<Database>;
}

const SUGGESTIONS = [
  { bucket: "top3", games: 12, wins: 7 },
  { bucket: "in8", games: 3, wins: 1 },
  { bucket: "not_shown", games: 0, wins: 0 },
  { bucket: "no_list", games: 2, wins: 2 },
];
const PAIRS = [
  { teammate_id: "a", teammate_name: "Ana", my_position: null, their_position: null, games: 4, wins: 3 },
  { teammate_id: "a", teammate_name: "Ana", my_position: 1, their_position: 5, games: 3, wins: 2 },
  { teammate_id: "b", teammate_name: null, my_position: null, their_position: null, games: 20, wins: 11 },
  { teammate_id: "b", teammate_name: null, my_position: 2, their_position: 4, games: 12, wins: 9 },
  { teammate_id: "b", teammate_name: null, my_position: 2, their_position: 3, games: 10, wins: 5 },
];

describe("getRecords", () => {
  it("returns the pick buckets and teammates, most games first", async () => {
    const records = await getRecords(fakeClient({ data: SUGGESTIONS, error: null }, { data: PAIRS, error: null }));
    expect(records.suggestions.map((s) => s.bucket)).toEqual(["top3", "in8", "not_shown", "no_list"]);
    expect(records.teammates.map((t) => [t.name, t.games, t.wins, t.byPosition.length])).toEqual([
      ["Unnamed", 20, 11, 2],
      ["Ana", 4, 3, 1],
    ]);
  });

  it("drops a bucket it doesn't know", async () => {
    const records = await getRecords(fakeClient({ data: [{ bucket: "top1", games: 1, wins: 1 }], error: null }, { data: [], error: null }));
    expect(records.suggestions).toEqual([]);
  });

  it("throws when either call fails", async () => {
    const ok = { data: [], error: null };
    const failed = { data: null, error: new Error("denied") };
    await expect(getRecords(fakeClient(failed, ok))).rejects.toThrow("denied");
    await expect(getRecords(fakeClient(ok, failed))).rejects.toThrow("denied");
  });
});

describe("record text", () => {
  it("shows a rate only from 10 games", () => {
    expect(recordText({ games: 1, wins: 1 })).toBe("1 game, too few for a win rate");
    expect(recordText({ games: 9, wins: 9 })).toBe("9 games, too few for a win rate");
    expect(recordText({ games: 24, wins: 14 })).toBe("58% won in 24 games");
  });

  it("picks the best position pair with enough games", async () => {
    const { teammates } = await getRecords(fakeClient({ data: [], error: null }, { data: PAIRS, error: null }));
    expect(bestPair(teammates[0])).toMatchObject({ mine: 2, theirs: 4 });
    expect(bestPair(teammates[1])).toBeNull();
  });
});
