import type { Metadata } from "next";
import { steamAvatar, toParty } from "@/lib/party";
import { createClient } from "@/lib/supabase/server";
import { PartyLobby, type Invitee } from "./party-lobby";

export const metadata: Metadata = { title: "Party · Dota 2 Team Picker" };

/** Start a party, invite friends and teammates, and pick positions for the next game. */
export default async function PartyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: rows }, { data: friends }, { data: teammates }] = await Promise.all([
    supabase.rpc("party_view"),
    supabase.rpc("my_friends"),
    supabase.rpc("friend_suggestions"),
  ]);

  // Friends first, then people from your teams; the database checks again on every invite.
  const invitees: Invitee[] = [
    ...(friends ?? [])
      .filter((f: Record<string, unknown>) => f.status === "accepted")
      .map((f: Record<string, unknown>) => ({
        id: f.user_id as string,
        name: (f.display_name as string | null) ?? "Unnamed",
        avatarUrl: steamAvatar(f.avatar_url as string | null),
        detail: "Friend",
      })),
    ...(teammates ?? []).map((t: Record<string, unknown>) => ({
      id: t.user_id as string,
      name: (t.display_name as string | null) ?? "Unnamed",
      avatarUrl: steamAvatar(t.avatar_url as string | null),
      detail: t.team_name as string,
    })),
  ];

  return (
    <main className="page flex flex-1 flex-col gap-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Party</h1>
        <p className="text-sm text-muted">
          Gather up to 5 players for your next game. Invites pop up on their screen while they&apos;re on the site.
        </p>
      </div>
      <PartyLobby userId={user.id} initialParty={toParty(rows)} invitees={invitees} />
    </main>
  );
}
