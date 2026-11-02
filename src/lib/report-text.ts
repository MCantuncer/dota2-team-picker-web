/**
 * The sentences of a post-game report, filled in from its facts. Templates, not written text:
 * every number comes straight from the facts, so a sentence is never wrong about the game.
 * Hero names come in through `name`, so this stays free of data loading.
 */
import type { DamageSource, DraftPickFact, EnemyBest, Facts, FightFact, HeroCard, LaneResult, Swing } from "./report-facts";

export type HeroName = (heroId: number) => string;

/** Benchmarks at or above this beat most players of the hero; at or below, most beat them. */
const STRONG_PCT = 70;
const WEAK_PCT = 30;
/** Deaths in the first 10 minutes worth a line. */
const EARLY_DEATHS = 3;

const MINUS = "−";

/** `34:26` from seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Gold or damage: `850`, `4.3k`, `12k`. */
export function amount(n: number): string {
  const a = Math.abs(n);
  if (a < 1000) return String(Math.round(a));
  const k = a / 1000;
  return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
}

/** An amount with its sign and a real minus sign: `+4.3k`, `−850`. */
export function signedAmount(n: number): string {
  return `${n < 0 ? MINUS : "+"}${amount(n)}`;
}

/** `33%` from a 0 to 1 share. */
const percent = (share: number) => `${Math.round(share * 100)}%`;

const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** The first line: result, length and score. */
export function headline(f: Facts): string {
  return `${f.won ? "Won" : "Lost"} in ${clock(f.durationS)}, ${f.score.ours} to ${f.score.theirs} in kills.`;
}

/** One of the biggest gold swings. */
export function swingLine(s: Swing): string {
  const side = s.change >= 0 ? "your way" : "their way";
  return `Minutes ${s.fromMinute} to ${s.toMinute}: ${amount(s.change)} gold swung ${side}.`;
}

/** A lane at 10 minutes. */
export function laneLine(l: LaneResult, name: HeroName): string {
  const lane = `${l.lane[0].toUpperCase()}${l.lane.slice(1)}`;
  const who = list(l.ourHeroes.map(name));
  if (Math.abs(l.netWorthDiff) < 300) return `${lane} (${who}): even at 10 minutes.`;
  const state = l.netWorthDiff > 0 ? "ahead" : "behind";
  return `${lane} (${who}): ${amount(l.netWorthDiff)} net worth ${state} at 10 minutes.`;
}

/** What stood out for one of our heroes, best first. Empty when nothing did. */
export function heroNotes(h: HeroCard): string[] {
  const notes: string[] = [];
  if (h.abandoned) notes.push("Left the game.");
  const b = h.benchmarks;
  if (b) {
    if (b.goldPerMin >= STRONG_PCT) notes.push(`Farm faster than ${b.goldPerMin}% of players on this hero.`);
    if (b.heroDamagePerMin >= STRONG_PCT) notes.push(`More hero damage than ${b.heroDamagePerMin}% of players on this hero.`);
    if (b.goldPerMin <= WEAK_PCT) notes.push(`Farm slower than ${100 - b.goldPerMin}% of players on this hero.`);
  }
  if (h.deathsBefore10 !== null && h.deathsBefore10 >= EARLY_DEATHS) {
    notes.push(`Died ${h.deathsBefore10} times before 10 minutes.`);
  }
  if (h.goldLostToDeaths !== null && h.secondsDead !== null && h.goldLostToDeaths >= 2000) {
    notes.push(`Deaths cost ${amount(h.goldLostToDeaths)} gold and ${clock(h.secondsDead)} dead.`);
  }
  return notes;
}

/** One of the key fights. */
export function fightLine(fight: FightFact, name: HeroName): string {
  const result = fight.goldSwing >= 0 ? "won" : "lost";
  const line = `Minute ${fight.startMinute}: fight ${result}, ${fight.theirDeaths} to ${fight.ourDeaths} in deaths, ${
    signedAmount(fight.goldSwing)
  } gold.`;
  return fight.missingHeroes.length ? `${line} Not in it: ${list(fight.missingHeroes.map(name))}.` : line;
}

/** What hurt us most, like "Right-clicks: 33% of the damage you took." */
export function damageLine(d: DamageSource): string {
  return `${d.source === "attacks" ? "Right-clicks" : sourceName(d.source)}: ${percent(d.share)} of the damage you took.`;
}

/** An ability or item key in words: `bloodseeker_blood_bath` becomes "Bloodseeker blood bath". */
export function sourceName(key: string): string {
  const words = key.replace(/^item_/, "").split("_").filter(Boolean).join(" ");
  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : key;
}

/** The enemy hero who got furthest ahead. */
export function enemyBestLine(e: EnemyBest, name: HeroName): string {
  return `Their strongest hero: ${name(e.heroId)}, ${e.kills}/${e.deaths}/${e.assists} with ${amount(e.netWorth)} net worth.`;
}

/** One pick against the list its player was shown. */
export function draftLine(d: DraftPickFact, name: HeroName): string {
  if (d.listSize === 0) return `${name(d.heroId)}: no suggestions saved for this pick.`;
  if (d.suggestionRank === null) return `${name(d.heroId)}: not in the ${d.listSize} suggestions.`;
  return `${name(d.heroId)}: suggestion ${d.suggestionRank} of ${d.listSize}.`;
}
