import { type PlayerRecord, RECORD_DAYS } from "./player-record";

/** What Your Games says first: the hero it shows, the finding as a title, short facts and one line of numbers. */
export interface GamesVerdict {
  /** The most played hero the title or the line names, or null when they name none. */
  heroId: number | null;
  title: string;
  facts: string;
  line: string;
}

/** How many of the newest games the line's recent form covers. */
const RECENT = 5;
const ABOUT = `What you do well and what costs you games, worked out from your ranked and normal games of the last ${RECORD_DAYS} days.`;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const day = (iso: string) => dateFormat.format(new Date(iso));
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sentence = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;

/**
 * Your Games' opening finding, from the player's record over the feedback window. The title is how many games they
 * won and how many of those on their most played hero; the line gives that hero's record, the newest five results
 * and how many games are fully read. With no games in the window it says so, and with no record (it could not be
 * read) it falls back to what the page is.
 */
export function gamesVerdict(record: PlayerRecord | null, name: (id: number) => string | undefined): GamesVerdict {
  const window = `Last ${RECORD_DAYS} days`;
  if (!record) return { heroId: null, title: "Your Ranked and Normal Games", facts: window, line: ABOUT };
  const { games, wins, parsed, latest } = record;
  if (!games) {
    return { heroId: null, title: latest.length ? `No Games in the Last ${RECORD_DAYS} Days` : "No Games Read Yet", facts: window, line: ABOUT };
  }

  const first = record.firstAt && day(record.firstAt);
  const last = record.lastAt && day(record.lastAt);
  const dates = first && last ? (first === last ? first : `${first} to ${last}`) : window;
  const facts = `${count(games, "game")}, ${dates}`;
  // A hero played once is not a most played hero: with several games it gets no mention and no picture.
  const top = record.topHero && (games === 1 || record.topHero.games > 1) ? record.topHero : null;
  const hero = top ? name(top.id) : undefined;

  if (games === 1) {
    return {
      heroId: hero && top ? top.id : null,
      title: `You ${wins ? "Won" : "Lost"} Your Only Game${hero ? `, on ${hero}` : ""}`,
      facts,
      line: parsed ? "The game has full detail." : "Its full detail is not read yet.",
    };
  }

  const onlyHero = top?.games === games;
  let title = `You Won ${wins} of ${games} Games`;
  if (hero && top) title += onlyHero ? `, All on ${hero}` : top.wins ? `, ${top.wins} on ${hero}` : "";

  const about: string[] = [];
  if (hero && top && !onlyHero) about.push(`${hero} is your most played hero, ${count(top.wins, "win")} in ${top.games} games.`);
  if (!top && record.topHero) about.push(`You played ${games} different heroes, one game each.`);
  const read = parsed === games ? `all ${games} games have full detail` : parsed ? `${parsed} of the ${games} games have full detail` : `none of the ${games} games has full detail yet`;
  // The newest five say how it is going now; with five games or fewer they are the title's own numbers.
  const recent = games > RECENT && latest.length >= RECENT ? latest.slice(0, RECENT) : null;
  about.push(recent ? `You won ${recent.filter(Boolean).length} of the last ${RECENT}, and ${read}.` : sentence(read));
  return { heroId: hero && top ? top.id : null, title, facts, line: about.join(" ") };
}
