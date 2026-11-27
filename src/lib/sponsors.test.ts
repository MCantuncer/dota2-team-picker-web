import { describe, expect, it } from "vitest";
import { type Sponsor, sponsorFor } from "./sponsors";

const sponsor: Sponsor = { name: "Aegis Gear", href: "https://example.com/dota", wide: "/sponsors/aegis-728.webp", phone: "/sponsors/aegis-320.webp" };

describe("sponsorFor", () => {
  it("has no sponsor booked on any page today", () => {
    expect(sponsorFor("meta")).toBeNull();
    expect(sponsorFor("proof")).toBeNull();
  });

  it("gives a page its booked sponsor and no other page's", () => {
    expect(sponsorFor("meta", { meta: sponsor })).toEqual(sponsor);
    expect(sponsorFor("proof", { meta: sponsor })).toBeNull();
  });

  it.each([
    ["a link that is not https", { href: "http://example.com" }],
    ["a script link", { href: "javascript:alert(1)" }],
    ["a picture from another site", { wide: "https://example.com/a.png" }],
    ["a picture outside the sponsors folder", { phone: "/art/invoker.webp" }],
    ["an empty name", { name: " " }],
  ])("draws nothing for %s", (_, over) => {
    expect(sponsorFor("meta", { meta: { ...sponsor, ...over } })).toBeNull();
  });
});
