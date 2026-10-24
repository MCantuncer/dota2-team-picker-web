import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { canCaptain, getUserType } from "@/lib/user-type";
import { CaptainBoard, type Invite, type Member } from "./captain-board";
import type { TeamRef } from "./team-picker";

/** Only Steam avatars are shown; anything else in avatar_url is ignored. */
const STEAM_AVATAR = "https://avatars.steamstatic.com/";

export const metadata: Metadata = { title: "Captain mode · Dota 2 Team Picker" };

export default async function CaptainPage({ searchParams }: PageProps<"/admin/captain">) {
  const { team: wanted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const isCaptain = canCaptain(await getUserType(user.id));

  // A captain can have several teams (friend groups), and anyone can be a co-captain of someone
  // else's team. A captain's first visit creates their first team.
  const [{ data: owned }, { data: coRows }] = await Promise.all([
    isCaptain
      ? supabase.from("teams").select("id, name").eq("owner_id", user.id).order("created_at")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("team_members").select("teams(id, name)").eq("user_id", user.id).eq("role", "co_captain"),
  ]);
  const coTeams: TeamRef[] = (coRows ?? []).flatMap((r) => {
    const t = r.teams as unknown as { id: string; name: string } | null;
    return t ? [{ id: t.id, name: t.name, owned: false }] : [];
  });
  let teams: TeamRef[] = [...(owned ?? []).map((t) => ({ ...t, owned: true })), ...coTeams];
  if (!teams.length) {
    if (!isCaptain) notFound();
    const created = await supabase.from("teams").insert({ owner_id: user.id, name: "My team" }).select("id, name").single();
    if (created.error) throw created.error;
    teams = [{ ...created.data, owned: true }];
  }
  const team = teams.find((t) => t.id === wanted) ?? teams[0]!;

  const [{ data: members }, { data: invites }, { data: lineup }, heroes] = await Promise.all([
    supabase.from("team_members").select("user_id, role, profiles(display_name, steam_id, steam_name, avatar_url, rank_tier, hero_stats)").eq("team_id", team.id).order("joined_at"),
    supabase.from("team_invites").select("id, email, created_at").eq("team_id", team.id).is("accepted_at", null).order("created_at"),
    supabase.from("team_lineups").select("slots, rank_bracket").eq("team_id", team.id).maybeSingle(),
    // Hero icons are decoration: if OpenDota is down the member list falls back to hero names.
    getHeroes().catch(() => []),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const [{ data: positions }, { data: favorites }] = await Promise.all([
    supabase.from("favorite_positions").select("user_id, position").in("user_id", ids),
    supabase.from("favorite_heroes").select("user_id, position, hero_id").in("user_id", ids).order("created_at"),
  ]);

  const initialMembers: Member[] = (members ?? []).map((m) => {
    const heroes: Record<number, number[]> = {};
    for (const f of favorites ?? []) if (f.user_id === m.user_id) (heroes[f.position] ??= []).push(f.hero_id);
    const profile = m.profiles as unknown as {
      display_name: string | null;
      steam_id: string | null;
      steam_name: string | null;
      avatar_url: string | null;
      rank_tier: number | null;
      hero_stats: Member["personal"] | null;
    } | null;
    return {
      id: m.user_id,
      role: m.role === "co_captain" ? "co_captain" : "player",
      name: profile?.display_name ?? "Unnamed",
      positions: (positions ?? []).filter((p) => p.user_id === m.user_id).map((p) => p.position).sort(),
      heroes,
      // rank_tier is medal and star (e.g. 54 = Legend 4); the engine uses the medal.
      rank: profile?.rank_tier ? (Math.floor(profile.rank_tier / 10) as Member["rank"]) : null,
      rankTier: profile?.rank_tier ?? null,
      steamName: profile?.steam_id ? (profile.steam_name ?? "Steam linked") : null,
      avatarUrl: profile?.avatar_url?.startsWith(STEAM_AVATAR) ? profile.avatar_url : null,
      personal: profile?.hero_stats ?? {},
    };
  });
  const icons = Object.fromEntries(heroes.map((h) => [h.id, h.icon]));
  const initialInvites: Invite[] = (invites ?? []).map((i) => ({ id: i.id, email: i.email }));

  return (
    <CaptainBoard
      key={team.id}
      team={team}
      teams={teams}
      userId={user.id}
      canCreateTeams={isCaptain}
      initialMembers={initialMembers}
      initialInvites={initialInvites}
      initialSlots={lineup?.slots ?? [null, null, null, null, null]}
      initialRank={lineup?.rank_bracket ?? null}
      icons={icons}
    />
  );
}
