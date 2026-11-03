import { describe, expect, it } from "vitest";
import { dueCard, isPoolCardHidden, type PoolCardRow } from "./pool-cards";

const NOW = Date.parse("2026-11-03T12:00:00Z");
const row = (over: Partial<PoolCardRow> = {}): PoolCardRow => ({
  id: "c1",
  hero_id: 114,
  position: 1,
  status: "open",
  question: "Add Monkey King to your carry heroes?",
  reason: "You won 86% of your last 7 Monkey King games as carry (pos 1).",
  snooze_until: null,
  ...over,
});

describe("dueCard", () => {
  it("shows an open card", () => {
    expect(dueCard([row()], NOW)).toEqual({
      id: "c1",
      heroId: 114,
      position: 1,
      question: "Add Monkey King to your carry heroes?",
      reason: "You won 86% of your last 7 Monkey King games as carry (pos 1).",
    });
  });

  it("brings a snoozed card back only once its snooze ran out", () => {
    expect(dueCard([row({ status: "snoozed", snooze_until: "2026-11-04T00:00:00Z" })], NOW)).toBeNull();
    expect(dueCard([row({ status: "snoozed", snooze_until: "2026-11-03T11:00:00Z" })], NOW)?.id).toBe("c1");
  });

  it("skips answered cards and odd positions", () => {
    expect(dueCard([row({ status: "accepted" }), row({ id: "c2", position: 9 })], NOW)).toBeNull();
  });
});

describe("isPoolCardHidden", () => {
  it("hides on the draft and the sign in and join pages", () => {
    for (const path of ["/draft", "/draft/abc", "/login", "/signup", "/invite/0123", "/join"]) {
      expect(isPoolCardHidden(path)).toBe(true);
    }
  });

  it("shows elsewhere", () => {
    for (const path of ["/", "/my-heroes", "/party", "/drafts", "/reports/1"]) expect(isPoolCardHidden(path)).toBe(false);
  });
});
