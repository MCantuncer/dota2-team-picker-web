import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { CaptainBoard, type Invite, type Member } from "./captain-board";

export const metadata: Metadata = { title: "Captain mode · Dota 2 Team Picker" };

export default async function CaptainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) notFound();

  // One team per captain for now; the first visit creates it.
  let { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!team) {
    const created = await supabase.from("teams").insert({ owner_id: user.id, name: "My team" }).select("id, name").single();
    if (created.error) throw created.error;
    team = created.data;
  }

  const [{ data: members }, { data: invites }, { data: lineup }] = await Promise.all([
    supabase.from("team_members").select("user_id, profiles(display_name)").eq("team_id", team.id).order("joined_at"),
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
    const profile = m.profiles as unknown as { display_name: string | null } | null;
    return {
      id: m.user_id,
      name: profile?.display_name ?? "Unnamed",
      positions: (positions ?? []).filter((p) => p.user_id === m.user_id).map((p) => p.position).sort(),
      heroes,
    };
  });
  const initialInvites: Invite[] = (invites ?? []).map((i) => ({ id: i.id, email: i.email }));

  return (
    <CaptainBoard
      team={team}
      initialMembers={initialMembers}
      initialInvites={initialInvites}
      initialSlots={lineup?.slots ?? [null, null, null, null, null]}
      initialRank={lineup?.rank_bracket ?? null}
    />
  );
}
