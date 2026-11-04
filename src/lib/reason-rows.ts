import type { ScoreBreakdown } from "@/lib/engine/types";

/** The score part a reason line explains, from how the engine words it. */
export type ReasonKind =
  | "Counters"
  | "Synergy"
  | "Meta"
  | "Team Needs"
  | "Flex"
  | "Pick Safety"
  | "Pick Order"
  | "Watch Out"
  | "Draft";

/** A reason line split for display: what it explains, the heroes it names, the line without its numbers, and their total. */
export interface ReasonRow {
  kind: ReasonKind;
  /** Heroes named in the line, in the order they appear. */
  heroIds: number[];
  text: string;
  /** Win-rate points the line gives, when it states them. */
  points: number | null;
  warn: boolean;
}

const KINDS: [RegExp, ReasonKind][] = [
  [/^Beats /, "Counters"],
  [/^Works with /, "Synergy"],
  [/^Adds what your team lacks: /, "Team Needs"],
  [/^Can also go /, "Flex"],
  [/^(Safer now|Hard to punish|Easy to punish)/, "Pick Safety"],
  [/^(Wins (more|less) as |Easy to counter-pick)/, "Pick Order"],
  [/(best \w[\w ]*?:|^Wins [\d.]+% of games|^Low win rate)/, "Meta"],
];

/** Which breakdown part stands in for the points of a line that states none, such as a win rate line. */
const PART: Partial<Record<ReasonKind, keyof ScoreBreakdown>> = {
  Meta: "meta",
};

/**
 * Splits an engine reason such as "Beats Lina (+2.2) and Pudge (+1.7, likely your lane)" into the heroes it names
 * (Lina, Pudge), the line without its numbers ("Beats Lina and Pudge (likely your lane)") and its total (+3.9).
 * The engine's wording stays the source of truth: a line it words in a new way still shows, as a Draft row.
 */
export function reasonRow(
  line: string,
  heroes: { id: number; name: string }[],
  breakdown?: ScoreBreakdown,
): ReasonRow {
  const warn = line.startsWith("Watch out");
  let text = warn ? line.replace(/^Watch out:\s*/, "") : line;
  text = text.charAt(0).toUpperCase() + text.slice(1);

  let kind: ReasonKind = warn ? "Watch Out" : "Draft";
  if (!warn) {
    const hit = KINDS.find(([re]) => re.test(text));
    if (hit) kind = hit[1];
  }
  if (kind === "Team Needs")
    text = text
      .replace(/^Adds what your team lacks: /, "")
      .replace(/^./, (c) => c.toUpperCase());

  // Points: every "(+2.2" or "(-0.9" in the line, summed. A note after a number ("likely your lane") stays beside
  // the hero it belongs to.
  const found = [...text.matchAll(/\(([+-]\d+(?:\.\d+)?)/g)].map((m) =>
    Number(m[1]),
  );
  text = text
    .replace(
      /\s*\(([+-]\d+(?:\.\d+)?)(?:,\s*([^)]*))?\)/g,
      (_, _n, note: string | undefined) => (note ? ` (${note})` : ""),
    )
    .trim();
  const part = PART[kind];
  const points = found.length
    ? round(found.reduce((s, x) => s + x, 0))
    : part && breakdown
      ? breakdown[part]
      : null;

  // Heroes: longest names first, so "Shadow Shaman" never matches as "Shadow" something else.
  const byLength = [...heroes].sort((a, b) => b.name.length - a.name.length);
  const at: { id: number; index: number }[] = [];
  let rest = text;
  for (const h of byLength) {
    const re = new RegExp(`\\b${escape(h.name)}\\b`);
    const m = re.exec(rest);
    if (m) {
      at.push({ id: h.id, index: m.index });
      rest =
        rest.slice(0, m.index) +
        " ".repeat(h.name.length) +
        rest.slice(m.index + h.name.length);
    }
  }
  const heroIds = at.sort((a, b) => a.index - b.index).map((x) => x.id);
  return { kind, heroIds, text, points, warn };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const round = (x: number) => Math.round(x * 10) / 10;
