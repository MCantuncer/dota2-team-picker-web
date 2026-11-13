import { describe, expect, it } from "vitest";
import type { Party, PartyMember } from "@/lib/party";
import { partySeats, seatChoice, seatCount, toSeatedPlayers, type PartySeat, type SeatedPlayer } from "@/lib/party-seats";

const member = (id: string, position: number | null): PartyMember => ({ id, name: id, avatarUrl: null, position, positionSetBy: null, askWaitMs: 0 });
const party = (members: PartyMember[]): Party => ({
  id: "p",
  leaderId: members[0]!.id,
  teamId: null,
  captain: { id: null, online: false, requestBy: null, requestMsLeft: 0 },
  members,
});
const seated = (id: string, position: 1 | 2 | 3 | 4 | 5, inviteLive = false): SeatedPlayer => ({
  id,
  name: id,
  avatarUrl: null,
  position,
  inviteLive,
});

describe("toSeatedPlayers", () => {
  it("reads the seats view and skips rows it can't trust", () => {
    expect(
      toSeatedPlayers([
        { user_id: "m", display_name: "Mert", avatar_url: "https://evil.example/a.png", position: 3, invite_live: true },
        { user_id: "x", display_name: null, position: 9, invite_live: false },
        { user_id: "y", display_name: "", position: 4, invite_live: null },
      ]),
    ).toEqual([
      { id: "m", name: "Mert", avatarUrl: null, position: 3, inviteLive: true },
      { id: "y", name: "Unnamed", avatarUrl: null, position: 4, inviteLive: false },
    ]);
    expect(toSeatedPlayers(null)).toEqual([]);
  });
});

describe("partySeats", () => {
  it("puts members and seated players in their positions, with how each holds it", () => {
    const seats = partySeats(party([member("can", 2), member("deniz", 1)]), [seated("mert", 5), seated("selin", 4, true)]);
    expect(seats.map((s) => [s.position, s.id, s.status])).toEqual([
      [1, "deniz", "in"],
      [2, "can", "in"],
      [4, "selin", "invited"],
      [5, "mert", "away"],
    ]);
    expect(seatCount(seats)).toBe("2 in Party, 2 Waiting");
  });

  it("never shows a player twice or two players in one position", () => {
    const seats = partySeats(party([member("can", 2), member("deniz", 2), member("arda", null)]), [seated("can", 3), seated("mert", 2)]);
    expect(seats.map((s) => [s.position, s.id])).toEqual([[2, "can"]]);
    expect(seatCount(seats)).toBe("1 in Party");
  });
});

describe("seatChoice", () => {
  const seats: PartySeat[] = [
    { position: 1, id: "deniz", name: "Deniz", avatarUrl: null, status: "in" },
    { position: 4, id: "mert", name: "Mert", avatarUrl: null, status: "away" },
  ];
  const leaderPlanner = { seats, isLeader: true, isPlanner: true };

  it("moves party players for the planner, swapping into a taken seat", () => {
    expect(seatChoice({ ...leaderPlanner, personId: "mert", position: 1 })).toEqual({
      kind: "move",
      action: "Move to Carry",
      meta: "Not on Site as Soft Support",
    });
    expect(seatChoice({ ...leaderPlanner, personId: "mert", position: 4 })).toBeNull();
    expect(seatChoice({ ...leaderPlanner, isPlanner: false, personId: "mert", position: 2 })).toBeNull();
  });

  it("invites others into open seats, for the leader only", () => {
    expect(seatChoice({ ...leaderPlanner, personId: "arda", position: 2 })).toEqual({ kind: "invite", action: "Invite to Mid" });
    expect(seatChoice({ ...leaderPlanner, personId: "arda", position: 1 })).toBeNull();
    expect(seatChoice({ ...leaderPlanner, isLeader: false, personId: "arda", position: 2 })).toBeNull();
  });
});
