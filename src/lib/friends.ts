import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamesWins } from "@/lib/engine/types";
import { steamAvatarOnly } from "@/lib/stacks";
import type { Database } from "@/lib/supabase/database.types";

/** An accepted friend with what they share and how the two of you do together (last 60 days). */
export interface Friend {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Null when they don't share with friends, or have no rank. */
  rankTier: number | null;
  positions: number[];
  /** Their games and wins per hero (six months); empty when they don't share. */
  heroStats: Record<number, GamesWins>;
  shared: boolean;
  party: "yours" | "other" | null;
  partySize: number | null;
  together: GamesWins;
  /** Your other games in the window, for "52% without". */
  without: GamesWins;
  lastTogether: string | null;
  /** Their latest game; null unless they share. */
  lastGame: string | null;
}

/** Someone who asked you, or whom you asked, and hasn't answered. */
export interface FriendRequest {
  id: string;
  name: string;
  avatarUrl: string | null;
  incoming: boolean;
}

/** A game the two of you played on the same team. */
export interface SharedGame {
  matchId: number;
  startedAt: string;
  gameMode: number;
  lobbyType: number;
  won: boolean;
  myHeroId: number;
  friendHeroId: number;
}

/** A hero with a record, for the friend's hero strip. */
export interface HeroRecord {
  heroId: number;
  games: number;
  wins: number;
}

const isGamesWins = (v: unknown): v is GamesWins =>
  typeof v === "object" && v !== null && typeof (v as GamesWins).games === "number" && typeof (v as GamesWins).wins === "number";

function toHeroStats(raw: unknown): Record<number, GamesWins> {
  if (typeof raw !== "object" || raw === null) return {};
  return Object.fromEntries(Object.entries(raw).filter(([id, v]) => Number(id) > 0 && isGamesWins(v))) as Record<number, GamesWins>;
}

/**
 * Your friends with their shared heroes, party status and record together, plus open requests both ways.
 * Throws when a query fails.
 */
export async function loadFriends(supabase: SupabaseClient<Database>): Promise<{ friends: Friend[]; requests: FriendRequest[] }> {
  const [list, lineup, overview] = await Promise.all([
    supabase.rpc("my_friends"),
    supabase.rpc("lineup_players"),
    supabase.rpc("friend_overview"),
  ]);
  const failed = list.error ?? lineup.error ?? overview.error;
  if (failed) throw new Error(`Could not load your friends: ${failed.message}`);

  const shared = new Map((lineup.data ?? []).filter((p) => p.is_friend).map((p) => [p.user_id, p]));
  const stats = new Map((overview.data ?? []).map((o) => [o.user_id, o]));
  const friends: Friend[] = [];
  const requests: FriendRequest[] = [];
  for (const f of list.data ?? []) {
    const name = f.display_name ?? "Unnamed";
    const avatarUrl = steamAvatarOnly(f.avatar_url);
    if (f.status !== "accepted") {
      requests.push({ id: f.user_id, name, avatarUrl, incoming: f.incoming });
      continue;
    }
    const p = shared.get(f.user_id);
    const o = stats.get(f.user_id);
    friends.push({
      id: f.user_id,
      name,
      avatarUrl,
      rankTier: p?.shared ? p.rank_tier : null,
      positions: p?.shared ? (p.positions ?? []) : [],
      heroStats: p?.shared ? toHeroStats(p.hero_stats) : {},
      shared: Boolean(p?.shared),
      party: o?.party_state === "yours" || o?.party_state === "other" ? o.party_state : null,
      partySize: o?.party_size ?? null,
      together: { games: o?.games_together ?? 0, wins: o?.wins_together ?? 0 },
      without: { games: o?.games_without ?? 0, wins: o?.wins_without ?? 0 },
      lastTogether: o?.last_together ?? null,
      lastGame: o?.last_game_at ?? null,
    });
  }
  return { friends: sortFriends(friends), requests };
}

/** The games you played with one friend in the last 60 days, newest first. Throws when the query fails. */
export async function loadGamesWith(supabase: SupabaseClient<Database>, friendId: string): Promise<SharedGame[]> {
  const { data, error } = await supabase.rpc("games_with_friend", { friend: friendId });
  if (error) throw new Error(`Could not load your games together: ${error.message}`);
  return (data ?? []).map((g) => ({
    matchId: g.match_id,
    startedAt: g.started_at,
    gameMode: g.game_mode,
    lobbyType: g.lobby_type,
    won: g.is_win,
    myHeroId: g.my_hero_id,
    friendHeroId: g.friend_hero_id,
  }));
}

/** Friends you played with most recently first, then the rest by name. */
export function sortFriends(friends: Friend[]): Friend[] {
  return [...friends].sort(
    (a, b) => (b.lastTogether ?? "").localeCompare(a.lastTogether ?? "") || a.name.localeCompare(b.name),
  );
}

/** Whole-number win percent, or null with no games. */
export function winPercent({ games, wins }: GamesWins): number | null {
  return games > 0 ? Math.round((wins / games) * 100) : null;
}

/**
 * The heroes to show for a friend, most played first: their own records when they share, otherwise the
 * heroes they played in games with you (you were in those games).
 */
export function signatureHeroes(friend: Friend, games: SharedGame[], count = 3): HeroRecord[] {
  const records = friend.shared
    ? Object.entries(friend.heroStats).map(([id, r]) => ({ heroId: Number(id), ...r }))
    : [...tally(games, (g) => g.friendHeroId).values()];
  return records.sort((a, b) => b.games - a.games || b.wins - a.wins || a.heroId - b.heroId).slice(0, count);
}

/** Your hero and theirs that won the most often together, from at least `minGames` games. */
export function bestPair(games: SharedGame[], minGames = 3): { myHeroId: number; friendHeroId: number; games: number; wins: number } | null {
  const pairs = [...tally(games, (g) => `${g.myHeroId}:${g.friendHeroId}`)]
    .filter(([, r]) => r.games >= minGames)
    .sort(([, a], [, b]) => b.wins / b.games - a.wins / a.games || b.games - a.games);
  const top = pairs[0];
  if (!top) return null;
  const [myHeroId = 0, friendHeroId = 0] = top[0].split(":").map(Number);
  return { myHeroId, friendHeroId, games: top[1].games, wins: top[1].wins };
}

function tally<K>(games: SharedGame[], key: (g: SharedGame) => K): Map<K, HeroRecord> {
  const out = new Map<K, HeroRecord>();
  for (const g of games) {
    const k = key(g);
    const r = out.get(k) ?? { heroId: g.friendHeroId, games: 0, wins: 0 };
    r.games += 1;
    if (g.won) r.wins += 1;
    out.set(k, r);
  }
  return out;
}

const GAME_MODES: Record<number, string> = {
  1: "All Pick",
  2: "Captains Mode",
  3: "Random Draft",
  4: "Single Draft",
  5: "All Random",
  16: "Captains Draft",
  18: "Ability Draft",
  22: "All Pick",
  23: "Turbo",
};
const RANKED_LOBBY = 7;

/** "Ranked All Pick", "Turbo" and so on, the way the client names them. */
export function gameModeName(gameMode: number, lobbyType: number): string {
  const mode = GAME_MODES[gameMode] ?? "Custom Game";
  return lobbyType === RANKED_LOBBY ? `Ranked ${mode}` : mode;
}
