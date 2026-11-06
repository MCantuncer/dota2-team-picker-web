import { POSITIONS, type GamesWins, type Position } from "@/lib/engine/types";
import { toPartyStats, type HeroPool, type PartyPlayer, type PlanMember } from "@/lib/party-plan";
import { SOLO_ME, TEAMMATE, teammateId } from "@/lib/solo-queue";

/**
 * Team: plan one draft for any mix of people from the Stacks the player runs and their friends,
 * online or not. Five seats by position; the player sits under SOLO_ME, and a seat nobody sits in
 * is an open seat, planned as a teammate who can play any hero (what Solo Queue was).
 */

/** Players in one game. */
export const LINEUP_MAX = 5;

/** A person's first favorite position nobody has yet, else the first free position. */
export function defaultPosition(person: { positions: Position[] }, taken: Set<Position>): Position {
  return person.positions.find((p) => !taken.has(p)) ?? POSITIONS.find((p) => !taken.has(p)) ?? person.positions[0] ?? 1;
}

/** One person in one seat. */
export interface Seat {
  id: string;
  position: Position;
}

/** A Stack the player runs that this person is in, from `lineup_players`. */
export interface StackLink {
  id: string;
  name: string;
  joinedAt: string | null;
  role: "owner" | "co_captain" | "player";
}

/** Someone the player can seat, from one `lineup_players` row. */
export interface TeamPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Their favorite positions, lowest first. Empty when their heroes aren't shared with the player. */
  positions: Position[];
  stacks: StackLink[];
  isFriend: boolean;
  /** Whether their heroes, positions, rank and records come along. */
  shared: boolean;
  /** False for a Stack owner a Manager plans for, who isn't a sharing friend. */
  canAdd: boolean;
}

/** What the browser keeps between visits: ids and positions only, never names or heroes. */
export interface SavedTeam {
  mode: "me" | "team";
  seats: Seat[];
}

export const teamStorageKey = (userId: string | null) => `team-lineup:${userId ?? "guest"}`;
const oldStackKey = (userId: string) => `stack-lineup:${userId}`;
const oldSoloKey = (userId: string | null) => `solo-queue:${userId ?? "guest"}`;

const isPosition = (v: unknown): v is Position => POSITIONS.includes(v as Position);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isSeat = (v: unknown): v is Seat => isObject(v) && typeof v.id === "string" && isPosition(v.position);

export function isSavedTeam(v: unknown): v is SavedTeam {
  return (
    isObject(v) &&
    (v.mode === "me" || v.mode === "team") &&
    Array.isArray(v.seats) &&
    v.seats.every(isSeat)
  );
}

/** Keeps the first seat per person and per position, at most five. */
function tidy(seats: Seat[]): Seat[] {
  const out: Seat[] = [];
  for (const s of seats) {
    if (out.length >= LINEUP_MAX || out.some((o) => o.id === s.id || o.position === s.position)) continue;
    out.push(s);
  }
  return out;
}

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The saved Team for this account, carrying over what the old Plan For kept: a Stack lineup wins
 * over Solo Queue, and the player's own user id becomes SOLO_ME. Old keys go once the new one is
 * written. A signed-out Solo Queue never moves into an account.
 */
export function readSavedTeam(store: Store, userId: string | null, myPosition: Position): SavedTeam | null {
  const key = teamStorageKey(userId);
  const parse = (k: string): unknown => {
    try {
      return JSON.parse(store.getItem(k) ?? "null");
    } catch {
      return null;
    }
  };
  const saved = parse(key);
  if (isSavedTeam(saved)) return { ...saved, seats: tidy(saved.seats) };

  let migrated: SavedTeam | null = null;
  const stack = userId ? parse(oldStackKey(userId)) : null;
  if (isObject(stack) && typeof stack.stackId === "string" && Array.isArray(stack.picks) && stack.stackId) {
    const seats = stack.picks.filter(isSeat).map((s) => (s.id === userId ? { ...s, id: SOLO_ME } : s));
    migrated = { mode: "team", seats: tidy(seats) };
  } else if (store.getItem(oldSoloKey(userId)) === "on") {
    migrated = { mode: "team", seats: [{ id: SOLO_ME, position: myPosition }] };
  }
  if (!migrated) return null;
  store.setItem(key, JSON.stringify(migrated));
  if (userId) store.removeItem(oldStackKey(userId));
  store.removeItem(oldSoloKey(userId));
  return migrated;
}

/**
 * Seats someone. Someone already seated moves, swapping with whoever held that position; someone
 * new takes the position and the person there leaves the lineup.
 */
export function place(seats: Seat[], id: string, position: Position): Seat[] {
  const current = seats.find((s) => s.id === id);
  if (current?.position === position) return seats;
  if (current)
    return seats.map((s) => (s.id === id ? { ...s, position } : s.position === position ? { ...s, position: current.position } : s));
  return [...seats.filter((s) => s.position !== position), { id, position }];
}

export const removeSeat = (seats: Seat[], id: string): Seat[] => seats.filter((s) => s.id !== id);

/** Seats someone at their first favorite free position, or takes them out if seated. Five at most. */
export function toggleSeat(seats: Seat[], person: Pick<TeamPerson, "id" | "positions" | "canAdd">): Seat[] {
  if (seats.some((s) => s.id === person.id)) return removeSeat(seats, person.id);
  if (!person.canAdd || seats.length >= LINEUP_MAX) return seats;
  return [...seats, { id: person.id, position: defaultPosition(person, new Set(seats.map((s) => s.position))) }];
}

/**
 * Seats one person (Plan a Draft from Friends) at their favorite free position, keeping everyone
 * already seated. Says why when they can't be seated.
 */
export function seatPerson(seats: Seat[], people: TeamPerson[], id: string): { seats: Seat[]; problem: string | null } {
  if (seats.some((s) => s.id === id)) return { seats, problem: null };
  const person = people.find((p) => p.id === id);
  if (!person || !person.canAdd) return { seats, problem: "That player is no longer yours to plan for." };
  if (seats.length >= LINEUP_MAX) return { seats, problem: `${person.name} didn't fit: all seats are taken.` };
  return { seats: toggleSeat(seats, person), problem: null };
}

/** A Stack's people the player can seat, in the order they joined it. Never its owner. */
export function stackPeople(people: TeamPerson[], stackId: string): TeamPerson[] {
  const joined = (p: TeamPerson) => p.stacks.find((s) => s.id === stackId)?.joinedAt ?? "";
  return people
    .filter((p) => p.canAdd && p.stacks.some((s) => s.id === stackId && s.role !== "owner"))
    .sort((a, b) => joined(a).localeCompare(joined(b)));
}

/**
 * Fills open seats with a Stack's people at their favorite free positions, never moving anyone
 * already seated. Returns who didn't fit.
 */
export function fillFromStack(seats: Seat[], people: TeamPerson[], stackId: string): { seats: Seat[]; left: TeamPerson[] } {
  let out = seats;
  const left: TeamPerson[] = [];
  for (const p of stackPeople(people, stackId)) {
    if (out.some((s) => s.id === p.id)) continue;
    if (out.length >= LINEUP_MAX) left.push(p);
    else out = toggleSeat(out, p);
  }
  return { seats: out, left };
}

/**
 * The saved seats checked against who the player can plan for now: someone no longer listed
 * (unfriended, left the Stack) or no longer addable leaves an open seat. The player always stays.
 */
export function cleanSeats(seats: Seat[], people: TeamPerson[]): Seat[] {
  const ok = new Set(people.filter((p) => p.canAdd).map((p) => p.id));
  return tidy(seats.filter((s) => s.id === SOLO_ME || ok.has(s.id)));
}

/** A `lineup_players` row, as the generated types describe it (nullable where the SQL is). */
export interface LineupRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  rank_tier: number | null;
  positions: number[] | null;
  favorites: unknown;
  hero_stats: unknown;
  stacks: unknown;
  is_friend: boolean;
  shared: boolean;
}

const ROLES = ["owner", "co_captain", "player"] as const;

function toLinks(v: unknown): StackLink[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s) =>
    isObject(s) && typeof s.id === "string" && typeof s.name === "string"
      ? [
          {
            id: s.id,
            name: s.name,
            joinedAt: typeof s.joined_at === "string" ? s.joined_at : null,
            role: ROLES.find((r) => r === s.role) ?? "player",
          },
        ]
      : [],
  );
}

/** People and their heroes from `lineup_players`; anything malformed is skipped, not trusted. */
export function toTeamPeople(rows: LineupRow[]): { people: TeamPerson[]; pool: HeroPool; players: Record<string, PartyPlayer> } {
  const people = rows.map((r) => {
    const stacks = toLinks(r.stacks);
    return {
      id: r.user_id,
      name: r.display_name ?? "Unnamed",
      avatarUrl: r.avatar_url,
      positions: r.shared ? (r.positions ?? []).filter(isPosition) : [],
      stacks,
      isFriend: r.is_friend,
      shared: r.shared,
      // A Manager sees the owner, whose heroes were never shared with Managers, but can't seat them.
      canAdd: r.shared || r.is_friend,
    };
  });
  const { pool, players } = toPartyStats(rows.map((r) => (r.shared ? r : { ...r, favorites: {}, hero_stats: {}, rank_tier: null })));
  return { people, pool, players };
}

/** What the draft board plans with in Team. Same shape as a party or Solo Queue plan. */
export interface TeamPlan {
  pool: HeroPool;
  players: Record<string, PartyPlayer>;
  members: PlanMember[];
  names: Record<string, string>;
  /** The player's seat, or null when they plan for others without playing. */
  myPosition: Position | null;
}

/**
 * Every position filled: seated people with their heroes (none when unshared), the player with
 * their own, and a no-pool teammate in each open seat.
 */
export function teamPlan({
  seats,
  people,
  pool,
  players,
  myHeroes,
  personal,
}: {
  seats: Seat[];
  people: TeamPerson[];
  pool: HeroPool;
  players: Record<string, PartyPlayer>;
  myHeroes: Record<number, number[]>;
  personal: Record<number, GamesWins>;
}): TeamPlan {
  const byPosition = new Map(seats.map((s) => [s.position, s.id]));
  const members = POSITIONS.map((position) => ({ id: byPosition.get(position) ?? teammateId(position), position }));
  const names: Record<string, string> = { [SOLO_ME]: "You" };
  const outPool: HeroPool = {};
  const outPlayers: Record<string, PartyPlayer> = {};
  for (const m of members) {
    if (m.id === SOLO_ME) {
      outPool[SOLO_ME] = myHeroes;
      outPlayers[SOLO_ME] = { rank: null, personal };
    } else if (byPosition.get(m.position) === m.id) {
      outPool[m.id] = pool[m.id] ?? {};
      if (players[m.id]) outPlayers[m.id] = players[m.id];
      names[m.id] = people.find((p) => p.id === m.id)?.name ?? "Unnamed";
    } else {
      outPool[m.id] = {};
      names[m.id] = TEAMMATE;
    }
  }
  return { pool: outPool, players: outPlayers, members, names, myPosition: seats.find((s) => s.id === SOLO_ME)?.position ?? null };
}
