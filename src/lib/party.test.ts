import { describe, expect, it } from "vitest";
import { steamAvatar, toParty } from "./party";

describe("toParty", () => {
  it("is null when not in a party", () => {
    expect(toParty([])).toBeNull();
    expect(toParty(null)).toBeNull();
  });

  it("keeps the order and fills in missing names", () => {
    const party = toParty([
      { party_id: "p", leader_id: "a", user_id: "a", display_name: "Can", avatar_url: null, position: 3 },
      { party_id: "p", leader_id: "a", user_id: "b", display_name: null, avatar_url: "https://evil.example/x.png", position: null },
    ]);
    expect(party).toEqual({
      id: "p",
      leaderId: "a",
      captain: { id: null, online: false, requestBy: null, requestMsLeft: 0 },
      members: [
        { id: "a", name: "Can", avatarUrl: null, position: 3, askWaitMs: 0 },
        { id: "b", name: "Unnamed", avatarUrl: null, position: null, askWaitMs: 0 },
      ],
    });
  });

  it("counts the captain request and the ask cooldown by the database clock", () => {
    // The browser clock is ignored: server_now is the reference.
    const party = toParty([
      {
        party_id: "p",
        leader_id: "a",
        user_id: "a",
        display_name: "Can",
        avatar_url: null,
        position: null,
        captain_id: "a",
        captain_online: true,
        captain_request_by: "b",
        captain_request_expires_at: "2020-01-01T00:00:20Z",
        captain_asked_at: null,
        server_now: "2020-01-01T00:00:00Z",
      },
      {
        party_id: "p",
        leader_id: "a",
        user_id: "b",
        display_name: "Ali",
        avatar_url: null,
        position: null,
        captain_asked_at: "2019-12-31T23:59:50Z",
        server_now: "2020-01-01T00:00:00Z",
      },
    ]);
    expect(party?.captain).toEqual({ id: "a", online: true, requestBy: "b", requestMsLeft: 20_000 });
    expect(party?.members.map((m) => m.askWaitMs)).toEqual([0, 50_000]);
  });

  it("ignores a request with no expiry", () => {
    const party = toParty([
      { party_id: "p", leader_id: "a", user_id: "a", captain_request_by: "b", captain_request_expires_at: null, server_now: "2020-01-01T00:00:00Z" },
    ]);
    expect(party?.captain.requestBy).toBeNull();
  });
});

describe("steamAvatar", () => {
  it("allows Steam pictures only", () => {
    expect(steamAvatar("https://avatars.steamstatic.com/a.jpg")).toBe("https://avatars.steamstatic.com/a.jpg");
    expect(steamAvatar("https://example.com/a.jpg")).toBeNull();
  });
});
