import type { ScoreBreakdown, Suggestion } from "@/lib/engine/types";
import type { Verdict } from "@/lib/engine/verdict";

/*
 * The words on a My Picks card, as lines that each lead with their number. The engine writes a suggestion's reasons
 * as sentences with the points in brackets ("Beats Lina (+2.2) and Pudge (+1.7, likely your lane)"); a card shows
 * them number first, one hero per line, with a face before every hero a line names.
 */

/** What a line is about, for its icon. */
export type PickLineKind =
  | "counter"
  | "synergy"
  | "need"
  | "safety"
  | "flex"
  | "phase"
  | "winRate"
  | "comfort"
  | "risk"
  | "safe"
  | "other";

export interface PickLine {
  kind: PickLineKind;
  /** The number the line leads with ("+1.6", "-6.7", "51.8%"), or "" for a line without one. */
  lead: string;
  /** The words after the number, starting lower case. */
  text: string;
  /** Every hero the text names, in the order it names them, for faces. */
  heroes: number[];
  /** A risk: the line sits on the amber band. */
  isWarn: boolean;
}

/** A hero's id and name, to find the heroes a line names. */
export interface NamedHero {
  id: number;
  name: string;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const round1 = (x: number) => Math.round(x * 10) / 10;
/** "+1.6" or "-0.4", as the engine writes points. */
const points = (x: number) => `${x < 0 ? "-" : "+"}${Math.abs(x).toFixed(1)}`;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The heroes named in `text`, in order. Longer names win, so "Shadow Shaman" never reads as a shorter name. */
export function namedHeroes(text: string, heroes: readonly NamedHero[]): number[] {
  if (!heroes.length) return [];
  const byLength = [...heroes].sort((a, b) => b.name.length - a.name.length);
  const re = new RegExp(`(?<![\\w'])(${byLength.map((h) => escape(h.name)).join("|")})(?![\\w'])`, "g");
  const ids: number[] = [];
  for (const m of text.matchAll(re)) {
    const hero = heroes.find((h) => h.name === m[1]);
    if (hero) ids.push(hero.id);
  }
  return ids;
}

const KINDS: [RegExp, PickLineKind][] = [
  [/^adds what/i, "need"],
  [/punish|^safer now/i, "safety"],
  [/^can also go/i, "flex"],
  [/^wins (more|less) as|counter-pick/i, "phase"],
  [/win rate|^rarely played/i, "winRate"],
];

/** One engine reason as lines: one per hero for a counter or synergy line, else one. */
function reasonToLines(raw: string, heroes: readonly NamedHero[]): PickLine[] {
  const isWarn = /^Watch out:/i.test(raw);
  const line = raw.replace(/^Watch out:\s*/i, "");

  // "Beats Lina (+2.2) and Pudge (+1.7, likely your lane)": one line per hero, each with its own number.
  const each = /^(Beats|Works with|Loses to) (.+)$/i.exec(line);
  if (each) {
    const isWith = /^works/i.test(each[1]!);
    const word = isWith ? "with" : "against";
    const out: PickLine[] = [];
    for (const m of each[2]!.matchAll(/(?:^|,\s*|\s+and\s+)(.+?) \(([+-]\d+(?:\.\d+)?)(?:,\s*([^)]*))?\)/g)) {
      const name = m[1]!.trim();
      out.push({
        kind: isWith ? "synergy" : isWarn ? "risk" : "counter",
        lead: m[2]!,
        text: `${word} ${name}${m[3] ? ` (${m[3]})` : ""}`,
        heroes: namedHeroes(name, heroes),
        isWarn,
      });
    }
    if (out.length) return out;
  }

  // "7th best mid at Divine: 51.8% win rate": the win rate first.
  const best = /^(?:(\d+\w\w) best|Best) ([\w ]+?)(?: at (\w+))?: ([\d.]+%) win rate$/i.exec(line);
  if (best) {
    const where = best[3] ? ` at ${best[3]}` : "";
    const place = best[1] ? `${best[1]} best ${best[2]}` : `best ${best[2]}`;
    return [{ kind: "winRate", lead: best[4]!, text: `win rate${where}, ${place}`, heroes: [], isWarn }];
  }
  const wins = /^Wins ([\d.]+%) of games(?: at (\w+))?$/i.exec(line);
  if (wins) return [{ kind: "winRate", lead: wins[1]!, text: `win rate${wins[2] ? ` at ${wins[2]}` : ""}`, heroes: [], isWarn }];
  const low = /^low win rate right now: ([\d.]+%)(?: at (\w+))?$/i.exec(line);
  if (low) {
    return [{ kind: "winRate", lead: low[1]!, text: `win rate${low[2] ? ` at ${low[2]}` : ""}, low right now`, heroes: [], isWarn }];
  }

  // Any other line: its points (summed when it has several) first, then its words without them.
  const found = [...line.matchAll(/\(([+-]\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  const text = line
    .replace(/\s*\(([+-]\d+(?:\.\d+)?)(?:,\s*([^)]*))?\)/g, (_m, _n, note?: string) => (note ? ` (${note})` : ""))
    .trim();
  const kind = isWarn ? "risk" : (KINDS.find(([re]) => re.test(text))?.[1] ?? "other");
  return [
    {
      kind: isWarn ? "risk" : kind,
      lead: found.length ? points(round1(found.reduce((a, b) => a + b, 0))) : "",
      text: lower(text),
      heroes: namedHeroes(text, heroes),
      isWarn,
    },
  ];
}

/** A tag such as "Favorite (+1.5)" as a line: the points first, then what it means. */
function tagToLine(tag: string, owner?: string): PickLine | null {
  const m = /^(.+?) \(([+-][\d.]+)\)$/.exec(tag);
  if (!m) return null;
  const whose = owner ? `${owner}'s` : "your";
  const record = /^Your record (\d+-\d+)$/.exec(m[1]!);
  const text =
    m[1] === "Favorite"
      ? `one of ${whose} heroes for this position`
      : m[1] === "Top 5"
        ? `in ${whose} Top 5 for this position`
        : record
          ? `${whose} record on this hero (${record[1]})`
          : lower(m[1]!);
  return { kind: "comfort", lead: m[2]!, text, heroes: [], isWarn: false };
}

/**
 * Every line on a card: the engine's reasons, its tags, then its hard counters (the points each would cost while the
 * enemy can still take it or has it, and the ones that are out of play). Risks come last; the engine's order holds
 * inside each group.
 */
export function reasonLines(
  s: Pick<Suggestion, "reasons" | "tags" | "hardCounters">,
  heroes: readonly NamedHero[],
  owner?: string,
): PickLine[] {
  const out: PickLine[] = s.reasons.flatMap((r) => reasonToLines(r, heroes));
  for (const t of s.tags) {
    const line = tagToLine(t, owner);
    if (line) out.push(line);
  }
  for (const n of s.hardCounters) {
    const name = heroes.find((h) => h.id === n.counterId)?.name ?? "";
    if (n.status === "out") {
      // "Slark is out, safe to pick": it starts with the name, so it keeps its capital.
      out.push({ kind: "safe", lead: "", text: n.text, heroes: name ? [n.counterId] : [], isWarn: false });
      continue;
    }
    out.push({
      kind: "risk",
      lead: `-${n.gap.toFixed(1)}`,
      text: n.status === "open" ? `if they pick ${name}, a hard counter still open` : `with ${name} on their team, a hard counter`,
      heroes: name ? [n.counterId] : [],
      isWarn: true,
    });
  }
  return [...out.filter((l) => !l.isWarn), ...out.filter((l) => l.isWarn)];
}

/**
 * A hero's verdict as one line, the number first: "5.8 points ahead of Ember Spirit, more than the 2.9 the data could
 * be off by" or, under the best pick, "5.8 points behind Invoker: 2.9 worse against Shadow Fiend".
 */
export function verdictLine(verdict: Verdict, leader: string | undefined, heroes: readonly NamedHero[]): Omit<PickLine, "kind" | "isWarn"> {
  const text = (leader ? verdict.text.replace(/^([\d.]+ points behind):/, `$1 ${leader}:`) : verdict.text).replace(/\.$/, "");
  const m = /^([\d.]+ points)(.*)$/.exec(text);
  const words = m ? m[2]!.trim() : text;
  return { lead: m ? m[1]! : "", text: words, heroes: namedHeroes(words, heroes) };
}

/** Where a score comes from: this draft (counters, synergy, team needs, pick safety), or meta, role and comfort. */
export function scoreSplit(b: ScoreBreakdown): { draft: number; base: number } {
  return { draft: b.counter + b.synergy + b.teamNeeds + b.pickSafety, base: b.meta + b.positionFit + b.comfort + b.flex };
}

export const SCORE_PART_NAMES: Record<keyof ScoreBreakdown, string> = {
  positionFit: "Role Fit",
  counter: "Counters",
  synergy: "Synergy",
  meta: "Meta",
  teamNeeds: "Team Needs",
  comfort: "Comfort",
  flex: "Flex",
  pickSafety: "Pick Safety",
};

/** The parts of a score worth a bar (0.1 or more either way), biggest first. */
export function scoreParts(b: ScoreBreakdown): { key: keyof ScoreBreakdown; name: string; value: number }[] {
  return (Object.keys(SCORE_PART_NAMES) as (keyof ScoreBreakdown)[])
    .map((key) => ({ key, name: SCORE_PART_NAMES[key], value: b[key] }))
    .filter((p) => Math.abs(p.value) >= 0.05)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
