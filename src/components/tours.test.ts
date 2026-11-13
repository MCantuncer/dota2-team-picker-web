import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOURS } from "./tours";

/** Every source file's text, so a step's mark can be found wherever its control lives. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== "tours.tsx" ? [readFileSync(path, "utf8")] : [];
  });
}

describe("TOURS", () => {
  const code = sources(join(process.cwd(), "src")).join("\n");

  // A renamed or removed control would silently drop its step; this catches it in review instead.
  it.each(Object.entries(TOURS).flatMap(([tour, steps]) => steps.map((s) => [tour, s.target] as const)))(
    "%s step %s has a data-tour mark in the code",
    (_tour, target) => {
      expect(code).toContain(`"${target}"`);
    },
  );

  it.each(Object.keys(TOURS))("the %s tour has a ? button on its page", (tour) => {
    expect(code).toContain(`<PageTour tour="${tour}"`);
  });
});
