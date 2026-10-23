import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canCaptain, getUserType } from "@/lib/user-type";
import { CaptainBoard, type Invite, type Member } from "./captain-board";

export const metadata: Metadata = { title: "Captain mode · Dota 2 Team Picker" };

export default async function CaptainPage({ searchParams }: PageProps<"/admin/captain">) {
  const { team: wanted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !canCaptain(await getUserType(user.id))) notFound();

  // A captain can have several teams (friend groups); the first visit creates one.
  let { data: teams } = await supabase.from("teams").select("id, name").eq("owner_id", user.id).order("created_at");
  if (!teams?.length) {
    const created = await supabase.from("teams").insert({ owner_id: user.id, name: "My team" }).select("id, name").single();
    if (created.error) throw created.error;
    teams = [created.data];
  }
  const team = teams.find((t) => t.id === wanted) ?? teams[0]!;

  const [{ data: members }, { data: invites }, { data: lineup }] = await Promise.all([
    supabase.from("team_members").select("user_id, profiles(display_name, rank_tier, hero_stats)").eq("team_id", team.id).order("joined_at"),
    supabase.from("team_invites").select("id, email, created_at").eq("team_id", team.id).is("accepted_at", null).order("created_at"),
    supabase.from("team_lineups").select("slots, rank_bracket").eq("team_id", team.id).maybeSingle(),
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
      rank_tier: number | null;
      hero_stats: Member["personal"] | null;
    } | null;
    return {
      id: m.user_id,
      name: profile?.display_name ?? "Unnamed",
      positions: (positions ?? []).filter((p) => p.user_id === m.user_id).map((p) => p.position).sort(),
      heroes,
      // rank_tier is medal and star (e.g. 54 = Legend 4); the engine uses the medal.
      rank: profile?.rank_tier ? (Math.floor(profile.rank_tier / 10) as Member["rank"]) : null,
      personal: profile?.hero_stats ?? {},
    };
  });
  const initialInvites: Invite[] = (invites ?? []).map((i) => ({ id: i.id, email: i.email }));

  return (
    <CaptainBoard
      key={team.id}
      team={team}
      teams={teams}
      ownerId={user.id}
      initialMembers={initialMembers}
      initialInvites={initialInvites}
      initialSlots={lineup?.slots ?? [null, null, null, null, null]}
      initialRank={lineup?.rank_bracket ?? null}
    />
  );
}
