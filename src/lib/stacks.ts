import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamesWins, RankBracket } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

/** Only Steam avatars are shown; anything else in avatar_url is ignored. */
const STEAM_AVATAR = "https://avatars.steamstatic.com/";

/** A Stack (a row in teams) you own or help run. */
export interface StackRef {
  id: string;
  name: string;
  /** False for a Stack where you are a Manager (co_captain in the database). */
  owned: boolean;
}

/**
 * A Stack member as the owner and Managers see them: favorite positions, heroes per position (0 = any),
 * and their rank and record per hero when their Steam account is linked.
 */
export interface Member {
  id: string;
  /** Managers (co_captain) can invite and remove players; only the owner sets this. */
  role: "player" | "co_captain";
  name: string;
  positions: number[];
  heroes: Record<number, number[]>;
  rank: RankBracket | null;
  /** OpenDota rank tier with stars (54 = Legend 4), for display. */
  rankTier: number | null;
  avatarUrl: string | null;
  /** Steam nickname when their Steam account is linked. */
  steamName: string | null;
  personal: Record<number, GamesWins>;
}

/** A friend invited on the site who has not answered yet. */
export interface FriendInvite {
  id: string;
  userId: string;
}

export function steamAvatarOnly(url: string | null | undefined): string | null {
  return url?.startsWith(STEAM_AVATAR) ? url : null;
}

interface MemberProfile {
  display_name: string | null;
  steam_id: string | null;
  steam_name: string | null;
  avatar_url: string | null;
  rank_tier: number | null;
  hero_stats: Member["personal"] | null;
}

/**
 * The members of a Stack with their positions and heroes. Only its owner and Managers can read them
 * (row level security); anyone else gets an empty list. Throws when a query fails.
 */
export async function loadMembers(supabase: SupabaseClient<Database>, teamId: string): Promise<Member[]> {
  const { data: members, error } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(display_name, steam_id, steam_name, avatar_url, rank_tier, hero_stats)")
    .eq("team_id", teamId)
    .order("joined_at");
  if (error) throw new Error(`Could not load the members: ${error.message}`);
  const ids = (members ?? []).map((m) => m.user_id);
  const [positions, favorites] = await Promise.all([
    supabase.from("favorite_positions").select("user_id, position").in("user_id", ids),
    supabase.from("favorite_heroes").select("user_id, position, hero_id").in("user_id", ids).order("created_at"),
  ]);
  const failed = positions.error ?? favorites.error;
  if (failed) throw new Error(`Could not load the members' heroes: ${failed.message}`);

  return (members ?? []).map((m) => {
    const heroes: Record<number, number[]> = {};
    for (const f of favorites.data ?? []) if (f.user_id === m.user_id) (heroes[f.position] ??= []).push(f.hero_id);
    // The embedded profile is one row per member (profiles.id is the key), typed loosely by the client.
    const profile = m.profiles as unknown as MemberProfile | null;
    return {
      id: m.user_id,
      role: m.role === "co_captain" ? "co_captain" : "player",
      name: profile?.display_name ?? "Unnamed",
      positions: (positions.data ?? []).filter((p) => p.user_id === m.user_id).map((p) => p.position).sort(),
      heroes,
      // rank_tier is medal and star (e.g. 54 = Legend 4); the engine uses the medal.
      rank: profile?.rank_tier ? (Math.floor(profile.rank_tier / 10) as RankBracket) : null,
      rankTier: profile?.rank_tier ?? null,
      steamName: profile?.steam_id ? (profile.steam_name ?? "Steam linked") : null,
      avatarUrl: steamAvatarOnly(profile?.avatar_url),
      personal: profile?.hero_stats ?? {},
    };
  });
}

/** Open invites of a Stack to friends on the site. Throws when the query fails. */
export async function loadInvites(supabase: SupabaseClient<Database>, teamId: string): Promise<FriendInvite[]> {
  const { data, error } = await supabase
    .from("team_invites")
    .select("id, user_id")
    .eq("team_id", teamId)
    .is("accepted_at", null)
    .is("declined_at", null)
    .order("created_at");
  if (error) throw new Error(`Could not load the invites: ${error.message}`);
  return (data ?? []).flatMap((i) => (i.user_id ? [{ id: i.id, userId: i.user_id }] : []));
}

/** An open Stack as anyone sees it: no member names, heroes or positions. */
export interface StackCard {
  id: string;
  name: string;
  ownerName: string;
  members: number;
  /** Games its players played together in the last 14 days. */
  games: number;
}

/** A browse_stacks or hot_stacks row as a StackCard. */
export function toStackCard(s: { id: string; name: string; owner_name: string | null; members: number; games: number }): StackCard {
  return { id: s.id, name: s.name, ownerName: s.owner_name ?? "Unnamed", members: s.members, games: s.games };
}

/** How many players are waiting to join a Stack you run. Throws when the query fails. */
export async function countJoinRequests(supabase: SupabaseClient<Database>, teamId: string): Promise<number> {
  const { count, error } = await supabase
    .from("team_join_requests")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "pending");
  if (error) throw new Error(`Could not load the join requests: ${error.message}`);
  return count ?? 0;
}
