import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHeroes } from "@/lib/heroes";
import { createClient } from "@/lib/supabase/server";
import { canCaptain, getUserType } from "@/lib/user-type";
import { loadInvites, loadMembers } from "@/lib/stacks";
import { CaptainBoard } from "./captain-board";
import type { TeamRef } from "./team-picker";

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

  const [initialMembers, invites, { data: lineup }, heroes] = await Promise.all([
    loadMembers(supabase, team.id),
    loadInvites(supabase, team.id),
    supabase.from("team_lineups").select("slots, rank_bracket").eq("team_id", team.id).maybeSingle(),
    // Hero icons are decoration: if OpenDota is down the member list falls back to hero names.
    getHeroes().catch(() => []),
  ]);
  const icons = Object.fromEntries(heroes.map((h) => [h.id, h.icon]));
  const portraits = Object.fromEntries(heroes.map((h) => [h.id, h.image]));

  return (
    <CaptainBoard
      key={team.id}
      team={team}
      teams={teams}
      userId={user.id}
      canCreateTeams={isCaptain}
      initialMembers={initialMembers}
      initialInvites={invites.emails}
      initialSlots={lineup?.slots ?? [null, null, null, null, null]}
      initialRank={lineup?.rank_bracket ?? null}
      icons={icons}
      portraits={portraits}
    />
  );
}
