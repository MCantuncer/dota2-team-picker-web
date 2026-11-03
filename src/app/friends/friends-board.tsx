"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/account-menu";
import { createClient } from "@/lib/supabase/client";

export interface Friend {
  id: string;
  name: string;
  avatarUrl: string | null;
  steamLinked: boolean;
  status: "pending" | "accepted";
  /** For a pending request: true when they asked you. */
  incoming: boolean;
}

export interface Suggestion {
  id: string;
  name: string;
  avatarUrl: string | null;
  teamName: string;
}

/** Your add-me link, requests to answer, your friends, and people from your teams. */
export function FriendsBoard({
  friendCode,
  initialFriends,
  initialSuggestions,
}: {
  friendCode: string | null;
  initialFriends: Friend[];
  initialSuggestions: Suggestion[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [friends, setFriends] = useState(initialFriends);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [error, setError] = useState<string | null>(null);

  const incoming = friends.filter((f) => f.status === "pending" && f.incoming);
  const accepted = friends.filter((f) => f.status === "accepted");
  const sent = friends.filter((f) => f.status === "pending" && !f.incoming);

  const accept = async (f: Friend) => {
    const { error } = await supabase.rpc("accept_friend_request", { requester: f.id });
    if (error) return setError(`Request not accepted: ${error.message}`);
    setError(null);
    setFriends((cur) => cur.map((x) => (x.id === f.id ? { ...x, status: "accepted" } : x)));
  };

  // Decline, cancel and unfriend all delete the one row between the two of you.
  const remove = async (f: Friend, what: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .or(`requester_id.eq.${f.id},addressee_id.eq.${f.id}`);
    if (error) return setError(`${what} failed: ${error.message}`);
    setError(null);
    setFriends((cur) => cur.filter((x) => x.id !== f.id));
  };

  const add = async (s: Suggestion) => {
    const { data, error } = await supabase.rpc("send_friend_request", { target: s.id });
    if (error) return setError(`Request not sent: ${error.message}`);
    setError(null);
    setSuggestions((cur) => cur.filter((x) => x.id !== s.id));
    setFriends((cur) => [
      ...cur,
      { id: s.id, name: s.name, avatarUrl: s.avatarUrl, steamLinked: false, status: data === "accepted" ? "accepted" : "pending", incoming: false },
    ]);
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-dire">{error}</p>}
      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <Section title="Friends" count={accepted.length}>
          {accepted.length ? (
            accepted.map((f) => (
              <Row key={f.id} person={f} detail={f.steamLinked ? "Steam linked" : null}>
                <RemoveButton name={f.name} onRemove={() => remove(f, "Remove")} />
              </Row>
            ))
          ) : (
            <li className="py-4 text-sm text-muted">No friends yet. Share your friend link, or add people from your teams.</li>
          )}
        </Section>

        <div className="flex flex-col gap-10">
          {friendCode && <FriendLink code={friendCode} />}

          {incoming.length > 0 && (
            <Section title="Requests" count={incoming.length}>
              {incoming.map((f) => (
                <Row key={f.id} person={f} detail="Wants to be friends">
                  <button onClick={() => accept(f)} className="btn btn-primary btn-sm">
                    Accept
                  </button>
                  <button onClick={() => remove(f, "Decline")} className="btn btn-ghost btn-sm">
                    Decline
                  </button>
                </Row>
              ))}
            </Section>
          )}

          {sent.length > 0 && (
            <Section title="Sent" count={sent.length}>
              {sent.map((f) => (
                <Row key={f.id} person={f} detail="Waiting for them to accept">
                  <button onClick={() => remove(f, "Cancel")} className="btn btn-ghost btn-sm">
                    Cancel
                  </button>
                </Row>
              ))}
            </Section>
          )}

          {suggestions.length > 0 && (
            <Section title="From Your Teams" count={suggestions.length}>
              {suggestions.map((s) => (
                <Row key={s.id} person={s} detail={s.teamName}>
                  <button onClick={() => add(s)} className="btn btn-secondary btn-sm">
                    Add Friend
                  </button>
                </Row>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

const noSubscribe = () => () => {};

function FriendLink({ code }: { code: string }) {
  // The site's address is only known in the browser; the server renders the path alone.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const link = `${origin}/add/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="friend-link-heading" className="flex flex-col gap-2">
      <h2 id="friend-link-heading" className="section-title">
        Add a Friend
      </h2>
      <p className="text-sm text-muted">Send your friend link in Discord or anywhere else. Opening it sends you a request.</p>
      <div className="flex gap-2">
        <input readOnly value={link} aria-label="Your friend link" onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 text-sm" />
        <button onClick={copy} className="btn btn-primary">
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </section>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="section-title">
        {title} <span className="num text-base font-medium text-subtle">{count}</span>
      </h2>
      <ul className="divide-y divide-line border-y border-line">{children}</ul>
    </section>
  );
}

function Row({
  person,
  detail,
  children,
}: {
  person: { name: string; avatarUrl: string | null };
  detail: string | null;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar account={{ name: person.name, avatarUrl: person.avatarUrl, detail: null, steamLinked: false }} size={40} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium leading-tight text-fg">{person.name}</span>
        {detail && <span className="truncate text-sm text-muted">{detail}</span>}
      </span>
      <span className="flex shrink-0 gap-2">{children}</span>
    </li>
  );
}

/** Unfriending asks once before it happens. */
function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} aria-label={`Remove ${name}`} className="btn btn-ghost btn-sm">
        <Icon name="trash" />
        Remove
      </button>
    );
  }
  return (
    <>
      <button onClick={onRemove} className="btn btn-danger btn-sm">
        Remove {name}?
      </button>
      <button autoFocus onClick={() => setConfirming(false)} className="btn btn-secondary btn-sm">
        Keep
      </button>
    </>
  );
}
