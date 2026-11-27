// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site has one corner scale: 12px panels, cards and menus (`rounded-xl`), 8px buttons, fields and tiles
 * (`rounded-lg`), 6px chips, badges, icons and anything else that holds text or art (`rounded-md`), and 2px
 * (`rounded-xs`) for marks only: bars, ticks, legend squares. See docs/design-system.md, "Corners". This test fails
 * if a corner outside the scale comes back.
 */
const SRC = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [path] : [];
  });
}

/** A corner class with an optional side (`rounded-t-md`), and the size it names: none for a bare `rounded`. */
const CORNER_CLASS = /(?<![\w-])rounded(?:-(?:[trbl]|[tb][lr]|[se]|[se]{2}))?(?:-(\[[^\]]+\]|[\w.]+))?(?![\w-])/g;
const SCALE = new Set(["xs", "md", "lg", "xl", "full", "none"]);

/** Radii the stylesheet may set: the scale, the round ends of dots and avatars, and the hero frame's own corner. */
const STYLESHEET_RADII = new Set(["2px", "0.375rem", "0.5rem", "0.75rem", "9999px", "inherit", "var(--cut-radius)"]);

describe("corner scale", () => {
  it("has no corner class outside the scale", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => {
          // A class sits in a string; "rounded" in a comment or a sentence is a word.
          if (!/["'`]/.test(line)) return [];
          const sizes = [...line.matchAll(CORNER_CLASS)].map((match) => match[1] ?? "bare");
          return sizes.some((size) => !SCALE.has(size)) ? [`${relative(SRC, file)}:${i + 1}`] : [];
        }),
    );
    expect(offenders).toEqual([]);
  });

  it("has only the scale's corners in the stylesheet", () => {
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    const radii = [...css.matchAll(/border-radius:\s*([^;]+);/g)].flatMap((match) => (match[1] ?? "").trim().split(/\s+(?![^(]*\))/));
    expect(radii.filter((radius) => radius !== "0" && !STYLESHEET_RADII.has(radius))).toEqual([]);
  });
});
