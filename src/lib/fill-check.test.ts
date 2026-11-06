import { describe, expect, it } from "vitest";
import { readFillReport, strongText, verdictText } from "./fill-check";
import { sampleReport } from "./fill-check.sample";

describe("readFillReport", () => {
  it("reads the dry run's answer", () => {
    expect(readFillReport(sampleReport())?.fill.picks[0]?.heroId).toBe(94);
  });

  it("refuses an answer of the wrong shape", () => {
    expect(readFillReport(null)).toBeNull();
    expect(readFillReport({ error: "Admins only" })).toBeNull();
    expect(readFillReport({ ...sampleReport(), verdict: "maybe" })).toBeNull();
    const badPick = sampleReport();
    badPick.fill.picks[0]!.games = "55" as unknown as number;
    expect(readFillReport(badPick)).toBeNull();
    const badStatus = sampleReport();
    badStatus.sources.stratz.status = "odd";
    expect(readFillReport(badStatus)).toBeNull();
  });
});

describe("verdictText", () => {
  it("says go or back to Can with the positioned share", () => {
    const report = readFillReport(sampleReport())!;
    expect(verdictText(report)).toBe("Go: 92% of games have a position, at least the 70% the rules need.");
    expect(verdictText({ ...report, verdict: "back_to_can", coverage: { ...report.coverage, positionedShare: 0.4 } })).toBe(
      "Back to Can: only 40% of games have a position, under the 70% the rules need.",
    );
  });
});

describe("strongText", () => {
  it("counts strong games, or says none", () => {
    expect(strongText({ judged: 20, strong: 14 })).toBe("14 of 20 (70%)");
    expect(strongText({ judged: 0, strong: 0 })).toBe("none");
  });
});
