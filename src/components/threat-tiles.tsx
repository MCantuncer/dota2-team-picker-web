import type { DraftThreat } from "@/lib/engine/threat-plan";
import { dangerOf } from "@/lib/engine/threat-plan";
import { HeroArt, HeroStage, type HeroArtPlacement } from "./hero-frame";
import { PositionLabel } from "./position-label";

/*
 * The dangerous enemy cores in a draft, side by side, most dangerous first: each tile is his render, his role and his
 * number, the win rate he has against teams with as many of his answers as yours. A tile opens his plan below.
 */

const TILE_ART: HeroArtPlacement = { width: 190, at: [0.52, 0.42] };
const STEP_TEXT = ["None of his answers", "One of his answers", "Two or more answers"];

export function ThreatTiles({
  threats,
  chosen,
  hero,
  onChoose,
}: {
  threats: DraftThreat[];
  chosen: number;
  hero: (id: number) => { name: string; portrait?: string };
  onChoose: (id: number) => void;
}) {
  return (
    <ul aria-label="Dangerous Enemies" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {threats.map((t) => {
        const { name, portrait } = hero(t.hero);
        const danger = dangerOf(t);
        const isChosen = t.hero === chosen;
        return (
          <li key={t.hero}>
            <button
              type="button"
              aria-pressed={isChosen}
              onClick={() => onChoose(t.hero)}
              className={`flex w-full items-center gap-3 rounded-lg p-2 pr-4 text-left ring-1 ring-inset transition-colors ${
                isChosen ? "bg-raised ring-accent" : "ring-line-strong hover:bg-hover"
              }`}
            >
              <HeroStage size={60} isEnemy className="relative h-[3.75rem] w-24 shrink-0 overflow-hidden">
                {portrait && <HeroArt heroId={t.hero} portrait={portrait} placement={TILE_ART} />}
              </HeroStage>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-fg">{name}</span>
                <PositionLabel position={t.position} size={14} className="micro text-dire" />
                <span className="micro text-subtle">{STEP_TEXT[t.step]}</span>
              </span>
              <span
                className={`text-2xl font-semibold tracking-tight tabular-nums ${danger >= 53 ? "text-dire" : danger <= 47 ? "text-radiant" : "text-fg"}`}
              >
                {danger.toFixed(1)}%
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
