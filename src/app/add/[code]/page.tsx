import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { createClient } from "@/lib/supabase/server";
import { AddFriendButton } from "./add-friend-button";

export const metadata: Metadata = { title: "Add a friend · Dota 2 Team Picker" };

/** Where someone's "add me" link lands. Names show only to signed-in players. */
export default async function AddFriendPage({ params }: PageProps<"/add/[code]">) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`/add/${code}`);
    return (
      <AuthCard title="Add a friend">
        <p className="text-muted">
          Someone shared their friend link with you.{" "}
          <Link href={`/signup?next=${next}`} className="link">
            Sign up
          </Link>{" "}
          or{" "}
          <Link href={`/login?next=${next}`} className="link">
            log in
          </Link>{" "}
          to add them.
        </p>
      </AuthCard>
    );
  }

  const { data } = await supabase.rpc("profile_by_friend_code", { code });
  const person = data?.[0] as { id: string; display_name: string | null } | undefined;
  if (!person) {
    return (
      <AuthCard title="Link not found">
        <p className="text-muted">This friend link doesn&apos;t work. Ask your friend to copy it again from their Friends page.</p>
      </AuthCard>
    );
  }

  const name = person.display_name ?? "This player";
  if (person.id === user.id) {
    return (
      <AuthCard title="That's your link">
        <p className="text-muted">Send it to your friends. When they open it, they can add you.</p>
        <Link href="/friends" className="btn btn-primary self-start">
          Go to Friends
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Add ${name}`}>
      <p className="text-muted">Once {name} accepts, you can invite each other to parties.</p>
      <AddFriendButton targetId={person.id} name={name} />
    </AuthCard>
  );
}
