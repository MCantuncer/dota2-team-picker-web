// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site has one segmented control, `.lane-seg` (docs/design-system.md, "Shared classes"). This test fails if the
 * older flat one (`.seg`, `.seg-item`, `.seg-sm`) comes back in a component or in the stylesheet.
 */
const SRC = join(__dirname, "..");
const OLD_SWITCH = /(?<![\w-])seg(?:-item|-sm)?(?![\w-])/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [path] : [];
  });
}

describe("one switch look", () => {
  it("has no old switch class in a component", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => (/["'`]/.test(line) && OLD_SWITCH.test(line) ? [`${relative(SRC, file)}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });

  it("has no old switch rule in the stylesheet", () => {
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    expect(css.split("\n").filter((line) => /(?<![\w-])\.seg(?:-item|-sm)?(?![\w-])/.test(line))).toEqual([]);
  });
});
