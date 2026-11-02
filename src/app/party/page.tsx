import type { Metadata } from "next";
import { getHeroes } from "@/lib/heroes";
import { steamAvatar, toParty } from "@/lib/party";
import { fetchPartyLink } from "@/lib/party-link";
import { getRecords } from "@/lib/records";
import { createClient } from "@/lib/supabase/server";
import { latestSentPlan } from "@/lib/team-game-plan";
import { YourRecords } from "@/components/your-records";
import { PartyLobby, type Invitee } from "./party-lobby";
import { TeamGamePlan } from "./team-game-plan";

export const metadata: Metadata = { title: "Party · Dota 2 Team Picker" };

/** Start a party, invite friends and teammates, and pick positions for the next game. */
export default async function PartyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: rows }, { data: friends }, { data: teammates }, heroes] = await Promise.all([
    supabase.rpc("party_view"),
    supabase.rpc("my_friends"),
    supabase.rpc("friend_suggestions"),
    // Hero icons are decoration: without them the game plan shows hero names only.
    getHeroes().catch(() => []),
  ]);
  // The game plan and records are extras: if they fail to load, the lobby still works.
  const [sentPlan, records] = await Promise.all([
    latestSentPlan(supabase).catch(() => null),
    getRecords(supabase).catch(() => null),
  ]);
  const party = toParty(rows);
  // Loaded here so Copy needs no wait (Safari drops clipboard access after one). If it fails, the card loads it again.
  const link = party?.leaderId === user.id ? (await fetchPartyLink(supabase)).link : null;

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

  const names = Object.fromEntries(invitees.map((i) => [i.id, i.name]));
  const icons = Object.fromEntries(heroes.map((h) => [h.id, h.icon]));

  return (
    <main className="page flex flex-1 flex-col gap-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Party</h1>
        <p className="text-sm text-muted">
          Gather up to 5 players for your next game. Invites pop up on their screen while they&apos;re on the site, or share the invite link.
        </p>
      </div>
      <TeamGamePlan userId={user.id} initialPlan={sentPlan} names={names} icons={icons} />
      {/* Keyed by party, so joining from the invite pop-up (which refreshes this page) shows the new party. */}
      <PartyLobby key={party?.id ?? "none"} userId={user.id} initialParty={party} initialLink={link} invitees={invitees} />
      {records && <YourRecords records={records} />}
    </main>
  );
}
