import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/account-menu";
import { AuthCard } from "@/components/auth-card";
import { PARTY_SIZE } from "@/lib/party";
import { isPartyLinkCode, partyByLink, PARTY_LINK_PATH } from "@/lib/party-link";
import { createClient } from "@/lib/supabase/server";
import { JoinPartyButton } from "./join-party-button";

export const metadata: Metadata = { title: "Join a party · Dota 2 Team Picker" };

function DeadLink() {
  return (
    <AuthCard title="Link not working">
      <p className="text-muted">This invite link no longer works. Ask the party leader for a new one.</p>
      <Link href="/party" className="btn btn-secondary self-start">
        Go to Party
      </Link>
    </AuthCard>
  );
}

/** Where a party invite link lands. Who leads the party shows only to signed-in players. */
export default async function JoinPartyPage({ params }: PageProps<"/invite/[code]">) {
  const { code } = await params;
  if (!isPartyLinkCode(code)) return <DeadLink />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`${PARTY_LINK_PATH}/${code}`);
    return (
      <AuthCard title="Join a party">
        <p className="text-muted">
          You&apos;ve been invited to a party.{" "}
          <Link href={`/signup?next=${next}`} className="link">
            Sign up
          </Link>{" "}
          or{" "}
          <Link href={`/login?next=${next}`} className="link">
            log in
          </Link>{" "}
          to join it.
        </p>
      </AuthCard>
    );
  }

  const [party, { data: current, error: currentError }] = await Promise.all([
    partyByLink(supabase, code),
    supabase.rpc("my_party"),
  ]);
  if (currentError) throw currentError;
  if (!party) return <DeadLink />;
  if (party.isMember) redirect("/party");

  const leader = party.leaderName;
  const isFull = party.members >= PARTY_SIZE;
  return (
    <AuthCard title={`Join ${leader}'s party`}>
      <div className="flex items-center gap-2.5">
        <Avatar account={{ name: leader, avatarUrl: party.leaderAvatarUrl, detail: null, steamLinked: false }} size={40} />
        <span className="flex flex-col">
          <span className="font-heading text-base font-semibold leading-tight text-fg">{leader}</span>
          <span className="num text-sm text-muted">
            {party.members}/{PARTY_SIZE} players
          </span>
        </span>
      </div>
      {party.isKicked ? (
        <p className="notice notice-error">The leader removed you from this party.</p>
      ) : isFull ? (
        <p className="notice notice-warn">The party is full. Ask {leader} to open a slot.</p>
      ) : (
        <>
          {current && <p className="text-sm text-muted">You&apos;ll leave your current party.</p>}
          <JoinPartyButton code={code} />
        </>
      )}
    </AuthCard>
  );
}
