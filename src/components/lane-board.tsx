import type { LanePlan, LaneVerdict, PairTactics, PlayerPlan } from "@/lib/engine/game-plan";
import type { PairLane } from "@/lib/engine/lane-odds";
import { HeroArt, HeroStage, type HeroArtPlacement } from "./hero-frame";
import { PositionLabel } from "./position-label";

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id: faces are cropped from them and renders found from them. */
  icons: Record<number, string>;
}

/** The enemy positions in each lane, in the order the plan lists the lane's enemies (game-plan.ts LANES). */
export const ENEMY_POSITIONS: Record<string, number[]> = { "Safe lane": [3, 4], Mid: [2], "Off lane": [1, 5] };
export const LANE_TITLES: Record<string, string> = { "Safe lane": "Safe Lane", Mid: "Mid", "Off lane": "Off Lane" };
export const VERDICT_WORDS: Record<LaneVerdict, string> = { win: "Won", even: "Even", hard: "Hard" };
export const VERDICT_CHIPS: Record<LaneVerdict, string> = { win: "bg-radiant-tint text-radiant", even: "bg-raised text-muted", hard: "bg-dire-tint text-dire" };

/** One placement for both versus frames, so the two faces meet at the same height and scale. */
const VERSUS_ART: HeroArtPlacement = { width: 300, at: [0.5, 0.42] };

/** The pair the player meets most: their hero against the enemy most likely in the lane (the highest weight). */
export function playerPair(lane: LanePlan, heroId: number): (PairLane & { weight: number }) | undefined {
  return (lane.pairs ?? []).filter((p) => p.hero === heroId).reduce<(PairLane & { weight: number }) | undefined>((best, p) => (!best || p.weight > best.weight ? p : best), undefined);
}

/**
 * The player's "No X by N min?" line, when their key item has a late minute: the Game Clock's checkpoint flag says it
 * for the viewer, so their Game Story line leaves it out.
 */
export function keyItemLateLine(player: PlayerPlan): string | undefined {
  if (player.keyItem?.lateMinute === undefined) return undefined;
  return player.fallbacks[player.fallbackSituations?.indexOf("keyItemLate") ?? -1];
}

const pct = (n: number, of: number) => Math.round((n / of) * 100);

/**
 * The player's part of the game after the lane: their job (their timing item) and the measured fallback when it is
 * late. The viewer's own late line is the Game Clock's checkpoint flag, so it is left out here for them.
 */
export function PlayerLine({ player, onClock = false }: { player: PlayerPlan; onClock?: boolean }) {
  const clockLine = onClock ? keyItemLateLine(player) : undefined;
  const fallbacks = player.fallbacks.filter((line) => line !== clockLine);
  if (!player.job && !fallbacks.length) return null;
  return (
    <div className="flex max-w-[62ch] flex-col gap-3">
      {player.job && <p className="text-[0.9375rem] text-fg">{player.job}</p>}
      {fallbacks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-sm font-medium text-muted">If It Goes Wrong</h4>
          <ul className="flex flex-col gap-1 text-sm text-fg/85">
            {fallbacks.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The player's lane tactics against each enemy laner, the enemy they meet most first (the pair weights). */
export function playerTactics(lane: LanePlan, heroId: number): PairTactics[] {
  const weight = (enemy: number) => lane.pairs?.find((p) => p.hero === heroId && p.enemy === enemy)?.weight ?? 0;
  return (lane.tactics ?? []).filter((t) => t.hero === heroId && t.tactics.length > 0).sort((a, b) => weight(b.enemy) - weight(a.enemy));
}

/** A hero's render in a Lane Cut frame, ours facing right and the enemy mirrored, with the name and role under it. */
export function Versus({ heroId, position, side, heroName, icons }: Art & { heroId: number; position?: number; side: "ours" | "theirs" }) {
  const enemy = side === "theirs";
  const portrait = icons[heroId];
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${enemy ? "items-end text-right" : ""}`}>
      <HeroStage size={120} isEnemy={enemy} className={`relative block aspect-[3/2] w-full max-w-72 overflow-hidden ${enemy ? "" : "lane-cut-you"}`}>
        {portrait && <HeroArt heroId={heroId} portrait={portrait} placement={VERSUS_ART} mirror={enemy} />}
      </HeroStage>
      <span className="flex flex-col gap-0.5">
        <b className="text-base font-semibold text-fg">{heroName(heroId)}</b>
        {position !== undefined && (
          <span className={`flex items-center gap-1.5 text-[0.8125rem] text-muted ${enemy ? "justify-end" : ""}`}>
            {enemy && "Enemy"}
            <PositionLabel position={position} size={14} iconClassName={enemy ? "text-dire" : "text-radiant"} />
          </span>
        )}
      </span>
    </div>
  );
}

/** The pair's lane results: won, even and lost as one bar, the shares big, and how many lanes they come from. */
export function PairBar({ pair, heroName }: { pair: PairLane; heroName: (id: number) => string }) {
  const parts = [
    { key: "won", share: pct(pair.won, pair.games), label: `${heroName(pair.hero)} Won`, bar: "bg-radiant", text: "text-radiant" },
    { key: "even", share: pct(pair.drawn, pair.games), label: "Even", bar: "bg-line-control", text: "text-fg" },
    { key: "lost", share: pct(pair.lost, pair.games), label: `${heroName(pair.enemy)} Won`, bar: "bg-dire", text: "text-dire" },
  ];
  return (
    <figure className="flex flex-col gap-2.5">
      <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-md">
        {parts.map((p) => (p.share > 0 ? <i key={p.key} className={`block ${p.bar}`} style={{ flex: p.share }} /> : null))}
      </div>
      <dl className="grid grid-cols-3 gap-3 text-[0.8125rem] text-muted">
        {parts.map((p, i) => (
          <div key={p.key} className={`flex flex-col-reverse justify-end ${i === 1 ? "items-center text-center" : i === 2 ? "items-end text-right" : ""}`}>
            <dt>{p.label}</dt>
            <dd className={`num text-xl font-semibold leading-tight tracking-[-0.02em] ${p.text}`}>{p.share}%</dd>
          </div>
        ))}
      </dl>
      <figcaption className="text-[0.8125rem] text-subtle">
        <span className="num">{pair.games.toLocaleString("en-US")}</span> lanes of {heroName(pair.hero)} against {heroName(pair.enemy)}
      </figcaption>
    </figure>
  );
}
