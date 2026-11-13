"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import { PageTour } from "@/components/page-tour";
import { RankMedal } from "@/components/rank-medal";
import { bannerHero, StackBanner } from "@/components/stacks/stack-banner";
import { StackLineup, type HeroArt } from "@/components/stacks/stack-lineup";
import type { Seat } from "@/lib/stack-seats";
import { createClient } from "@/lib/supabase/client";

export interface StackSummary {
  id: string;
  name: string;
  ownerName: string;
  members: number;
  /** Games its players played together in the last 14 days. */
  games: number;
  openToRequests: boolean;
  /** Your place in the Stack; co_captain shows as Manager. Null when you are not in it. */
  myRole: "owner" | "co_captain" | "player" | null;
  /** Your open join request, if any. */
  myRequest: string | null;
}

/** Someone waiting for the owner or a Manager to let them in. */
export interface JoinRequest {
  id: string;
  name: string;
  avatarUrl: string | null;
  rankTier: number | null;
  askedAt: string;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * A Stack's page: its banner, the Lineup (for its players), who wants in (for the owner and Managers) and its
 * latest activity.
 */
export function StackView({
  stack,
  seats,
  art = {},
  youId,
  requests: initialRequests,
}: {
  stack: StackSummary;
  /** Its players; empty when you are not in it. */
  seats: Seat[];
  /** Hero names and portraits by id. */
  art?: Record<number, HeroArt>;
  youId: string;
  requests: JoinRequest[];
}) {
  const runs = stack.myRole === "owner" || stack.myRole === "co_captain";
  const [requests, setRequests] = useState(initialRequests);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex max-w-6xl flex-col gap-8">
      {/* Back on the left, the page's ? on the right, each in its own column. */}
      <div className="-mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6">
        <Link href="/stacks" className="btn btn-ghost btn-sm justify-self-start text-muted">
          <Icon name="chevronLeft" />
          Back to Stacks
        </Link>
        <PageTour tour="stack" />
      </div>
      <StackBanner
        stack={stack}
        seats={seats}
        players={seats.length || stack.members}
        hero={bannerHero(seats, youId, art)}
        stackPage={false}
        heading="h1"
        actions={<JoinControl stack={stack} onError={setError} />}
        onError={setError}
      />
      {stack.myRole === "owner" && <OpenToggle stack={stack} onError={setError} />}
      {error && <p className="text-sm text-dire">{error}</p>}

      {stack.myRole ? (
        <StackLineup seats={seats} hero={(id) => art[id] ?? { name: `Hero ${id}` }} youId={youId} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon name="shield" />
          Only players in this Stack see who is in it.
        </p>
      )}

      {runs && (
        <section aria-labelledby="requests-heading" data-tour="stack-requests" className="flex flex-col gap-3.5">
          <h2 id="requests-heading" className="section-title flex items-center gap-2">
            <Icon name="userPlus" />
            Players Who Want to Join
            {requests.length > 0 && (
              <span className="chip chip-accent num" aria-label={`${requests.length} waiting`}>
                {requests.length}
              </span>
            )}
          </h2>
          <Requests
            requests={requests}
            onAnswered={(id) => setRequests((cur) => cur.filter((r) => r.id !== id))}
            onError={setError}
          />
        </section>
      )}
      <section aria-labelledby="activity-heading" className="flex flex-col gap-3.5">
        <h2 id="activity-heading" className="section-title flex items-center gap-2">
          <Icon name="clock" />
          Latest Activity
        </h2>
        <p className="text-sm text-muted">Games this Stack plays together will show up here.</p>
      </section>
    </div>
  );
}

/** Ask to Join for outsiders, Asked with Cancel while the request waits, Leave for players. */
function JoinControl({ stack, onError }: { stack: StackSummary; onError: (e: string | null) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [request, setRequest] = useState(stack.myRequest);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("ask_to_join_team", { team: stack.id });
    setBusy(false);
    if (error || !data) return onError(`Request not sent: ${error?.message ?? "unknown error"}`);
    onError(null);
    setRequest(data);
  };

  const cancel = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("cancel_join_request", { request: id });
    setBusy(false);
    if (error) return onError(`Request not cancelled: ${error.message}`);
    onError(null);
    setRequest(null);
  };

  const leave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return onError("Log in again to leave the Stack.");
    setBusy(true);
    const { error } = await supabase.from("team_members").delete().eq("team_id", stack.id).eq("user_id", user.id);
    setBusy(false);
    if (error) return onError(`Could not leave ${stack.name}: ${error.message}`);
    router.push("/stacks");
    router.refresh();
  };

  if (stack.myRole === "owner") {
    return (
      <Link href={`/stacks?stack=${stack.id}`} data-tour="stack-manage" className="btn btn-secondary btn-lg">
        <Icon name="users" large />
        Manage Stack
      </Link>
    );
  }
  if (stack.myRole) {
    return (
      <div className="flex items-center gap-2">
        {stack.myRole === "co_captain" && (
          <Link href={`/stacks?stack=${stack.id}`} data-tour="stack-manage" className="btn btn-secondary btn-lg">
            <Icon name="users" large />
            Manage Stack
          </Link>
        )}
        <button onClick={leave} disabled={busy} className="btn btn-secondary btn-lg">
          Leave
        </button>
      </div>
    );
  }
  if (request) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-subtle">Asked, waiting for the owner</span>
        <button onClick={() => cancel(request)} disabled={busy} className="btn btn-secondary btn-lg">
          Cancel
        </button>
      </div>
    );
  }
  if (!stack.openToRequests) return null;
  return (
    <button onClick={ask} disabled={busy} data-tour="stack-ask" className="btn btn-primary btn-lg">
      <Icon name="userPlus" large />
      Ask to Join
    </button>
  );
}

/** The owner decides whether the Stack shows up in Find a Stack and takes requests. */
function OpenToggle({ stack, onError }: { stack: StackSummary; onError: (e: string | null) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(stack.openToRequests);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setBusy(true);
    const { error } = await supabase.from("teams").update({ open_to_requests: next }).eq("id", stack.id);
    setBusy(false);
    if (error) return onError(`Setting not saved: ${error.message}`);
    onError(null);
    setOpen(next);
  };

  return (
    <label data-tour="stack-open" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <input type="checkbox" checked={open} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
      <span>Open to Requests</span>
      <span className="text-muted">
        {open ? "Anyone can find this Stack and ask to join." : "Hidden from Find a Stack."}
      </span>
    </label>
  );
}

/** Join requests with Accept and Decline. Accepting adds the player to the Stack as a Player. */
function Requests({
  requests,
  onAnswered,
  onError,
}: {
  requests: JoinRequest[];
  onAnswered: (id: string) => void;
  onError: (e: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const answer = async (r: JoinRequest, accept: boolean) => {
    setBusy(r.id);
    const { error } = await supabase.rpc("answer_join_request", { request: r.id, accept });
    setBusy(null);
    if (error) return onError(`Request not answered: ${error.message}`);
    onError(null);
    onAnswered(r.id);
    if (accept) router.refresh();
  };

  if (!requests.length) {
    return <p className="text-sm text-muted">No one is waiting. Requests from Find a Stack show up here.</p>;
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {requests.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
          <Avatar account={{ name: r.name, avatarUrl: r.avatarUrl, detail: null, steamLinked: false }} size={32} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-fg">{r.name}</span>
            <span className="text-xs text-muted">Asked {dateFormat.format(new Date(r.askedAt))}</span>
          </span>
          {r.rankTier ? <RankMedal rankTier={r.rankTier} size={28} /> : null}
          <button onClick={() => answer(r, true)} disabled={busy === r.id} className="btn btn-primary btn-sm">
            Accept
          </button>
          <button onClick={() => answer(r, false)} disabled={busy === r.id} className="btn btn-secondary btn-sm">
            Decline
          </button>
        </li>
      ))}
    </ul>
  );
}
