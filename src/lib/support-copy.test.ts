import { describe, expect, it } from "vitest";
import { NO_SUPPORT_COPY, readSupportCopy, readSupportLists, supportAddedByAnswer, supportCopyNote } from "./support-copy";

describe("readSupportCopy", () => {
  it("reads on with its source, and off", () => {
    expect(readSupportCopy("on", 4)).toEqual({ state: "on", from: 4 });
    expect(readSupportCopy("off", null)).toEqual({ state: "off", from: null });
  });

  it("reads anything odd as never started", () => {
    expect(readSupportCopy(null, null)).toEqual(NO_SUPPORT_COPY);
    expect(readSupportCopy("on", 3)).toEqual(NO_SUPPORT_COPY);
  });
});

describe("readSupportLists", () => {
  it("reads both lists and the copy state", () => {
    expect(readSupportLists({ heroes: { "4": [14, 50], "5": [14] }, support_copy: "on", support_copy_from: 4 })).toEqual({
      copy: { state: "on", from: 4 },
      heroes: { 4: [14, 50], 5: [14] },
    });
  });

  it("refuses an answer of the wrong shape", () => {
    expect(readSupportLists(null)).toBeNull();
    expect(readSupportLists({ heroes: { "4": [14] } })).toBeNull();
    expect(readSupportLists({ heroes: { "4": ["14"], "5": [] } })).toBeNull();
  });
});

describe("supportCopyNote", () => {
  const on = { state: "on", from: 4 } as const;

  it("tells the source list where its heroes go", () => {
    expect(supportCopyNote(on, 4)).toBe("Hard Support gets the same heroes. Change Hard Support any time to make it its own list.");
  });

  it("tells the other list where its heroes come from", () => {
    expect(supportCopyNote(on, 5)).toBe("Copied from Soft Support. Change this list any time to make it its own.");
  });

  it("says nothing on other positions or when copying is not on", () => {
    expect(supportCopyNote(on, 1)).toBeNull();
    expect(supportCopyNote({ state: "off", from: null }, 4)).toBeNull();
    expect(supportCopyNote(NO_SUPPORT_COPY, 5)).toBeNull();
  });
});

describe("supportAddedByAnswer", () => {
  const on = { state: "on", from: 4 } as const;

  it("starts copying when the Yes is the first support hero", () => {
    expect(supportAddedByAnswer(NO_SUPPORT_COPY, { 4: [], 5: [] }, 5, 26)).toEqual({ copy: { state: "on", from: 5 }, heroes: { 4: [26], 5: [26] } });
  });

  it("never starts once a support list has heroes", () => {
    expect(supportAddedByAnswer(NO_SUPPORT_COPY, { 4: [], 5: [14] }, 5, 26)).toEqual({ copy: { state: "off", from: null }, heroes: { 4: [], 5: [14, 26] } });
  });

  it("copies a Yes on the source list and stops on the other list", () => {
    expect(supportAddedByAnswer(on, { 4: [14], 5: [14] }, 4, 50)).toEqual({ copy: on, heroes: { 4: [14, 50], 5: [14, 50] } });
    expect(supportAddedByAnswer(on, { 4: [14], 5: [14] }, 5, 50)).toEqual({ copy: { state: "off", from: null }, heroes: { 4: [14], 5: [14, 50] } });
  });

  it("changes nothing for other positions or a hero already listed", () => {
    const lists = { 4: [14], 5: [14] };
    expect(supportAddedByAnswer(on, lists, 1, 50)).toEqual({ copy: on, heroes: lists });
    expect(supportAddedByAnswer(on, lists, 5, 14)).toEqual({ copy: on, heroes: lists });
  });
});
