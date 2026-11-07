import { describe, expect, it } from "vitest";
import { againAt, fillInProgress, fillReadyAt, type FillStatus, readFillAnswer, readFillStatus } from "./hero-fill";

const now = new Date("2026-11-07T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const status = (s: Partial<FillStatus>): FillStatus => ({ state: null, at: null, games: null, nextAt: null, ...s });

describe("readFillStatus", () => {
  it("reads the profile columns", () => {
    expect(
      readFillStatus({
        hero_fill_state: "done",
        hero_fill_at: "2026-11-07T11:00:00Z",
        hero_fill_games: 835,
        hero_fill_next_at: null,
      }),
    ).toEqual({ state: "done", at: new Date("2026-11-07T11:00:00Z"), games: 835, nextAt: null });
  });

  it("reads anything odd as never filled", () => {
    expect(readFillStatus({ hero_fill_state: "weird", hero_fill_at: "not a date", hero_fill_games: -1 })).toEqual(status({}));
  });
});

describe("fillReadyAt", () => {
  it("lets a player who never filled start now", () => {
    expect(fillReadyAt(status({}), now)).toBeNull();
  });

  it("rests a finished fill for a day", () => {
    const at = minutesAgo(60);
    expect(fillReadyAt(status({ state: "done", at }), now)).toEqual(new Date(at.getTime() + 24 * 3_600_000));
    expect(fillReadyAt(status({ state: "done", at: minutesAgo(24 * 60 + 1) }), now)).toBeNull();
  });

  it("rests an empty or failed fill for 10 minutes", () => {
    for (const state of ["no_games", "too_few", "failed"] as const) {
      expect(fillReadyAt(status({ state, at: minutesAgo(5) }), now)).toEqual(new Date(now.getTime() + 5 * 60_000));
      expect(fillReadyAt(status({ state, at: minutesAgo(11) }), now)).toBeNull();
    }
  });

  it("waits for a waiting fill's retry time", () => {
    const nextAt = new Date(now.getTime() + 30 * 60_000);
    expect(fillReadyAt(status({ state: "waiting", at: minutesAgo(1), nextAt }), now)).toEqual(nextAt);
    expect(fillReadyAt(status({ state: "waiting", at: minutesAgo(40), nextAt: minutesAgo(1) }), now)).toBeNull();
  });
});

describe("fillInProgress", () => {
  it("keeps checking while a fill runs or waits", () => {
    expect(fillInProgress(status({ state: "running", at: minutesAgo(1) }), now)).toBe(true);
    expect(fillInProgress(status({ state: "waiting", at: minutesAgo(1), nextAt: now }), now)).toBe(true);
  });

  it("stops once the run is stuck or finished", () => {
    expect(fillInProgress(status({ state: "running", at: minutesAgo(11) }), now)).toBe(false);
    expect(fillInProgress(status({ state: "done", at: minutesAgo(1) }), now)).toBe(false);
    expect(fillInProgress(status({}), now)).toBe(false);
  });
});

describe("againAt", () => {
  const tz = "Europe/Istanbul";

  it("says the time on the same day", () => {
    expect(againAt(new Date("2026-11-07T11:32:00Z"), new Date("2026-11-07T09:00:00Z"), tz)).toBe("Again at 14:32");
  });

  it("says tomorrow for the next calendar day in the viewer's zone", () => {
    expect(againAt(new Date("2026-11-08T00:20:00Z"), new Date("2026-11-07T20:00:00Z"), tz)).toBe("Again tomorrow at 03:20");
  });

  it("gives the date further out", () => {
    expect(againAt(new Date("2026-11-10T09:00:00Z"), new Date("2026-11-07T09:00:00Z"), tz)).toBe("Again on 10 Nov at 12:00");
  });
});

describe("readFillAnswer", () => {
  it("reads whether the fill ran", () => {
    expect(readFillAnswer({ claimed: true, state: "done", added: 16 })).toEqual({ claimed: true });
    expect(readFillAnswer({ claimed: false })).toEqual({ claimed: false });
    expect(readFillAnswer(null)).toBeNull();
    expect(readFillAnswer({})).toBeNull();
  });
});
