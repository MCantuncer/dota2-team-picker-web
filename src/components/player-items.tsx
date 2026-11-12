import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { ItemFork } from "@/lib/item-forks";
import { BuildPath } from "./build-path";
import { ItemForks } from "./item-forks";
import { WhoHurtsYou } from "./who-hurts-you";

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id. */
  icons: Record<number, string>;
}

/**
 * The Item Build tab: the Build Path (kits, the core items on one line, a detail under the open item), Who Hurts You
 * (each threat with its answer), then what high-rank wins did when a key item came late (item-forks.tsx).
 */
export function PlayerItems({ player, heroName, icons, laneNote, forks = [] }: Art & { player: PlayerPlan; laneNote?: string; forks?: ItemFork[] }) {
  const build = player.build;
  if (!build) return <p className="text-sm text-muted">No item data for this hero yet.</p>;
  return (
    <div className="flex min-w-0 flex-col gap-12">
      <BuildPath build={build} heroName={heroName} icons={icons} note={laneNote} />
      <WhoHurtsYou player={player} heroName={heroName} icons={icons} />
      <ItemForks forks={forks} />
    </div>
  );
}
