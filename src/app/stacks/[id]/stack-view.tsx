"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import { RankMedal } from "@/components/rank-medal";
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

export interface StackMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "co_captain" | "player";
  rankTier: number | null;
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

const ROLE_LABEL: Record<StackMember["role"], string> = { owner: "Owner", co_captain: "Manager", player: "Player" };

type Tab = "members" | "requests" | "activity";

/** A Stack's page: who is in it, who wants in (for the owner and Managers) and its latest activity. */
export function StackView({
  stack,
  members,
  requests: initialRequests,
}: {
  stack: StackSummary;
  members: StackMember[];
  requests: JoinRequest[];
}) {
  const runs = stack.myRole === "owner" || stack.myRole === "co_captain";
  const [requests, setRequests] = useState(initialRequests);
  const [tab, setTab] = useState<Tab>(runs && initialRequests.length ? "requests" : "members");
  const [error, setError] = useState<string | null>(null);
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "members", label: "Members" },
    ...(runs ? [{ id: "requests" as const, label: "Players Who Want to Join", count: requests.length }] : []),
    { id: "activity", label: "Latest Activity" },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/stacks" className="btn btn-ghost btn-sm self-start text-muted">
        Back to Stacks
      </Link>
      <header className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="page-title truncate">{stack.name}</h1>
          <p className="text-sm text-muted">
            Owned by {stack.ownerName} · <span className="num">{stack.members}</span>{" "}
            {stack.members === 1 ? "player" : "players"} · <span className="num">{stack.games}</span>{" "}
            {stack.games === 1 ? "game" : "games"} together in 2 weeks
          </p>
        </div>
        <JoinControl stack={stack} onError={setError} />
      </header>
      {stack.myRole === "owner" && <OpenToggle stack={stack} onError={setError} />}
      {error && <p className="text-sm text-dire">{error}</p>}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Stack">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.id ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {t.label}
              {t.count ? (
                <span className="num rounded-full bg-hover px-1.5 text-xs text-fg" aria-label={`${t.count} waiting`}>
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "members" && <Members stack={stack} members={members} />}
          {tab === "requests" && (
            <Requests
              requests={requests}
              onAnswered={(id) => setRequests((cur) => cur.filter((r) => r.id !== id))}
              onError={setError}
            />
          )}
          {tab === "activity" && (
            <p className="text-sm text-muted">Games this Stack plays together will show up here.</p>
          )}
        </div>
      </div>
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
      <Link href={`/stacks?stack=${stack.id}`} className="btn btn-secondary">
        Manage Stack
      </Link>
    );
  }
  if (stack.myRole) {
    return (
      <div className="flex items-center gap-2">
        {stack.myRole === "co_captain" && (
          <Link href={`/stacks?stack=${stack.id}`} className="btn btn-secondary">
            Manage Stack
          </Link>
        )}
        <button onClick={leave} disabled={busy} className="btn btn-secondary">
          Leave
        </button>
      </div>
    );
  }
  if (request) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-subtle">Asked, waiting for the owner</span>
        <button onClick={() => cancel(request)} disabled={busy} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    );
  }
  if (!stack.openToRequests) return null;
  return (
    <button onClick={ask} disabled={busy} className="btn btn-primary">
      <Icon name="userPlus" />
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
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={open} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
      <span>Open to Requests</span>
      <span className="text-muted">
        {open ? "Anyone can find this Stack and ask to join." : "Hidden from Find a Stack."}
      </span>
    </label>
  );
}

function Members({ stack, members }: { stack: StackSummary; members: StackMember[] }) {
  if (!stack.myRole) {
    return <p className="text-sm text-muted">Only players in this Stack see who is in it.</p>;
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-2.5">
          <Avatar account={{ name: m.name, avatarUrl: m.avatarUrl, detail: null, steamLinked: false }} size={32} />
          <span className="min-w-0 flex-1 truncate font-medium text-fg">{m.name}</span>
          {m.rankTier ? <RankMedal rankTier={m.rankTier} size={28} /> : null}
          <span className="w-16 text-right text-xs text-muted">{ROLE_LABEL[m.role]}</span>
        </li>
      ))}
    </ul>
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
