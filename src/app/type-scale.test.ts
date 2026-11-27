// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site has one type scale of six sizes: 12, 14, 16, 20, 28 and 40 px (`text-xs` to `text-2xl`, set in
 * globals.css). See docs/design-system.md, "Type". This test fails if a size outside the scale comes back.
 */
const SRC = join(__dirname, "..");

/** The scale, in px. */
const SCALE_PX = [12, 14, 16, 20, 28, 40];
const SCALE_REM = new Set(SCALE_PX.map((px) => `${px / 16}rem`));

/** Files that compute a size at run time: the avatar's initial grows with the avatar, FitLine shrinks a line to fit. */
const COMPUTED = new Set(["components/account-menu.tsx", "components/fit-line.tsx"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** A text size class that is not on the scale: an arbitrary length (`text-[13px]`) or a cleared Tailwind size. */
const OFF_SCALE_CLASS = /(?<![\w-])text-(\[\d[\d.]*(px|rem|em)\]|[3-9]xl)(?![\w-])/;

/** A size set in code, such as `fontSize={13}` on SVG text or `fontSize: "13px"` in a style. */
const CODE_SIZE = /fontSize\s*[=:]\s*\{?\s*["']?(\d[\d.]*)(px)?["']?/;

function offenders(isOffScale: (line: string) => boolean, skip: Set<string> = new Set()): string[] {
  return sourceFiles(SRC)
    .filter((file) => !skip.has(relative(SRC, file)))
    .flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => (isOffScale(line) ? [`${relative(SRC, file)}:${i + 1}`] : [])),
    );
}

describe("type scale", () => {
  it("has no text size class outside the six sizes", () => {
    expect(offenders((line) => OFF_SCALE_CLASS.test(line))).toEqual([]);
  });

  it("has no size set in code outside the six sizes", () => {
    const isOffScale = (line: string) => {
      const size = CODE_SIZE.exec(line)?.[1];
      return size !== undefined && !SCALE_PX.includes(Number(size));
    };
    expect(offenders(isOffScale, COMPUTED)).toEqual([]);
  });

  it("has only the six sizes in the stylesheet", () => {
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    const sizes = [...css.matchAll(/(?:font-size|--text-[\w]+):\s*([^;]+);/g)].map((match) => (match[1] ?? "").trim());
    expect(sizes.filter((size) => !SCALE_REM.has(size))).toEqual([]);
  });
});
