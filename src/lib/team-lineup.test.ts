import { beforeEach, describe, expect, it } from "vitest";
import { isTeammate, SOLO_ME } from "./solo-queue";
import {
  cleanSeats,
  fillFromStack,
  isSavedTeam,
  place,
  readSavedTeam,
  stackPeople,
  teamPlan,
  teamStorageKey,
  toggleSeat,
  toTeamPeople,
  type LineupRow,
  type Seat,
  type TeamPerson,
} from "./team-lineup";

const person = (id: string, more: Partial<TeamPerson> = {}): TeamPerson => ({
  id,
  name: id,
  avatarUrl: null,
  positions: [],
  stacks: [],
  isFriend: false,
  shared: true,
  canAdd: true,
  ...more,
});
const inStack = (id: string, joinedAt: string, role: "owner" | "player" = "player") => ({ id, name: id, joinedAt, role });

class MemoryStore {
  items = new Map<string, string>();
  getItem = (k: string) => this.items.get(k) ?? null;
  setItem = (k: string, v: string) => void this.items.set(k, v);
  removeItem = (k: string) => void this.items.delete(k);
}

describe("readSavedTeam", () => {
  let store: MemoryStore;
  beforeEach(() => (store = new MemoryStore()));

  it("reads the saved Team and drops duplicate people and positions", () => {
    store.setItem(teamStorageKey("u1"), JSON.stringify({ mode: "team", seats: [{ id: "a", position: 1 }, { id: "a", position: 2 }, { id: "b", position: 1 }] }));
    expect(readSavedTeam(store, "u1", 2)).toEqual({ mode: "team", seats: [{ id: "a", position: 1 }] });
  });

  it("carries over a Stack lineup, with the player's own id as SOLO_ME, and wins over Solo Queue", () => {
    store.setItem("stack-lineup:u1", JSON.stringify({ stackId: "s1", picks: [{ id: "u1", position: 4 }, { id: "tusk", position: 3 }] }));
    store.setItem("solo-queue:u1", "on");
    expect(readSavedTeam(store, "u1", 2)).toEqual({
      mode: "team",
      seats: [{ id: SOLO_ME, position: 4 }, { id: "tusk", position: 3 }],
      stackId: "s1",
    });
    expect(store.getItem("stack-lineup:u1")).toBeNull();
    expect(store.getItem("solo-queue:u1")).toBeNull();
    expect(isSavedTeam(JSON.parse(store.getItem(teamStorageKey("u1"))!))).toBe(true);
  });

  it("turns Solo Queue into a Team of just the player", () => {
    store.setItem("solo-queue:guest", "on");
    expect(readSavedTeam(store, null, 3)).toEqual({ mode: "team", seats: [{ id: SOLO_ME, position: 3 }] });
  });

  it("never carries a signed-out Solo Queue into an account", () => {
    store.setItem("solo-queue:guest", "on");
    expect(readSavedTeam(store, "u1", 3)).toBeNull();
  });

  it("ignores anything malformed", () => {
    store.setItem(teamStorageKey("u1"), "{nope");
    expect(readSavedTeam(store, "u1", 1)).toBeNull();
    store.setItem(teamStorageKey("u1"), JSON.stringify({ mode: "team", seats: [{ id: "a", position: 9 }] }));
    expect(readSavedTeam(store, "u1", 1)).toBeNull();
  });
});

describe("seats", () => {
  const seats: Seat[] = [
    { id: SOLO_ME, position: 2 },
    { id: "a", position: 1 },
  ];

  it("moves a seated person and swaps with whoever held the position", () => {
    expect(place(seats, SOLO_ME, 1)).toEqual([
      { id: SOLO_ME, position: 1 },
      { id: "a", position: 2 },
    ]);
  });

  it("puts someone new in a position and takes out who was there", () => {
    expect(place(seats, "b", 1)).toEqual([
      { id: SOLO_ME, position: 2 },
      { id: "b", position: 1 },
    ]);
  });

  it("ticks people at their first favorite free position, five at most, never someone who can't be added", () => {
    expect(toggleSeat(seats, person("b", { positions: [2, 4] }))).toContainEqual({ id: "b", position: 4 });
    expect(toggleSeat(seats, person("a"))).toEqual([{ id: SOLO_ME, position: 2 }]);
    expect(toggleSeat(seats, person("own", { canAdd: false }))).toBe(seats);
    const full = ["c", "d", "e"].reduce((s, id) => toggleSeat(s, person(id)), seats);
    expect(full).toHaveLength(5);
    expect(toggleSeat(full, person("f"))).toBe(full);
  });

  it("fills open seats from a Stack in the order people joined, skipping the owner and who is seated", () => {
    const people = [
      person("late", { stacks: [inStack("s1", "2026-11-03")], positions: [3] }),
      person("early", { stacks: [inStack("s1", "2026-11-01")], positions: [1] }),
      person("own", { stacks: [inStack("s1", "", "owner")], canAdd: false }),
      person("a", { stacks: [inStack("s1", "2026-10-01")] }),
      person("other", { stacks: [inStack("s2", "2026-10-01")] }),
    ];
    expect(stackPeople(people, "s1").map((p) => p.id)).toEqual(["a", "early", "late"]);
    const { seats: filled, left } = fillFromStack(seats, people, "s1");
    expect(filled).toEqual([...seats, { id: "early", position: 3 }, { id: "late", position: 4 }]);
    expect(left).toEqual([]);

    const crowded: Seat[] = [...seats, { id: "x", position: 3 }, { id: "y", position: 4 }];
    const result = fillFromStack(crowded, people, "s1");
    expect(result.seats.map((s) => s.id)).toEqual([SOLO_ME, "a", "x", "y", "early"]);
    expect(result.left.map((p) => p.id)).toEqual(["late"]);
  });

  it("opens the seats of people who are gone or can't be added, and always keeps the player", () => {
    const saved = [
      { id: SOLO_ME, position: 1 as const },
      { id: "gone", position: 2 as const },
      { id: "own", position: 3 as const },
      { id: "shy", position: 4 as const },
    ];
    expect(cleanSeats(saved, [person("own", { canAdd: false }), person("shy", { shared: false, isFriend: true, canAdd: true })])).toEqual([
      { id: SOLO_ME, position: 1 },
      { id: "shy", position: 4 },
    ]);
  });
});

describe("toTeamPeople and teamPlan", () => {
  const rows: LineupRow[] = [
    {
      user_id: "pal",
      display_name: "Pal",
      avatar_url: null,
      rank_tier: 54,
      positions: [3, 1, 9],
      favorites: { "3": [2], "1": [8] },
      hero_stats: { "8": { games: 10, wins: 6 } },
      stacks: [{ id: "s1", name: "Night Owls", joined_at: "2026-11-01", role: "player" }, { bad: true }],
      is_friend: true,
      shared: true,
    },
    {
      user_id: "shy",
      display_name: null,
      avatar_url: null,
      rank_tier: 71,
      positions: [5],
      favorites: { "5": [50] },
      hero_stats: {},
      stacks: [],
      is_friend: true,
      shared: false,
    },
    { user_id: "own", display_name: "Own", avatar_url: null, rank_tier: null, positions: [], favorites: {}, hero_stats: {}, stacks: [{ id: "s1", name: "Night Owls", joined_at: null, role: "owner" }], is_friend: false, shared: false },
  ];
  const { people, pool, players } = toTeamPeople(rows);

  it("reads people, keeping valid Stacks and positions only, and nothing of an unshared person's heroes", () => {
    expect(people[0]).toMatchObject({ name: "Pal", positions: [3, 1], stacks: [{ id: "s1", name: "Night Owls", joinedAt: "2026-11-01", role: "player" }] });
    expect(people[1]).toMatchObject({ name: "Unnamed", positions: [], canAdd: true });
    expect(people[2].canAdd).toBe(false);
    expect(pool.shy).toEqual({});
    expect(players.shy.rank).toBeNull();
    expect(pool.pal).toEqual({ 1: [8], 3: [2] });
  });

  it("plans every position: the player, seated people with their heroes, and teammates in open seats", () => {
    const plan = teamPlan({
      seats: [
        { id: SOLO_ME, position: 2 },
        { id: "pal", position: 3 },
        { id: "shy", position: 5 },
      ],
      people,
      pool,
      players,
      myHeroes: { 2: [11] },
      personal: {},
    });
    expect(plan.members.map((m) => m.id)).toEqual(["teammate-1", SOLO_ME, "pal", "teammate-4", "shy"]);
    expect(plan.pool).toEqual({ "teammate-1": {}, [SOLO_ME]: { 2: [11] }, pal: { 1: [8], 3: [2] }, "teammate-4": {}, shy: {} });
    expect(plan.names).toMatchObject({ [SOLO_ME]: "You", pal: "Pal", shy: "Unnamed", "teammate-1": "Teammate" });
    expect(plan.players.pal.rank).toBe(5);
    expect(plan.myPosition).toBe(2);
    expect(plan.members.filter((m) => isTeammate(m.id)).map((m) => m.position)).toEqual([1, 4]);
  });

  it("has no position for the player when they plan for others", () => {
    expect(teamPlan({ seats: [{ id: "pal", position: 1 }], people, pool, players, myHeroes: {}, personal: {} }).myPosition).toBeNull();
  });
});
