import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Under this many games a win rate says more about luck than about the picks. */
export const MIN_GAMES_FOR_RATE = 10;

export type SuggestionBucket = "top3" | "in8" | "not_shown" | "no_list";

export interface GamesWins {
  games: number;
  wins: number;
}

export interface TeammateRecord extends GamesWins {
  id: string;
  name: string;
  /** Games by our two positions, when both were known. */
  byPosition: (GamesWins & { mine: number; theirs: number })[];
}

export interface Records {
  suggestions: (GamesWins & { bucket: SuggestionBucket })[];
  /** Most games together first. */
  teammates: TeammateRecord[];
}

const BUCKETS: SuggestionBucket[] = ["top3", "in8", "not_shown", "no_list"];

/**
 * The signed-in player's records from their reported games: how their picks did by where the hero
 * was in their suggestion list, and how they do with each teammate. Throws on a database error.
 */
export async function getRecords(supabase: SupabaseClient<Database>): Promise<Records> {
  const [suggestions, pairs] = await Promise.all([supabase.rpc("my_suggestion_record"), supabase.rpc("my_pair_records")]);
  if (suggestions.error) throw new Error(`Could not load your records: ${suggestions.error.message}`);
  if (pairs.error) throw new Error(`Could not load your records: ${pairs.error.message}`);

  const teammates = new Map<string, TeammateRecord>();
  for (const row of pairs.data ?? []) {
    const mate = teammates.get(row.teammate_id) ?? {
      id: row.teammate_id,
      name: row.teammate_name ?? "Unnamed",
      games: 0,
      wins: 0,
      byPosition: [],
    };
    teammates.set(row.teammate_id, mate);
    // The total row has no positions (the generated type misses that they can be null).
    const mine = row.my_position as number | null;
    const theirs = row.their_position as number | null;
    if (mine === null || theirs === null) Object.assign(mate, { games: row.games, wins: row.wins });
    else mate.byPosition.push({ mine, theirs, games: row.games, wins: row.wins });
  }

  return {
    suggestions: (suggestions.data ?? []).flatMap((r) =>
      BUCKETS.includes(r.bucket as SuggestionBucket) ? [{ bucket: r.bucket as SuggestionBucket, games: r.games, wins: r.wins }] : []),
    teammates: [...teammates.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
  };
}

/** "58% won in 24 games", or just the count while it is too small for a rate. */
export function recordText({ games, wins }: GamesWins): string {
  const count = `${games} ${games === 1 ? "game" : "games"}`;
  if (games < MIN_GAMES_FOR_RATE) return `${count}, too few for a win rate`;
  return `${Math.round((wins / games) * 100)}% won in ${count}`;
}

/** The position pair with the best win rate among those with enough games, if any. */
export function bestPair(mate: TeammateRecord): TeammateRecord["byPosition"][number] | null {
  const enough = mate.byPosition.filter((p) => p.games >= MIN_GAMES_FOR_RATE);
  return enough.reduce<TeammateRecord["byPosition"][number] | null>(
    (best, p) => (!best || p.wins / p.games > best.wins / best.games ? p : best),
    null,
  );
}
