import Image from "next/image";
import type { PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem, ItemBuild } from "@/lib/engine/item-build";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";

interface Art {
  heroName: (id: number) => string;
  /** Square hero icons by hero id. */
  icons: Record<number, string>;
}

/**
 * The Item Build tab (accepted C board): start items as icons only (names on hover), then the Item
 * Journey, one step per core item with its minute, why it is in this game and the enemies it works on,
 * and beside it Their Threats, each group of enemies with the item that answers them.
 */
export function PlayerItems({ player, heroName, icons, laneNote }: Art & { player: PlayerPlan; laneNote?: string }) {
  const build = player.build;
  if (!build) return <p className="text-sm text-muted">No item data for this hero yet.</p>;
  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-2.5">
          <Heading title="Start" note={laneNote} />
          <ul aria-label="Start items" className="flex flex-wrap items-center gap-1.5">
            {build.start.map((item) => (
              <li key={item.itemId} title={item.count ? `${item.count} ${item.name}` : item.name} className="flex items-center gap-1">
                <ItemArt item={item} />
                {item.count && <span className="num text-xs text-muted">x{item.count}</span>}
              </li>
            ))}
          </ul>
        </div>
        <Journey build={build} heroName={heroName} icons={icons} />
      </div>
      <Threats player={player} heroName={heroName} icons={icons} />
    </div>
  );
}

function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3.5">
      <h3 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">{title}</h3>
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  );
}

/** The core items in buy order, each with its minute, its line for this game and the faces it answers. */
function Journey({ build, heroName, icons }: Art & { build: ItemBuild }) {
  const rough = build.timings === "around";
  // Lane items are steps too: the journey is every item after the start, in buy order.
  const steps = [...build.lane.map((item) => ({ item, core: false })), ...build.core.map((item) => ({ item, core: true }))].sort(
    (a, b) => a.item.minute - b.item.minute,
  );
  // The other boots go once, under the core boots (the first core item bought in the lane phase).
  const boots = build.core.find((i) => i.phase === "lane");
  return (
    <div className="flex flex-col gap-1">
      <Heading title="Item Journey" note={rough ? "Rough minutes from all games" : "Usual minute, then late after"} />
      <ol className="relative mt-2 before:absolute before:inset-y-5 before:left-[1.375rem] before:w-px before:bg-line-strong">
        {steps.map(({ item, core }) => {
          const faces = item.effectAgainst?.length ? item.effectAgainst : (item.against ?? []);
          const why = [item.reason, item.effect].filter((s): s is string => Boolean(s)).map(sentence).join(" ");
          return (
            <li key={`${core ? "core" : "lane"}-${item.itemId}`} className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-1 py-3 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto]">
              <span className={`rounded-xs shadow-[0_0_0_3px_var(--bg)] ${item.reason || item.draft ? "outline-2 outline-offset-2 outline-accent" : ""}`}>
                <ItemArt item={item} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-base font-semibold text-fg">{item.name}</span>
                  <span className="num text-sm text-muted">{minuteText(item, rough)}</span>
                  {item.draft && !item.reason && <span className="text-xs text-accent">For this draft</span>}
                </div>
                {why && <p className="mt-0.5 max-w-[62ch] text-[0.84375rem] text-muted">{why}</p>}
                {item === boots && build.bootsOr && (
                  <p className="mt-0.5 text-xs text-subtle">
                    Or {build.bootsOr.name} at <span className="num">{build.bootsOr.minute} min</span>
                  </p>
                )}
              </div>
              {faces.length > 0 && (
                <span className="col-start-2 flex gap-0.5 sm:col-start-3 sm:pt-1">
                  {faces.map((id) => (
                    <Face key={id} id={id} heroName={heroName} icons={icons} />
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {build.situational.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          <h4 className="text-sm font-medium text-muted">If Needed</h4>
          <ul className="flex flex-col gap-1.5">
            {build.situational.map((item) => {
              const instead = build.core.find((c) => c.itemId === item.replaces)?.name;
              const line = [item.reason, instead && `Instead of ${instead}`].filter((s): s is string => Boolean(s)).map(sentence).join(" ");
              return (
                <li key={item.itemId} className="flex items-center gap-2.5 text-sm">
                  <ItemArt item={item} small />
                  <span className="text-fg">{item.name}</span>
                  {line && <span className="text-muted">{line}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Their Threats: each group of enemies, what they bring, and the item that answers them or what to do. */
function Threats({ player, heroName, icons }: Art & { player: PlayerPlan }) {
  const items = player.build ? [...player.build.core, ...player.build.situational, ...player.build.lane, ...player.build.start] : [];
  if (!player.threatRows.length) return null;
  return (
    <aside className="flex flex-col">
      <h3 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">Their Threats</h3>
      <p className="text-sm text-muted">What hurts you in this game, and the answer</p>
      <ul className="mt-3.5 flex flex-col">
        {player.threatRows.map((row) => {
          const answer = items.find((i) => i.itemId === row.answer);
          const key = row.enemies.map((e) => e.heroId).join("-");
          return (
            <li key={key} className="grid grid-cols-[minmax(0,4rem)_minmax(0,1fr)_2.75rem] items-center gap-3.5 border-t border-line py-3.5">
              <span className="flex flex-wrap gap-0.5">
                {row.enemies.map((e) => (
                  // The names are written beside the faces, so the faces carry no names of their own.
                  <Face key={e.heroId} id={e.heroId} heroName={heroName} icons={icons} large={row.enemies.length === 1} decorative />
                ))}
              </span>
              <div className="min-w-0">
                <b className="block text-[0.9375rem] font-semibold text-fg">
                  {row.enemies.map((e, i) => (
                    <span key={e.heroId}>
                      {i > 0 && ", "}
                      {heroName(e.heroId)}
                      {e.inLane && <span className="text-xs font-normal text-muted"> {e.laneSure ? "Lane" : "Lane, guessed"}</span>}
                    </span>
                  ))}
                </b>
                <span className="text-sm text-muted">
                  {[...unique(row.enemies.map((e) => e.threat)), ...(!answer && row.tip ? [row.tip] : [])].map(sentence).join(" ")}
                </span>
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

/** "16 min, late after 18", or "~16 min" for rough minutes. */
export function minuteText(item: Pick<BuildItem, "minute" | "lateMinute">, rough: boolean): string {
  if (rough) return `~${item.minute} min`;
  return item.lateMinute !== undefined ? `${item.minute} min, late after ${item.lateMinute}` : `${item.minute} min`;
}

const unique = (xs: string[]) => [...new Set(xs)];

/** One sentence: trailing spaces and a final period or colon trimmed, then one period, unless it ends in ? or !. */
export function sentence(text: string): string {
  const t = text.trim().replace(/[.:;,]+$/, "");
  return /[?!]$/.test(t) ? t : `${t}.`;
}
