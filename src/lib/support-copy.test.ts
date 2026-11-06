import { describe, expect, it } from "vitest";
import { NO_SUPPORT_COPY, readSupportCopy, readSupportLists, supportCopyNote } from "./support-copy";

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
    expect(supportCopyNote(on, 4)).toBe("Pos 5 gets the same heroes. Change Pos 5 any time to make it its own list.");
  });

  it("tells the other list where its heroes come from", () => {
    expect(supportCopyNote(on, 5)).toBe("Copied from Pos 4. Change this list any time to make it its own.");
  });

  it("says nothing on other positions or when copying is not on", () => {
    expect(supportCopyNote(on, 1)).toBeNull();
    expect(supportCopyNote({ state: "off", from: null }, 4)).toBeNull();
    expect(supportCopyNote(NO_SUPPORT_COPY, 5)).toBeNull();
  });
});
