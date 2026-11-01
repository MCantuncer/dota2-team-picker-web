
/** Nicknames players type, mapped to hero names as the engine data spells them. */
const NICKNAMES: Record<string, string> = {
  am: "Anti-Mage", aa: "Ancient Apparition", bb: "Bristleback", bh: "Bounty Hunter", bs: "Bloodseeker",
  bm: "Beastmaster", cm: "Crystal Maiden", ck: "Chaos Knight", cent: "Centaur Warrunner", dk: "Dragon Knight",
  dp: "Death Prophet", ds: "Dark Seer", dw: "Dark Willow", db: "Dawnbreaker", es: "Earthshaker", et: "Elder Titan",
  fv: "Faceless Void", void: "Faceless Void", kotl: "Keeper of the Light", lc: "Legion Commander", ld: "Lone Druid",
  ls: "Lifestealer", mk: "Monkey King", np: "Nature's Prophet", furion: "Nature's Prophet", ns: "Night Stalker",
  od: "Outworld Devourer", pa: "Phantom Assassin", pl: "Phantom Lancer", qop: "Queen of Pain", sb: "Spirit Breaker",
  sd: "Shadow Demon", sf: "Shadow Fiend", ss: "Shadow Shaman", sk: "Sand King", ta: "Templar Assassin",
  tb: "Terrorblade", vs: "Vengeful Spirit", wd: "Witch Doctor", wk: "Wraith King", wr: "Windranger",
  ww: "Winter Wyvern", gyro: "Gyrocopter", clock: "Clockwerk", timber: "Timbersaw", treant: "Treant Protector",
  troll: "Troll Warlord", abba: "Abaddon", alch: "Alchemist", veno: "Venomancer", necro: "Necrophos",
  ogre: "Ogre Magi", omni: "Omniknight", ench: "Enchantress", brew: "Brewmaster", bat: "Batrider", lesh: "Leshrac",
  sky: "Skywrath Mage", tide: "Tidehunter", undy: "Undying", ember: "Ember Spirit", storm: "Storm Spirit",
};

const normalize = (s: string) => s.toLowerCase().replace(/-/g, " ").replace(/[^a-z0-9 ]/g, "");

/** Anything with a hero id and its English name. */
interface NamedHero {
  id: number;
  name: string;
}

interface Entry<H> {
  hero: H;
  full: string;
  words: string[];
  initials: string;
  nicknames: string[];
}

/**
 * Edit distance where swapping two neighbouring letters counts as one edit, as most typing slips do.
 * Stops early: anything above `max` is returned as `max + 1`.
 */
function typoDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(rows[i - 1][j] + 1, row[j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, rows[i - 2][j - 2] + 1);
      row.push(d);
    }
    if (Math.min(...row) > max) return max + 1;
    rows.push(row);
  }
  return rows[a.length][b.length];
}

/** Whether `typed` is the start of `name` with at most one slip (a wrong, missing, extra or swapped letter). */
function startsWithTypo(name: string, typed: string): boolean {
  return [-1, 0, 1].some((extra) => typoDistance(typed, name.slice(0, typed.length + extra), 1) <= 1);
}

/** Queries shorter than this never match with a typo: two letters with a slip could be almost any hero. */
const MIN_TYPO_LENGTH = 3;

/**
 * Finds heroes from two or three typed letters. Exact nicknames come first, then the start of the
 * name, its initials or a nickname, then the start of any word; ties go to the more picked hero.
 * Only when nothing matches does one typing slip count (`meduas` finds Medusa).
 */
export class HeroSearch<H extends NamedHero = NamedHero> {
  private entries: Entry<H>[];

  constructor(heroes: H[], private popularity: (id: number) => number = () => 0) {
    this.entries = heroes.map((hero) => {
      const words = normalize(hero.name).split(" ").filter(Boolean);
      return {
        hero,
        full: words.join(""),
        words,
        initials: words.length > 1 ? words.map((w) => w[0]).join("") : "",
        nicknames: Object.keys(NICKNAMES).filter((k) => NICKNAMES[k] === hero.name),
      };
    });
  }

  find(query: string, exclude: Set<number>, limit = 5): H[] {
    const q = normalize(query).replace(/ /g, "");
    if (!q) return [];
    const hits: { tier: number; pop: number; hero: H }[] = [];
    for (const e of this.entries) {
      if (exclude.has(e.hero.id)) continue;
      let tier: number | null = null;
      if (e.nicknames.includes(q)) tier = 0;
      else if (
        e.full.startsWith(q) ||
        (e.initials && e.initials.startsWith(q)) ||
        (q.length >= 2 && e.nicknames.some((n) => n.startsWith(q)))
      )
        tier = 1;
      else if (e.words.some((w) => w.startsWith(q))) tier = 2;
      if (tier !== null) hits.push({ tier, pop: this.popularity(e.hero.id), hero: e.hero });
    }
    if (!hits.length && q.length >= MIN_TYPO_LENGTH) {
      for (const e of this.entries) {
        if (exclude.has(e.hero.id)) continue;
        if ([e.full, ...e.words, ...e.nicknames].some((name) => startsWithTypo(name, q)))
          hits.push({ tier: 3, pop: this.popularity(e.hero.id), hero: e.hero });
      }
    }
    hits.sort((a, b) => a.tier - b.tier || b.pop - a.pop);
    return hits.slice(0, limit).map((h) => h.hero);
  }

  /** Whether the text is the start of a hero's full name, so `shadow fiend` is one hero and not two. */
  isNameStart(query: string): boolean {
    const q = normalize(query).replace(/ /g, "");
    return q.length > 0 && this.entries.some((e) => e.full.startsWith(q));
  }
}
