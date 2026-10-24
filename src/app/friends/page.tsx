import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FriendsBoard, type Friend, type Suggestion } from "./friends-board";

export const metadata: Metadata = { title: "Friends · Dota 2 Team Picker" };

/** Only Steam avatars are shown; anything else in avatar_url is ignored. */
const STEAM_AVATAR = "https://avatars.steamstatic.com/";
const avatar = (url: string | null) => (url?.startsWith(STEAM_AVATAR) ? url : null);

/** Friends on this site, requests both ways, and people from your teams to add. */
export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: friends }, { data: suggestions }, { data: profile }] = await Promise.all([
    supabase.rpc("my_friends"),
    supabase.rpc("friend_suggestions"),
    supabase.from("profiles").select("friend_code").eq("id", user.id).single(),
  ]);

  const initialFriends: Friend[] = (friends ?? []).map((f: Record<string, unknown>) => ({
    id: f.user_id as string,
    name: (f.display_name as string | null) ?? "Unnamed",
    avatarUrl: avatar(f.avatar_url as string | null),
    steamLinked: Boolean(f.steam_linked),
    status: f.status === "accepted" ? "accepted" : "pending",
    incoming: Boolean(f.incoming),
  }));
  const initialSuggestions: Suggestion[] = (suggestions ?? []).map((s: Record<string, unknown>) => ({
    id: s.user_id as string,
    name: (s.display_name as string | null) ?? "Unnamed",
    avatarUrl: avatar(s.avatar_url as string | null),
    teamName: s.team_name as string,
  }));

  return (
    <main className="page flex flex-1 flex-col gap-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Friends</h1>
        <p className="text-sm text-muted">
          Add the people you play with. Soon you&apos;ll be able to invite friends to a party and draft together.
        </p>
      </div>
      <FriendsBoard
        friendCode={profile?.friend_code ?? null}
        initialFriends={initialFriends}
        initialSuggestions={initialSuggestions}
      />
    </main>
  );
}
