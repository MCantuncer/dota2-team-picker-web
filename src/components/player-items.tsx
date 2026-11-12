import Image from "next/image";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem } from "@/lib/engine/item-build";
import type { ItemFork } from "@/lib/item-forks";
import { BuildPath, sentence } from "./build-path";
import { ItemForks } from "./item-forks";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const ABILITY_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/";

interface Art {
  heroName: (id: number) => string;
  /** Square hero icons by hero id. */
  icons: Record<number, string>;
}

/**
 * The Item Build tab: the Build Path (kits, the core items on one line, a detail under the open item), then what
 * high-rank wins did when a key item came late (item-forks.tsx), and beside it Their Threats, each enemy with the
 * item that answers it.
 */
export function PlayerItems({ player, heroName, icons, laneNote, forks = [] }: Art & { player: PlayerPlan; laneNote?: string; forks?: ItemFork[] }) {
  const build = player.build;
  if (!build) return <p className="text-sm text-muted">No item data for this hero yet.</p>;
  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex min-w-0 flex-col gap-12">
        <BuildPath build={build} heroName={heroName} icons={icons} note={laneNote} />
        <ItemForks forks={forks} />
      </div>
      <Threats player={player} heroName={heroName} icons={icons} />
    </div>
  );
}

/**
 * Their Threats: one row per enemy, led by the spell that hurts you most (Can 2026-11-04, the approved
 * mockup): the hero's face with the spell's art, the spell and what it does, and the item in this
 * player's path that answers it, or what to do when none does.
 */
function Threats({ player, heroName, icons }: Art & { player: PlayerPlan }) {
  const items = player.build ? [...player.build.core, ...player.build.situational, ...player.build.lane, ...player.build.start] : [];
  if (!player.enemies.length) return null;
  return (
    <aside className="flex flex-col">
      <h3 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">Their Threats</h3>
      <p className="text-sm text-muted">What hurts you in this game, and the answer</p>
      <ul className="mt-3.5 flex flex-col">
        {player.enemies.map((e) => {
          const answer = items.find((i) => e.answers.includes(i.itemId));
          const line = e.spell ? e.spell.line : e.threat;
          return (
            <li key={e.heroId} className="grid grid-cols-[4.75rem_minmax(0,1fr)_2.75rem] items-center gap-3.5 border-t border-line py-3.5">
              {/* The hero and spell are named beside the art, so the art carries no names of its own. */}
              <span className="relative block w-16" aria-hidden>
                <Face id={e.heroId} heroName={heroName} icons={icons} large decorative />
                {e.spell && (
                  <Image
                    src={`${ABILITY_CDN}${e.spell.key}.png`}
                    alt=""
                    width={24}
                    height={24}
                    className="absolute -bottom-1.5 -right-2.5 size-6 rounded-xs ring-2 ring-bg"
                  />
                )}
              </span>
              <div className="min-w-0">
                <b className="block text-[0.9375rem] font-semibold text-fg">
                  {e.spell?.name ?? heroName(e.heroId)}
                  {e.spell && <span className="text-xs font-normal text-muted"> {heroName(e.heroId)}</span>}
                  {e.inLane && <span className="text-xs font-normal text-muted">{e.spell ? ", " : " "}{e.laneSure ? "Lane" : "Lane, guessed"}</span>}
                </b>
                {/* The trait tip speaks of the hero in general, so it only stands in when there is no spell line. */}
                <span className="text-sm text-muted">{[line, ...(!answer && !e.spell && e.tip ? [e.tip] : [])].map(sentence).join(" ")}</span>
              </div>
              {answer ? (
                <span title={answer.name}>
                  <span className="sr-only">Answer: </span>
                  <ItemArt item={answer} />
                </span>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function ItemArt({ item, small }: { item: BuildItem; small?: boolean }) {
  return (
    <Image
      src={ITEM_CDN + item.img}
      alt={item.count ? `${item.count} ${item.name}` : item.name}
      width={44}
      height={32}
      className={`${small ? "h-6 w-[2.0625rem]" : "h-8 w-11"} block rounded-xs object-cover`}
    />
  );
}

function Face({ id, heroName, icons, large, decorative }: Art & { id: number; large?: boolean; decorative?: boolean }) {
  const icon = icons[id];
  const name = heroName(id);
  if (!icon) return decorative ? null : <span className="text-xs text-muted">{name}</span>;
  return <Image src={icon} alt={decorative ? "" : name} title={name} width={64} height={36} className={`${large ? "h-9 w-16" : "h-[1.375rem] w-10"} rounded-xs object-cover`} />;
}
