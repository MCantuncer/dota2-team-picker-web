import { describe, expect, it } from "vitest";
import {
  MAX_RETRY_MS,
  MIN_RETRY_MS,
  readSimilarAnswer,
  similarRequest,
  similarRetryIn,
  type SimilarLookupAnswer,
} from "@/lib/similar-games";
import { GAME } from "@/lib/similar-games.sample";

const answer = (
  over: Partial<SimilarLookupAnswer> = {},
  pending = false,
): SimilarLookupAnswer => ({
  heroes: [{ hero: 74, level: 3, found: 140, games: [GAME], pending }],
  reasons: [],
  ...over,
});

describe("similarRequest", () => {
  it("asks for one of our heroes in a finished draft, enemies sorted", () => {
    expect(
      similarRequest([8, 74, 129, 128, 5], [44, 2, 26, 14, 11], 74),
    ).toEqual({
      ours: [8, 74, 129, 128, 5].map((hero, i) => ({ hero, position: i + 1 })),
      enemies: [2, 11, 14, 26, 44],
      heroes: [74],
    });
  });

  it("asks nothing for an unfinished draft or a hero not ours", () => {
    expect(
      similarRequest([8, null, 129, 128, 5], [44, 2, 26, 14, 11], 8),
    ).toBeNull();
    expect(similarRequest([8, 74, 129, 128, 5], [44, 2, 26, 14], 8)).toBeNull();
    expect(
      similarRequest([8, 74, 129, 128, 5], [44, 2, 26, 14, 11], 44),
    ).toBeNull();
  });
});

describe("readSimilarAnswer", () => {
  it("reads a whole answer", () => {
    const a = answer({ reasons: ["stratz-busy"], retryIn: 90 }, true);
    expect(readSimilarAnswer(JSON.parse(JSON.stringify(a)))).toEqual(a);
  });

  it("refuses any answer with a field off, never a part of it", () => {
    const off = (game: object) =>
      answer({
        heroes: [
          {
            hero: 74,
            level: 3,
            found: 1,
            games: [{ ...GAME, ...game }],
            pending: false,
          },
        ],
      });
    expect(readSimilarAnswer(null)).toBeNull();
    expect(readSimilarAnswer({ heroes: [] })).toBeNull();
    expect(
      readSimilarAnswer(answer({ reasons: ["other" as never] })),
    ).toBeNull();
    expect(readSimilarAnswer(off({ won: "yes" }))).toBeNull();
    expect(readSimilarAnswer(off({ position: 6 }))).toBeNull();
    expect(readSimilarAnswer(off({ lane: "top" }))).toBeNull();
    expect(readSimilarAnswer(off({ buys: [[717]] }))).toBeNull();
    expect(readSimilarAnswer(off({ deathsAt: [[349, 0]] }))).toBeNull();
    expect(
      readSimilarAnswer(off({ enemies: GAME.enemies.slice(1) })),
    ).toBeNull();
    expect(readSimilarAnswer(answer({ retryIn: -1 }))).toBeNull();
  });
});

describe("similarRetryIn", () => {
  it("asks again while the hero's games are pending, at the time given", () => {
    expect(similarRetryIn(answer({ retryIn: 90 }, true), 74)).toBe(90_000);
    expect(similarRetryIn(answer({ reasons: ["time"] }, true), 74)).toBe(
      MIN_RETRY_MS,
    );
    expect(
      similarRetryIn(answer({ retryIn: MAX_RETRY_MS / 1000 + 1 }, true), 74),
    ).toBeNull();
  });

  it("asks again while another browser searches the same draft", () => {
    expect(
      similarRetryIn(
        { heroes: [], reasons: ["searching-elsewhere"], retryIn: 10 },
        74,
      ),
    ).toBe(10_000);
  });

  it("stops when nothing is pending or a limit or failure stopped it", () => {
    expect(similarRetryIn(answer(), 74)).toBeNull();
    expect(
      similarRetryIn(answer({ reasons: ["user-limit"] }, true), 74),
    ).toBeNull();
    expect(
      similarRetryIn(answer({ reasons: ["budget"] }, true), 74),
    ).toBeNull();
    expect(
      similarRetryIn(answer({ reasons: ["failed"] }, true), 74),
    ).toBeNull();
  });
});
