import { describe, expect, it } from "vitest";
import { placeOf, SECTIONS, waitingIn } from "./sections";

const place = (pathname: string) => {
  const here = placeOf(pathname);
  return here ? `${here.section.label} / ${here.page?.label ?? "none"}` : null;
};

describe("placeOf", () => {
  it("names the section and the page of every page in a row", () => {
    expect(place("/draft")).toBe("Draft / Draft");
    expect(place("/my-heroes")).toBe("You / Heroes");
    expect(place("/my-heroes/games")).toBe("You / Games");
    expect(place("/profile")).toBe("You / Profile");
    expect(place("/meta")).toBe("Meta / This Patch");
    expect(place("/proof")).toBe("Meta / Do Our Picks Win?");
    expect(place("/friends")).toBe("Team / Friends");
    expect(place("/stacks")).toBe("Team / Stacks");
  });

  it("puts a page under the closest page above it", () => {
    // One game is under Your Games, not under Heroes, though both addresses start with /my-heroes.
    expect(place("/my-heroes/games/8123456789")).toBe("You / Games");
    expect(place("/stacks/abc")).toBe("Team / Stacks");
  });

  it("keeps a draft's report in Draft without a page of its own", () => {
    expect(place("/reports/abc")).toBe("Draft / none");
  });

  it("has no place for pages outside the sections", () => {
    expect(place("/")).toBeNull();
    expect(place("/login")).toBeNull();
    expect(place("/admin/players")).toBeNull();
    // An address that only starts like a page is not that page.
    expect(place("/metals")).toBeNull();
  });
});

describe("SECTIONS", () => {
  it("opens every section on its first page", () => {
    for (const section of SECTIONS) expect(section.pages[0]?.href).toBe(section.href);
  });
});

describe("waitingIn", () => {
  it("adds up what waits on a section's pages", () => {
    const [draft, , , team] = SECTIONS;
    expect(waitingIn(team!, { friends: 2, stacks: 3 })).toBe(5);
    expect(waitingIn(draft!, { friends: 2, stacks: 3 })).toBe(0);
  });
});
