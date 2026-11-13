import { describe, expect, it } from "vitest";
import { toInvite } from "./party-invite-popup";

const now = Date.parse("2026-11-14T10:00:00Z");
const row = (more: Record<string, unknown>) => ({
  party_id: "p",
  inviter_name: "Can",
  inviter_avatar_url: null,
  members: 2,
  position: 4,
  seated: true,
  expires_at: "2026-11-14T10:10:00Z",
  ...more,
});

describe("toInvite", () => {
  it("reads a live invite with its seat", () => {
    expect(toInvite(row({}), now)).toEqual({
      partyId: "p",
      inviterName: "Can",
      inviterAvatarUrl: null,
      members: 2,
      position: 4,
      late: false,
    });
  });

  it("keeps a seated player's invite after the pop-up time, as a Join card", () => {
    expect(toInvite(row({ expires_at: "2026-11-14T09:50:00Z" }), now)).toMatchObject({ late: true, position: 4 });
  });

  it("drops an expired invite without a seat, and rows it can't trust", () => {
    expect(toInvite(row({ expires_at: "2026-11-14T09:50:00Z", seated: false, position: null }), now)).toBeNull();
    expect(toInvite(row({ party_id: 3 }), now)).toBeNull();
    expect(toInvite(row({ position: 9, inviter_name: "" }), now)).toMatchObject({ position: null, inviterName: "A player" });
  });
});
