"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { useDraftCaptain } from "@/app/party/draft-captain";
import { POSITION_NAMES } from "@/lib/draft";
import { POSITIONS, type Position } from "@/lib/engine/types";
import type { Party } from "@/lib/party";
import { seatChoice, type PartySeat } from "@/lib/party-seats";
import { toTeamPeople, type LineupRow, type TeamPerson } from "@/lib/team-lineup";
import { AddPlayer } from "./add-player";
import type { PlannableStack } from "./use-team-lineup";
import { createClient } from "@/lib/supabase/client";
import { PartySeats } from "./party-seats";

const isPosition = (v: unknown): v is Position => POSITIONS.includes(v as Position);

/**
 * The party on Draft: its Team Seats with the player's captain button and Leave Party in the head,
 * and captain notes and errors under the seats. Leaving takes the screen back to the player's own draft.
 */
export function PartyPanel({
  party,
  seats,
  userId,
  hero,
  heroAt,
  refresh,
  notes = [],
  planner,
  stacks,
}: {
  party: Party;
  seats: PartySeat[];
  userId: string;
  hero: (id: number) => { name: string; image?: string };
  heroAt: (position: Position) => number | null;
  refresh: () => Promise<void>;
  /** What starting the party left undone, shown on this screen until it reloads. */
  notes?: string[];
  /** Who runs the party's screen: the Draft Captain, else the leader. They move players. */
  planner: string | null;
  /** The Stacks the player runs, for the picker's chips. */
  stacks: PlannableStack[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (what: string, call: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true);
    const { error } = await call();
    setBusy(false);
    if (error) return setError(`${what}: ${error.message}`);
    setError(null);
    await refresh();
  };
  const captain = useDraftCaptain({
    party,
    userId,
    busy,
    run,
    become: () => supabase.rpc("become_captain"),
    stepDown: () => supabase.rpc("step_down_captain"),
  });
  const leave = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("leave_party");
    setBusy(false);
    if (error) return setError(`Could not leave: ${error.message}`);
    setError(null);
    router.refresh();
  };

  // The seat picker: the leader invites friends and Stack mates; the planner moves party players.
  const isLeader = party.leaderId === userId;
  const isPlanner = planner === userId;
  const [adding, setAdding] = useState<Position | null>(null);
  const [people, setPeople] = useState<TeamPerson[] | null>(null);
  const open = async (position: Position) => {
    if (adding === position) return setAdding(null);
    setAdding(position);
    if (people || !isLeader) return;
    const { data, error } = await supabase.rpc("lineup_players");
    if (error) {
      // The party's own players can still be moved.
      setPeople([]);
      return setError(`Friends and Stack mates not loaded: ${error.message}`);
    }
    setPeople(toTeamPeople((data ?? []) as LineupRow[]).people);
  };
  // Everyone in the party can be moved, even someone who joined by link and isn't a friend.
  const inParty: TeamPerson[] = seats
    .filter((s) => s.id !== userId && !people?.some((p) => p.id === s.id))
    .map((s) => ({ id: s.id, name: s.name, avatarUrl: s.avatarUrl, positions: [], stacks: [], isFriend: false, shared: true, canAdd: true }));
  const pickable = [...inParty, ...(people ?? []).filter((p) => p.id !== userId)];
  const pick = (id: string) => {
    const at = adding;
    const choice = at ? seatChoice({ personId: id, position: at, seats, isLeader, isPlanner }) : null;
    if (!at || !choice) return;
    setAdding(null);
    void run(
      choice.kind === "invite" ? "Invite not sent" : "Not moved",
      choice.kind === "invite"
        ? () => supabase.rpc("invite_to_party", { target: id, seat: at })
        : () => supabase.rpc("set_member_position", { target: id, want: at }),
    );
  };

  const leader = party.members.find((m) => m.id === party.leaderId)?.name;
  // When someone else moved the player's seat, say who and where, so the new Role is no surprise.
  const me = party.members.find((m) => m.id === userId);
  const mover = me?.positionSetBy && me.positionSetBy !== userId ? party.members.find((m) => m.id === me.positionSetBy) : null;
  const moved = mover && isPosition(me?.position) ? `${mover.name} moved you to ${POSITION_NAMES[me.position - 1]}.` : null;
  // The crown on a seat says who the captain is; the line only shows what just changed or a request's countdown.
  const captainLine = captain.note ?? (captain.waiting ? captain.line : null);
  return (
    <PartySeats
      title={leader ? `${leader}'s Party` : "Your Party"}
      seats={seats}
      userId={userId}
      captainId={party.captain.id}
      hero={hero}
      heroAt={heroAt}
      actions={
        <>
          {captain.action && (
            <button
              type="button"
              onClick={captain.action.onClick}
              disabled={captain.action.disabled}
              className={`btn btn-sm ${captain.action.quiet ? "btn-ghost" : "btn-secondary"}`}
            >
              {!captain.action.quiet && <Icon name="crown" />}
              {captain.action.label}
            </button>
          )}
          <button type="button" onClick={leave} disabled={busy} className="btn btn-secondary btn-sm">
            Leave Party
          </button>
        </>
      }
      controls={{
        adding,
        add: isLeader || isPlanner ? (p) => void open(p) : undefined,
        swap: isPlanner ? (p) => void open(p) : undefined,
        remove: isLeader
          ? (seat) =>
              void run(
                seat.status === "in" ? "Could not remove" : "Seat not freed",
                seat.status === "in"
                  ? () => supabase.rpc("remove_from_party", { target: seat.id })
                  : () => supabase.rpc("unseat_player", { target: seat.id }),
              )
          : undefined,
        reinvite: isLeader
          ? (seat) => void run("Invite not sent", () => supabase.rpc("invite_to_party", { target: seat.id }))
          : undefined,
      }}
      footer={
        <>
          {adding && (isLeader && !people ? (
            <p className="text-sm text-muted">Loading your Stacks and friends…</p>
          ) : (
            <div className={`flex ${adding > 2 ? "sm:justify-end" : ""}`}>
              <AddPlayer
                position={adding}
                people={pickable}
                seats={[]}
                stacks={isLeader ? stacks : []}
                onPick={pick}
                onClose={() => setAdding(null)}
                choose={(p) => seatChoice({ personId: p.id, position: adding, seats, isLeader, isPlanner })}
              />
            </div>
          ))}
          <p className="text-sm text-muted empty:hidden" aria-live="polite">
            {captainLine}
          </p>
          <p className="text-sm text-muted empty:hidden" aria-live="polite">
            {moved}
          </p>
          {notes.length > 0 && (
            <ul role="status" className="notice notice-warn text-sm">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="notice notice-error text-sm">
              {error}
            </p>
          )}
        </>
      }
    />
  );
}
