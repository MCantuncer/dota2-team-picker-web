import type { Metadata } from "next";
import { getHeroes } from "@/lib/heroes";
import { loadFriends, loadGamesWith, type SharedGame } from "@/lib/friends";
import { steamAvatarOnly } from "@/lib/stacks";
import { createClient } from "@/lib/supabase/server";
import { FriendsBoard, type PartyRole, type Suggestion } from "./friends-board";

export const metadata: Metadata = { title: "Friends · Dota 2 Team Picker" };

/**
 * Your friends as a list, and the one you pick (?friend=<id>, or the one you played with last) opened
 * beside it with their heroes and your games together.
 */
export default async function FriendsPage({ searchParams }: PageProps<"/friends">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const wanted = (await searchParams).friend;
  const [{ friends, requests }, suggestions, profile, party, heroes] = await Promise.all([
    loadFriends(supabase),
    supabase.rpc("friend_suggestions"),
    supabase.from("profiles").select("friend_code").eq("id", user.id).single(),
    supabase.rpc("my_party"),
    // Hero art is decoration: without OpenDota the page shows names only.
    getHeroes().catch(() => []),
  ]);
  if (suggestions.error) throw new Error(`Could not load players from your Stacks: ${suggestions.error.message}`);
  if (profile.error) throw new Error(`Could not load your friend link: ${profile.error.message}`);
  if (party.error) throw new Error(`Could not load your party: ${party.error.message}`);

  let partyRole: PartyRole = null;
  if (party.data) {
    const { data, error } = await supabase.from("parties").select("leader_id").eq("id", party.data).single();
    if (error) throw new Error(`Could not load your party: ${error.message}`);
    partyRole = data.leader_id === user.id ? "leader" : "member";
  }

  const picked = typeof wanted === "string" ? friends.find((f) => f.id === wanted) : undefined;
  const selected = picked ?? friends[0] ?? null;
  const games: SharedGame[] = selected ? await loadGamesWith(supabase, selected.id) : [];

  const fromStacks: Suggestion[] = (suggestions.data ?? []).map((s) => ({
    id: s.user_id,
    name: s.display_name ?? "Unnamed",
    avatarUrl: steamAvatarOnly(s.avatar_url),
    stackName: s.team_name,
  }));

  return (
    <main className="page flex flex-1 flex-col gap-6 py-10">
      <FriendsBoard
        friendCode={profile.data.friend_code ?? null}
        friends={friends}
        requests={requests}
        suggestions={fromStacks}
        selected={selected}
        opened={Boolean(picked)}
        games={games}
        heroes={Object.fromEntries(heroes.map((h) => [h.id, { name: h.name, image: h.image }]))}
        partyRole={partyRole}
        now={renderedAt()}
      />
    </main>
  );
}

/** A server component renders once per request, so reading the clock here is stable for that render. */
function renderedAt(): number {
  return Date.now();
}
