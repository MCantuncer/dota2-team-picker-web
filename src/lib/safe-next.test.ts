import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/profile")).toBe("/profile");
    expect(safeNext("/join/abc?x=1")).toBe("/join/abc?x=1");
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["empty", ""],
    ["another site", "https://evil.example"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["relative path", "profile"],
  ])("sends %s values home", (_, next) => {
    expect(safeNext(next)).toBe("/");
  });
});
