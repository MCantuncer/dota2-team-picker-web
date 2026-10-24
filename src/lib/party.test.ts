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
      members: [
        { id: "a", name: "Can", avatarUrl: null, position: 3 },
        { id: "b", name: "Unnamed", avatarUrl: null, position: null },
      ],
    });
  });
});

describe("steamAvatar", () => {
  it("allows Steam pictures only", () => {
    expect(steamAvatar("https://avatars.steamstatic.com/a.jpg")).toBe("https://avatars.steamstatic.com/a.jpg");
    expect(steamAvatar("https://example.com/a.jpg")).toBeNull();
  });
});
