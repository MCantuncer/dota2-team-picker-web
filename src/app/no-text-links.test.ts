// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site has no underlined text links: every link is a button, a ghost button with the out arrow, or a whole
 * clickable row (`.row-link`). See docs/design-system.md, "Links". This test fails if one comes back.
 */
const SRC = join(__dirname, "..");

/** Underlines that are not links: the talent tree marks this game's talent pick with one. */
const ALLOWED = new Set(["components/skill-plan-card.tsx"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** A class list that underlines text, or uses the removed `.link` text link style. */
const TEXT_LINK = /className=\{?["`][^"`]*(?<![\w-])(link|underline|hover:underline)(?![\w-])/;

describe("text links", () => {
  it("are not used anywhere on the site", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !ALLOWED.has(relative(SRC, file)))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .flatMap((line, i) => (TEXT_LINK.test(line) ? [`${relative(SRC, file)}:${i + 1}`] : [])),
      );
    expect(offenders).toEqual([]);
  });

  it("have no style left in the design system", () => {
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    expect(css).not.toMatch(/^\s*\.link\b/m);
    expect(css).not.toMatch(/text-decoration:\s*underline/);
  });
});
