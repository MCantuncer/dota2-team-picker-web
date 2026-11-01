import { describe, expect, it, vi } from "vitest";
import { fetchPartyLink, isPartyLinkCode, partyByLink, partyLinkUrl } from "./party-link";

type Client = Parameters<typeof fetchPartyLink>[0];
const clientReturning = (result: { data: unknown; error: { message: string } | null }) => {
  const rpc = vi.fn().mockResolvedValue(result);
  // Only rpc() is used by these helpers.
  return { client: { rpc } as unknown as Client, rpc };
};

describe("party links", () => {
  it("accepts only codes the database makes", () => {
    expect(isPartyLinkCode("0123456789abcdef")).toBe(true);
    expect(isPartyLinkCode("0123456789ABCDEF")).toBe(false);
    expect(isPartyLinkCode("0123456789abcde")).toBe(false);
    expect(isPartyLinkCode("../party")).toBe(false);
  });

  it("builds the link on this site", () => {
    expect(partyLinkUrl("https://dota2teampicker.com", "0123456789abcdef")).toBe(
      "https://dota2teampicker.com/invite/0123456789abcdef",
    );
  });

  it("fetches the link, or a fresh one", async () => {
    const { client, rpc } = clientReturning({ data: [{ code: "abc", expires_at: "2026-11-03T00:00:00Z" }], error: null });
    expect(await fetchPartyLink(client, true)).toEqual({ link: { code: "abc", expiresAt: "2026-11-03T00:00:00Z" }, error: null });
    expect(rpc).toHaveBeenCalledWith("party_link", { fresh: true });
  });

  it("returns the error instead of a link when the database refuses", async () => {
    const { client } = clientReturning({ data: null, error: { message: "Only the party leader can share the invite link" } });
    expect(await fetchPartyLink(client)).toEqual({ link: null, error: "Only the party leader can share the invite link" });
  });

  it("reads the party behind a link, ignoring non-Steam avatars", async () => {
    const { client } = clientReturning({
      data: [
        {
          party_id: "p1",
          leader_id: "u1",
          leader_name: "Ana",
          leader_avatar_url: "https://evil.example/a.png",
          members: 3,
          is_member: false,
          is_kicked: false,
        },
      ],
      error: null,
    });
    expect(await partyByLink(client, "0123456789abcdef")).toEqual({
      id: "p1",
      leaderId: "u1",
      leaderName: "Ana",
      leaderAvatarUrl: null,
      members: 3,
      isMember: false,
      isKicked: false,
    });
  });

  it("returns null for a dead link and throws when the lookup fails", async () => {
    expect(await partyByLink(clientReturning({ data: [], error: null }).client, "x")).toBeNull();
    await expect(partyByLink(clientReturning({ data: null, error: { message: "boom" } }).client, "x")).rejects.toEqual({
      message: "boom",
    });
  });
});
