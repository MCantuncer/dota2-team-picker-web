import { describe, expect, it } from "vitest";
import { addLook, decodeLooks, encodeLooks, forgetHero, LOOKS_PER_HERO, MAX_LOOKS, type Look } from "./looks";
import { PATCH_H, PATCH_W, similarity } from "./match";

function unit(seed: number): Float32Array {
  const p = new Float32Array(PATCH_W * PATCH_H * 3).map((_, i) => Math.sin(i * 0.37 + seed) + Math.cos(i * 0.011 * seed));
  const norm = Math.hypot(...p);
  return p.map((v) => v / norm);
}
const look = (heroId: number, seed = heroId): Look => ({ heroId, patch: unit(seed), left: unit(seed + 0.5), colour: 40 + seed });

describe("looks", () => {
  it("survive storage as text, close enough to compare as before", () => {
    const [back] = decodeLooks(encodeLooks([look(76)]));
    expect(back!.heroId).toBe(76);
    expect(back!.colour).toBe(116);
    expect(similarity(back!.patch, look(76).patch)).toBeGreaterThan(0.9999);
    expect(similarity(back!.left, look(76).left)).toBeGreaterThan(0.9999);
  });

  it("skip anything malformed in storage", () => {
    expect(decodeLooks(null)).toEqual([]);
    expect(decodeLooks("not json")).toEqual([]);
    expect(decodeLooks('{"heroId":1}')).toEqual([]);
    const good = JSON.parse(encodeLooks([look(1)]));
    const short = { ...good[0], patch: { scale: 1, data: btoa("abcd") } };
    const badBase64 = { ...good[0], left: { scale: 1, data: "%%%" } };
    const noHero = { ...good[0], heroId: "Axe" };
    expect(decodeLooks(JSON.stringify([short, badBase64, noHero, null, good[0]])).map((l) => l.heroId)).toEqual([1]);
  });

  it("keep the newest few per hero and a cap in all", () => {
    let looks: Look[] = [];
    for (let i = 0; i < LOOKS_PER_HERO + 2; i++) looks = addLook(looks, look(76, 100 + i));
    expect(looks.map((l) => l.colour)).toEqual([144, 143, 142]);
    for (let id = 1; id <= MAX_LOOKS + 5; id++) looks = addLook(looks, look(id));
    expect(looks).toHaveLength(MAX_LOOKS);
    expect(looks[0]!.heroId).toBe(MAX_LOOKS + 5);
    expect(forgetHero(looks, MAX_LOOKS + 5).some((l) => l.heroId === MAX_LOOKS + 5)).toBe(false);
  });
});
