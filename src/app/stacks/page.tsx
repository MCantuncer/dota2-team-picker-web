import type { Metadata } from "next";
import { getHeroes } from "@/lib/heroes";
import { loadInvites, loadMembers, steamAvatarOnly, type StackRef } from "@/lib/stacks";
import { createClient } from "@/lib/supabase/server";
import { StackBoard, type Friend, type JoinedStack, type OpenInvite } from "./stack-board";

export const metadata: Metadata = { title: "Stacks · Dota 2 Team Picker" };

/** Your Stacks: saved groups of the people you play with, their members and invites. */
export default async function StacksPage({ searchParams }: PageProps<"/stacks">) {
  const { stack: wanted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [owned, memberships, invites, friends] = await Promise.all([
    supabase.from("teams").select("id, name").eq("owner_id", user.id).order("created_at"),
    supabase.from("team_members").select("role, teams(id, name, owner_id, profiles(display_name))").eq("user_id", user.id),
    supabase.rpc("my_team_invites"),
    supabase.rpc("my_friends"),
  ]);
  const failed = owned.error ?? memberships.error ?? invites.error ?? friends.error;
  if (failed) throw new Error(`Could not load your stacks: ${failed.message}`);

  const run: StackRef[] = (owned.data ?? []).map((t) => ({ ...t, owned: true }));
  const joined: JoinedStack[] = [];
  for (const m of memberships.data ?? []) {
    // One team per membership row (teams.id is the key), typed loosely by the client.
    const t = m.teams as unknown as { id: string; name: string; profiles: { display_name: string | null } | null } | null;
    if (!t) continue;
    if (m.role === "co_captain") run.push({ id: t.id, name: t.name, owned: false });
    else joined.push({ id: t.id, name: t.name, ownerName: t.profiles?.display_name ?? "Unnamed" });
  }

  const current = run.find((s) => s.id === wanted) ?? (wanted ? undefined : run[0]);
  const [members, stackInvites, heroes] = current
    ? await Promise.all([
        loadMembers(supabase, current.id),
        loadInvites(supabase, current.id),
        // Hero icons are decoration: if OpenDota is down the member list falls back to hero names.
        getHeroes().catch(() => []),
      ])
    : [[], { emails: [], friends: [] }, []];

  const openInvites: OpenInvite[] = (invites.data ?? []).map((i) => ({
    id: i.invite_id,
    stackName: i.team_name,
    inviterName: i.inviter_name ?? "A player",
    inviterAvatarUrl: steamAvatarOnly(i.inviter_avatar_url),
    members: i.members,
  }));
  const friendList: Friend[] = (friends.data ?? [])
    .filter((f) => f.status === "accepted")
    .map((f) => ({ id: f.user_id, name: f.display_name ?? "Unnamed", avatarUrl: steamAvatarOnly(f.avatar_url) }));

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="page-title">Stacks</h1>
        <p className="text-sm text-muted">A Stack is your saved group. A party is who&apos;s playing this game.</p>
      </div>
      <StackBoard
        key={current?.id ?? "none"}
        userId={user.id}
        stacks={run}
        joined={joined}
        current={current ?? null}
        members={members}
        emailInvites={stackInvites.emails}
        friendInvites={stackInvites.friends}
        openInvites={openInvites}
        friends={friendList}
        icons={Object.fromEntries(heroes.map((h) => [h.id, { name: h.name, icon: h.icon }]))}
      />
    </main>
  );
}
