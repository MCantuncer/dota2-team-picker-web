import { describe, expect, it } from "vitest";
import { markTourSeen, placeTip, scrollFor, seenTours } from "./page-tour";

const SCREEN = { width: 1280, height: 800 };
const TIP = { width: 320, height: 200 };

describe("placeTip", () => {
  it("puts the card under the control, starting at its left edge", () => {
    const place = placeTip({ top: 100, left: 200, width: 400, height: 36 }, TIP, SCREEN);
    expect(place.side).toBe("below");
    expect(place.top).toBe(100 + 36 + 6 + 14);
    expect(place.left).toBe(194);
    expect(place.arrowLeft).toBeGreaterThan(0);
  });

  it("goes above when there is no room under the control", () => {
    const place = placeTip({ top: 700, left: 200, width: 100, height: 40 }, TIP, SCREEN);
    expect(place.side).toBe("above");
    expect(place.top).toBe(700 - 6 - 14 - 200);
  });

  it("stays inside the screen at the right edge", () => {
    const place = placeTip({ top: 100, left: 1240, width: 32, height: 32 }, TIP, SCREEN);
    expect(place.left).toBe(1280 - 320 - 16);
    expect(place.arrowLeft).toBeLessThanOrEqual(320 - 30);
  });

  it("pins the card to the bottom, with no pointer, when the control fills the screen", () => {
    const place = placeTip({ top: 80, left: 100, width: 600, height: 700 }, TIP, SCREEN, 64);
    expect(place.top).toBe(800 - 200 - 16);
    expect(place.arrowLeft).toBeNull();
  });
});

describe("scrollFor", () => {
  const view = { height: 800, topInset: 64, bottomRoom: 240, scrollY: 1000 };

  it("leaves a control that is already in view alone", () => {
    expect(scrollFor({ top: 200, left: 0, width: 100, height: 40 }, view)).toBeNull();
  });

  it("brings a control under the fold up below the header", () => {
    expect(scrollFor({ top: 900, left: 0, width: 100, height: 40 }, view)).toBe(1000 + 894 - 80 - 24);
  });

  it("brings a control hidden under the sticky header back down", () => {
    expect(scrollFor({ top: 30, left: 0, width: 100, height: 40 }, view)).toBe(1000 + 24 - 80 - 24);
  });

  it("never scrolls above the top of the page", () => {
    expect(scrollFor({ top: 10, left: 0, width: 100, height: 40 }, { ...view, scrollY: 0 })).toBe(0);
  });
});

describe("seen tours", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it("remembers each page on its own", () => {
    const storage = memory();
    markTourSeen(storage, "draft");
    expect(seenTours(storage).has("draft")).toBe(true);
    expect(seenTours(storage).has("my-heroes")).toBe(false);
  });

  it("treats broken or missing storage as nothing seen", () => {
    expect(seenTours(null).size).toBe(0);
    expect(seenTours({ getItem: () => "{oops" }).size).toBe(0);
    expect(seenTours({ getItem: () => '{"draft":true}' }).size).toBe(0);
    expect(() =>
      markTourSeen(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error("blocked");
          },
        },
        "draft",
      ),
    ).not.toThrow();
  });
});
