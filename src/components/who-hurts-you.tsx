import Image from "next/image";
import type { EnemyNote, ThreatRow } from "@/lib/engine/enemy-list";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem, Threat } from "@/lib/engine/item-build";
import { sentence } from "./build-path";
import { HeroArt, HeroFace, HeroStage, type HeroArtPlacement } from "./hero-frame";
import { ItemBand, ItemButton } from "./item-card";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

/** One placement for every tile, so the enemies' faces line up across the row. */
const TILE_ART: HeroArtPlacement = { width: 340, at: [0.5, 0.4] };

/**
 * The tiles fill whole rows, never one left alone: 2 side by side, 3 in a row, 4 as 2 + 2 then one row. Five turn
 * into cards only on the wide screen, as one row; below it they stay as rows with the art at the side.
 */
const GRID: Record<number, string> = {
  1: "md:grid-cols-2 xl:grid-cols-3",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
  5: "xl:grid-cols-5",
};

/** The classes that turn a row (art at the side) into a card (art on top), from the screen size the grid says. */
interface CardClasses {
  tile: string;
  art: string;
  faces: string;
  spell: string;
  head: string;
  lines: string;
  answer: string;
}
const MD: CardClasses = {
  tile: "md:row-span-4 md:grid-cols-1 md:grid-rows-subgrid md:gap-0 md:p-0",
  art: "md:row-span-1",
  faces: "md:left-3 md:top-3",
  spell: "md:bottom-3 md:left-3 md:size-10",
  head: "md:px-5 md:pt-5",
  lines: "md:px-5 md:pt-3 md:empty:block",
  answer: "md:col-span-1 md:mx-5 md:mt-5 md:self-start md:pb-5 md:pt-4",
};
const XL: CardClasses = {
  tile: "xl:row-span-4 xl:grid-cols-1 xl:grid-rows-subgrid xl:gap-0 xl:p-0",
  art: "xl:row-span-1",
  faces: "xl:left-3 xl:top-3",
  spell: "xl:bottom-3 xl:left-3 xl:size-10",
  head: "xl:px-5 xl:pt-5",
  lines: "xl:px-5 xl:pt-3 xl:empty:block",
  answer: "xl:col-span-1 xl:mx-5 xl:mt-5 xl:self-start xl:pb-5 xl:pt-4",
};

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
        <h3 id="who-hurts-you" className="text-lg font-semibold tracking-[-0.02em] text-fg">
          Who Hurts You
        </h3>
        <span className="text-sm text-muted">{"Each enemy's worst spell for you, and your answer"}</span>
      </div>
      <ul className={`grid gap-4 ${GRID[Math.min(player.threatRows.length, 5)]}`}>
        {player.threatRows.map((row) => (
          <Tile
            key={row.enemies.map((e) => e.heroId).join("-")}
            row={row}
            note={note}
            answer={path.find((i) => i.itemId === row.answer)}
            heroName={heroName}
            icons={icons}
            cards={player.threatRows.length >= 5 ? XL : MD}
          />
        ))}
      </ul>
    </section>
  );
}

function Tile({ row, note, answer, heroName, icons, cards }: Art & { row: ThreatRow; note: (id: number) => EnemyNote | undefined; answer?: BuildItem; cards: CardClasses }) {
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
  // As a card each tile is four rows of the list's grid (art, title, lines, answer), so the answers of tiles
  // side by side start on one line however long the text above them runs.
  return (
    <li className={`grid grid-cols-[8rem_minmax(0,1fr)] content-start gap-x-3 gap-y-3 overflow-hidden rounded-xl border border-line-strong bg-surface p-3 ${cards.tile}`}>
      <HeroStage size={160} isEnemy className={`relative row-span-2 block aspect-video w-full self-start overflow-hidden ${cards.art}`}>
        {icons[first.heroId] && <HeroArt heroId={first.heroId} portrait={icons[first.heroId]!} placement={TILE_ART} />}
        {others.length > 0 && (
          <span className={`absolute left-1.5 top-1.5 flex gap-1.5 ${cards.faces}`}>
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
            className={`absolute bottom-1.5 left-1.5 size-7 rounded-md shadow-[0_0_0_2px_var(--bg)] ${cards.spell}`}
          />
        )}
      </HeroStage>
      <div className={`flex min-w-0 flex-col items-start gap-1 ${cards.head}`}>
        {lane && <span className="chip h-6 bg-dire-tint px-2 text-xs font-medium text-dire shadow-none">{lane.laneSure ? "In Your Lane" : "In Your Lane, Guessed"}</span>}
        <b className="text-base font-semibold text-fg">{title}</b>
        <span className="text-sm text-muted">
          {row.enemies.map((e) => heroName(e.heroId)).join(", ")}
          {kinds.length > 0 && ` · ${kinds.join(", ")}`}
        </span>
      </div>
      <ul className={`flex min-w-0 flex-col gap-1.5 text-sm leading-relaxed text-muted empty:hidden ${cards.lines}`}>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <TileAnswer row={row} answer={answer} heroName={heroName} icons={icons} cards={cards} />
    </li>
  );
}

/**
 * What to do about the tile's enemies, under a line across the tile: the answer item from the player's path, or
 * this game's tip with the art it names (the heroes to hit or fight next to, an item, a spell). No label or box:
 * the art and a sentence that starts with a verb say it is the thing to do.
 */
function TileAnswer({ row, answer, heroName, icons, cards }: Art & { row: ThreatRow; answer?: BuildItem; cards: CardClasses }) {
  const art = row.tipArt;
  const foes = row.enemies.map((e) => e.heroId);
  const chip = { text: `For ${foes.map(heroName).join(" and ")}`, enemy: true, faces: foes.map((id) => ({ name: heroName(id), portrait: icons[id] })) };
  return (
    <div className={`col-span-2 flex items-center gap-3.5 border-t border-line pt-3 ${cards.answer}`}>
      {answer ? (
        <>
          <ItemButton
            card={{ itemId: answer.itemId, name: answer.name, img: answer.img, band: <ItemBand timing={{ minute: answer.minute }} chip={chip} /> }}
            className="shrink-0"
          >
            <Image src={ITEM_CDN + answer.img} alt="" width={55} height={40} className="block h-10 w-[3.4375rem] rounded-md object-cover" />
          </ItemButton>
          <p className="text-sm leading-relaxed text-fg">
            Buy <b className="font-semibold">{answer.name}</b>
            <span className="text-muted">, around {answer.minute} min.</span>
          </p>
        </>
      ) : (
        <>
          {art && "heroes" in art && (
            <span className="flex shrink-0 gap-1.5">
              {art.heroes.map((id) =>
                icons[id] ? <HeroFace key={id} portrait={icons[id]!} name={heroName(id)} size={40} isEnemy={art.side === "enemy"} isDecorative /> : null,
              )}
            </span>
          )}
          {art && "item" in art && (
            <ItemButton card={{ itemId: art.item, img: art.img, band: <ItemBand chip={chip} /> }} className="shrink-0">
              <Image src={ITEM_CDN + art.img} alt="" width={55} height={40} className="block h-10 w-[3.4375rem] rounded-md object-cover" />
            </ItemButton>
          )}
          {art && "spell" in art && <Image src={`${ABILITY_CDN}${art.spell}.png`} alt="" width={40} height={40} className="size-10 shrink-0 rounded-md" />}
          <p className="text-sm leading-relaxed text-fg">{row.tip ? sentence(row.tip) : "Play your game."}</p>
        </>
      )}
    </div>
  );
}
