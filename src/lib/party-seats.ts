import { POSITIONS, type Position } from "@/lib/engine/types";
import { POSITION_NAMES, steamAvatar, type Party } from "@/lib/party";

/** A player the leader seated who hasn't joined on the site: invited, or in the game without the site. */
export interface SeatedPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  position: Position;
  /** Whether their invite pop-up is still showing (15 minutes); after that they are Not on Site. */
  inviteLive: boolean;
}

/** In Party, Invited (pop-up live), or Not on Site (seated, never opened the invite). */
export type SeatStatus = "in" | "invited" | "away";

/** One of the five Team Seats in a party: who holds the position and how. */
export interface PartySeat {
  position: Position;
  id: string;
  name: string;
  avatarUrl: string | null;
  status: SeatStatus;
}

const isPosition = (v: unknown): v is Position => POSITIONS.includes(v as Position);

/** Turns `party_seats_view` rows into seated players; rows without a valid position or id are skipped. */
export function toSeatedPlayers(rows: Record<string, unknown>[] | null): SeatedPlayer[] {
  return (rows ?? []).flatMap((r) =>
    typeof r.user_id === "string" && isPosition(r.position)
      ? [
          {
            id: r.user_id,
            name: typeof r.display_name === "string" && r.display_name ? r.display_name : "Unnamed",
            avatarUrl: steamAvatar(typeof r.avatar_url === "string" ? r.avatar_url : null),
            position: r.position,
            inviteLive: r.invite_live === true,
          },
        ]
      : [],
  );
}

/**
 * The party's seats by position: members first (the database keeps one per position), then seated
 * players in the positions left. A position nobody holds is open.
 */
export function partySeats(party: Party, seated: SeatedPlayer[]): PartySeat[] {
  const seats = new Map<Position, PartySeat>();
  for (const m of party.members) {
    if (isPosition(m.position) && !seats.has(m.position))
      seats.set(m.position, { position: m.position, id: m.id, name: m.name, avatarUrl: m.avatarUrl, status: "in" });
  }
  const members = new Set(party.members.map((m) => m.id));
  for (const s of seated) {
    if (!seats.has(s.position) && !members.has(s.id))
      seats.set(s.position, {
        position: s.position,
        id: s.id,
        name: s.name,
        avatarUrl: s.avatarUrl,
        status: s.inviteLive ? "invited" : "away",
      });
  }
  return POSITIONS.flatMap((p) => seats.get(p) ?? []);
}

/** "3 in Party, 2 Waiting", or just "3 in Party" when nobody is waiting. */
export function seatCount(seats: PartySeat[]): string {
  const inParty = seats.filter((s) => s.status === "in").length;
  const waiting = seats.length - inParty;
  return waiting ? `${inParty} in Party, ${waiting} Waiting` : `${inParty} in Party`;
}

/** What picking a person for a seat does in a party: invite them there, or move them there. */
export interface SeatChoice {
  kind: "invite" | "move";
  action: string;
  meta?: string;
}

const STATUS_WORDS: Record<SeatStatus, string> = { in: "In Party", invited: "Invited", away: "Not on Site" };

/**
 * The picker row for `personId` on `position`. The planner moves anyone in the party (a taken seat
 * swaps); the leader invites anyone else, into an open seat only. Null when neither applies.
 */
export function seatChoice({
  personId,
  position,
  seats,
  isLeader,
  isPlanner,
}: {
  personId: string;
  position: Position;
  seats: PartySeat[];
  isLeader: boolean;
  isPlanner: boolean;
}): SeatChoice | null {
  const name = POSITION_NAMES[position];
  const at = seats.find((s) => s.id === personId);
  if (at) {
    if (at.position === position || !isPlanner) return null;
    return { kind: "move", action: `Move to ${name}`, meta: `${STATUS_WORDS[at.status]} as ${POSITION_NAMES[at.position]}` };
  }
  if (!isLeader || seats.some((s) => s.position === position)) return null;
  return { kind: "invite", action: `Invite to ${name}` };
}
