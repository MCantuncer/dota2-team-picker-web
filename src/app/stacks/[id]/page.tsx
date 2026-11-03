import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { steamAvatarOnly } from "@/lib/stacks";
import { createClient } from "@/lib/supabase/server";
import { StackView, type JoinRequest, type StackMember, type StackSummary } from "./stack-view";

export const metadata: Metadata = { title: "Stack · Dota 2 Team Picker" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One Stack's page. Anyone signed in sees an open Stack's name, owner and activity; only its players
 * see who is in it, and only the owner and Managers see who asked to join.
 */
export default async function StackPage({ params }: PageProps<"/stacks/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows, error } = await supabase.rpc("stack_page", { team: id });
  if (error) throw new Error(`Could not load the Stack: ${error.message}`);
  const row = rows?.[0];
  // A closed Stack you are not in looks the same as one that does not exist.
  if (!row) notFound();

  const role = row.my_role as StackSummary["myRole"];
  const runs = role === "owner" || role === "co_captain";
  const [members, requests] = await Promise.all([
    role ? supabase.rpc("stack_members", { team: id }) : null,
    runs ? supabase.rpc("team_join_requests_for", { team: id }) : null,
  ]);
  const failed = members?.error ?? requests?.error;
  if (failed) throw new Error(`Could not load the Stack: ${failed.message}`);

  const stack: StackSummary = {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name ?? "Unnamed",
    members: row.members,
    games: row.games,
    openToRequests: row.open_to_requests,
    myRole: role,
    myRequest: row.my_request,
  };
  const memberList: StackMember[] = (members?.data ?? []).map((m) => ({
    id: m.user_id,
    name: m.display_name ?? "Unnamed",
    avatarUrl: steamAvatarOnly(m.avatar_url),
    role: m.role as StackMember["role"],
    rankTier: m.rank_tier,
  }));
  const requestList: JoinRequest[] = (requests?.data ?? []).map((r) => ({
    id: r.request_id,
    name: r.display_name ?? "Unnamed",
    avatarUrl: steamAvatarOnly(r.avatar_url),
    rankTier: r.rank_tier,
    askedAt: r.created_at,
  }));

  return (
    <main className="page flex flex-1 flex-col gap-8 py-10">
      <StackView key={stack.id} stack={stack} members={memberList} requests={requestList} />
    </main>
  );
}
