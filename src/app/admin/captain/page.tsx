import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { CaptainBoard, type Friend } from "./captain-board";

export const metadata: Metadata = { title: "Captain mode · Dota 2 Team Picker" };

export default async function CaptainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) notFound();

  const [{ data: friends }, { data: favorites }, { data: lineup }] = await Promise.all([
    supabase.from("friends").select("id, name, usual_position").order("created_at"),
    supabase.from("friend_favorite_heroes").select("friend_id, hero_id").order("created_at"),
    supabase.from("captain_lineups").select("slots, rank_bracket").eq("owner_id", user.id).maybeSingle(),
  ]);

  const initialFriends: Friend[] = (friends ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    usualPosition: f.usual_position,
    favorites: (favorites ?? []).filter((x) => x.friend_id === f.id).map((x) => x.hero_id),
  }));

  return (
    <CaptainBoard
      userId={user.id}
      initialFriends={initialFriends}
      initialSlots={lineup?.slots ?? [null, null, null, null, null]}
      initialRank={lineup?.rank_bracket ?? null}
    />
  );
}
