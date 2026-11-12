import Image from "next/image";
import type { EnemyNote, ThreatRow } from "@/lib/engine/enemy-list";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem, Threat } from "@/lib/engine/item-build";
import { sentence } from "./build-path";
import { HeroArt, HeroFace, HeroStage, type HeroArtPlacement } from "./hero-frame";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

/** One placement for every tile, so the enemies' faces line up across the row. */
const TILE_ART: HeroArtPlacement = { width: 340, at: [0.5, 0.4] };

/** The threat kind as a short title under the spell. */
export const KIND_TITLES: Record<Threat | "tank", string> = {
  illusions: "Illusions",
  evasion: "Evasion",
  invisible: "Invisible",
  heal: "Heals",
  unattackable: "Unattackable",
  passives: "Passives",
  magicBurst: "Magic Burst",
  disable: "Lockdown",
  physicalCarry: "Late Carry",
  tank: "Tank",
};

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id. */
  icons: Record<number, string>;
}

/**
 * Who Hurts You (Can's go on the Your Game mockup, 2026-11-12): one tile per threat row, so an answer is said once.
 * Each tile is the first enemy's render with the others' faces, the spell that hurts this player most, the
 * heroes and the threat kind, then the answer: the item in their path that stops it, or what to do instead.
 */
export function WhoHurtsYou({ player, heroName, icons }: Art & { player: PlayerPlan }) {
  if (!player.threatRows.length) return null;
  const build = player.build;
  const path = build ? [...build.core, ...build.situational, ...build.lane, ...build.start] : [];
  const note = (heroId: number) => player.enemies.find((e) => e.heroId === heroId);
  return (
    <section aria-labelledby="who-hurts-you" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h3 id="who-hurts-you" className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">
          Who Hurts You
        </h3>
        <span className="text-sm text-muted">{"Each enemy's worst spell for you, and your answer"}</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {player.threatRows.map((row) => (
          <Tile key={row.enemies.map((e) => e.heroId).join("-")} row={row} note={note} answer={path.find((i) => i.itemId === row.answer)} heroName={heroName} icons={icons} />
        ))}
      </ul>
    </section>
  );
}

function Tile({ row, note, answer, heroName, icons }: Art & { row: ThreatRow; note: (id: number) => EnemyNote | undefined; answer?: BuildItem }) {
  const [first, ...others] = row.enemies;
  if (!first) return null;
  const spells = row.enemies.flatMap((e) => {
    const spell = note(e.heroId)?.spell;
    return spell ? [{ heroId: e.heroId, ...spell }] : [];
  });
  const lane = row.enemies.find((e) => e.inLane);
  const kinds = [...new Set(row.enemies.flatMap((e) => (e.kind ? [KIND_TITLES[e.kind]] : [])))];
  const title = spells.length ? spells.map((s) => s.name).join(", ") : first.threat;
  // The spell lines say what each spell does; without a spell, the threat line says what the hero does.
  const lines = spells.length ? spells.map((s) => (spells.length > 1 ? `${s.name}: ${sentence(s.line)}` : sentence(s.line))) : others.length ? row.enemies.map((e) => `${heroName(e.heroId)}: ${sentence(e.threat)}`) : [];
  return (
    <li className="flex gap-3 overflow-hidden rounded-xl border border-line-strong bg-surface p-3 sm:flex-col sm:gap-0 sm:p-0">
      <HeroStage size={160} isEnemy className="relative block aspect-video w-32 shrink-0 self-start overflow-hidden sm:w-full">
        {icons[first.heroId] && <HeroArt heroId={first.heroId} portrait={icons[first.heroId]!} placement={TILE_ART} />}
        {others.length > 0 && (
          <span className="absolute left-1.5 top-1.5 flex gap-1.5 sm:left-3 sm:top-3">
            {others.map((e) =>
              icons[e.heroId] ? (
                <span key={e.heroId} className="rounded-[0.375rem] shadow-[0_0_0_2px_var(--bg)]">
                  <HeroFace portrait={icons[e.heroId]!} name={heroName(e.heroId)} size={32} isEnemy isDecorative />
                </span>
              ) : null,
            )}
          </span>
        )}
        {spells[0] && (
          <Image
            src={`${ABILITY_CDN}${spells[0].key}.png`}
            alt=""
            width={40}
            height={40}
            className="absolute bottom-1.5 left-1.5 size-7 rounded-md shadow-[0_0_0_2px_var(--bg)] sm:bottom-3 sm:left-3 sm:size-10"
          />
        )}
      </HeroStage>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:p-4">
        <div className="flex flex-col items-start gap-1">
          {lane && (
            <span className="chip h-6 bg-dire-tint px-2 text-xs font-medium text-dire shadow-none">{lane.laneSure ? "In Your Lane" : "In Your Lane, Guessed"}</span>
          )}
          <b className="text-base font-semibold text-fg">{title}</b>
          <span className="text-[0.8125rem] text-muted">
            {row.enemies.map((e) => heroName(e.heroId)).join(", ")}
            {kinds.length > 0 && ` · ${kinds.join(", ")}`}
          </span>
        </div>
        {lines.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-center gap-3 rounded-lg bg-raised p-2.5">
          {answer ? (
            <>
              <Image src={ITEM_CDN + answer.img} alt="" width={44} height={32} className="h-8 w-11 shrink-0 rounded-md object-cover" />
              <span className="flex flex-col leading-tight">
                <span className="text-xs text-subtle">Answer</span>
                <b className="text-sm font-semibold text-fg">{answer.name}</b>
              </span>
            </>
          ) : (
            <span className="flex flex-col leading-tight">
              <span className="text-xs text-subtle">Do</span>
              <span className="text-sm text-fg">{row.tip ? sentence(row.tip) : "Play your game."}</span>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
