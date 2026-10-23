import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { createClient } from "@/lib/supabase/server";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join a team · Dota 2 Team Picker" };

/** Where a friend lands from their invite email: a quick sign up, then they join the team. */
export default async function JoinPage({ params }: PageProps<"/join/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: invites }, { data: auth }] = await Promise.all([
    supabase.rpc("get_team_invite", { invite: id }),
    supabase.auth.getUser(),
  ]);
  const invite = invites?.[0];
  const user = auth.user;

  if (!invite) {
    return (
      <AuthCard title="Invite not found">
        <p className="text-zinc-400">This invite link doesn&apos;t work anymore. Ask your captain to send a new one.</p>
      </AuthCard>
    );
  }

  const title = `Join ${invite.team_name}`;
  const intro = (
    <p className="text-zinc-400">
      {invite.captain_name ?? "Your captain"} invited <span className="text-zinc-200">{invite.email}</span> to
      their team. They&apos;ll call heroes for you in the draft based on the positions and heroes you pick next.
    </p>
  );

  if (!user) {
    const next = encodeURIComponent(`/join/${id}`);
    return (
      <AuthCard title={title}>
        {intro}
        <p className="text-sm text-zinc-400">
          Open the link in your invite email, or{" "}
          <Link href={`/signup?next=${next}`} className="text-red-400 hover:underline">
            sign up
          </Link>{" "}
          or{" "}
          <Link href={`/login?next=${next}`} className="text-red-400 hover:underline">
            log in
          </Link>{" "}
          with {invite.email}.
        </p>
      </AuthCard>
    );
  }

  if (user.email?.toLowerCase() !== invite.email) {
    return (
      <AuthCard title={title}>
        {intro}
        <p className="text-sm text-zinc-400">
          You&apos;re signed in as {user.email}. Sign out and open the link again with {invite.email}.
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-md px-4 py-2 font-semibold ring-1 ring-zinc-600 hover:bg-zinc-800">
            Sign out
          </button>
        </form>
      </AuthCard>
    );
  }

  if (invite.accepted) redirect("/my-heroes");
  if (invite.expired) {
    return (
      <AuthCard title={title}>
        <p className="text-zinc-400">
          This invite has expired. Invites work for 7 days; ask {invite.captain_name ?? "your captain"} to send it again.
        </p>
      </AuthCard>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  // Invited users arrive signed in by the email link but without a password yet.
  const askPassword = Boolean(user.invited_at) && !user.user_metadata?.password_set;

  return (
    <AuthCard title={title}>
      {intro}
      <JoinForm invite={id} name={profile?.display_name ?? ""} askPassword={askPassword} />
    </AuthCard>
  );
}
