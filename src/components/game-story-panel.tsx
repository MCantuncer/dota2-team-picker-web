import Image from "next/image";
import type { ReactNode } from "react";
import type { GamePlan, LanePlan, LaneVerdict, PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem, ItemBuild } from "@/lib/engine/item-build";
import type { HeroAbilities, Snapshot } from "@/lib/engine/types";
import { SkillPlanCard } from "./skill-plan-card";
import { StoryTimeline } from "./story-timeline";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"];
const VERDICT_LABELS: Record<LaneVerdict, string> = { win: "Won lane", even: "Even lane", hard: "Hard lane" };
const VERDICT_STYLES: Record<LaneVerdict, string> = { win: "text-radiant", even: "text-muted", hard: "text-warn" };

export interface GameStoryPanelProps {
  plan: GamePlan;
  heroName: (id: number) => string;
  /** Square hero icons by hero id; heroes without one show their name only. */
  icons: Record<number, string>;
  /** Who plays each position (index 0 = pos 1), when known. */
  playerNames: (string | null)[];
  /** The viewer's position: their card comes first and starts open. */
  myPosition?: number;
  /** Shown beside the heading, such as a button to send the plan. */
  action?: ReactNode;
  /** Each hero's abilities, for the skill order icons. */
  abilities?: Snapshot["heroAbilities"];
  /** Shop items, for the item art on the Story timeline. */
  items?: Snapshot["items"];
}

/**
 * The Game Story for a finished draft, a one-minute read from our side: how we win, the game as a minute
 * line with both teams' key items and one thing to do per chapter, the enemies who decide it, and each player's card with their items, minutes and
 * what to do if it goes wrong. The viewer's card is open; teammates' cards open with one tap.
 */
export function GameStoryPanel({ plan, heroName, icons, playerNames, myPosition, action, abilities, items }: GameStoryPanelProps) {
  // The Story names heroes, so its art is found by name among this draft's heroes (names are unique in Dota).
  const heroIds = [...plan.players.map((p) => p.heroId), ...plan.lanes.flatMap((l) => [...l.ours, ...l.theirs])];
  const heroIcons = Object.fromEntries(heroIds.flatMap((id) => (icons[id] ? [[heroName(id), icons[id]]] : [])));
  const players = [...plan.players].sort((a, b) => Number(b.position === myPosition) - Number(a.position === myPosition));
  const laneOf = (heroId: number) => plan.lanes.find((l) => l.ours.includes(heroId));
  return (
    <section aria-label="Game Story" className="flex flex-col gap-6 border-t border-line pt-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Game Story</h2>
          {action}
        </div>
        <p className="max-w-3xl text-2xl font-semibold leading-8 tracking-[-0.02em] text-fg">{plan.story.headline}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="label-caps">The Story</h3>
        <StoryTimeline story={plan.story} heroIcons={heroIcons} items={items} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="label-caps">Danger Heroes</h3>
          {plan.danger.length ? (
            plan.danger.map((line) => (
              <p key={line} className="notice notice-warn">
                {line}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted">No enemy stands out.</p>
          )}
        </div>
        {plan.teamFallbacks.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="label-caps">If the Game Goes Wrong</h3>
            <ul className="flex flex-col gap-1.5 text-fg/85">
              {plan.teamFallbacks.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="label-caps">Each Player</h3>
        <ul className="flex flex-col">
          {players.map((player) => (
            <PlayerCard
              key={player.position}
              player={player}
              heroName={heroName}
              lane={laneOf(player.heroId)}
              icon={icons[player.heroId]}
              playerName={playerNames[player.position - 1] ?? null}
              isMine={player.position === myPosition}
              abilities={abilities?.[player.heroId]}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function PlayerCard({
  player,
  heroName,
  lane,
  icon,
  playerName,
  isMine,
  abilities,
}: {
  player: PlayerPlan;
  heroName: (id: number) => string;
  lane: LanePlan | undefined;
  icon: string | undefined;
  playerName: string | null;
  isMine: boolean;
  abilities: HeroAbilities | undefined;
}) {
  const name = heroName(player.heroId);
  const build = player.build;
  return (
    <li aria-label={`${name}, position ${player.position}`}>
      <details open={isMine} className="group border-t border-line">
        <summary className="flex cursor-pointer items-center gap-3 py-3 hover:bg-surface">
          {icon && <Image src={icon} alt="" width={40} height={40} className="size-10 shrink-0 rounded-xs" />}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-2 text-xl font-semibold leading-6 tracking-[-0.02em] text-fg">
              {name}
              {isMine && <span className="rounded-xs bg-radiant px-1.5 text-xs font-semibold leading-4 tracking-normal text-bg">You</span>}
            </span>
            <span className="text-xs text-muted">
              {playerName ?? POSITION_NAMES[player.position - 1]} · <span className="micro">Pos {player.position}</span>
            </span>
          </div>
          {lane && <span className={`micro ${VERDICT_STYLES[lane.verdict]}`}>{VERDICT_LABELS[lane.verdict]}</span>}
          <span aria-hidden className="micro text-subtle group-open:rotate-180">▾</span>
        </summary>
        <div className="flex flex-col gap-4 pb-5 pl-[3.25rem]">
          {lane && (
            <p className="text-sm">
              <span className="text-muted">Lane vs</span> {lane.theirs.map(heroName).join(" + ") || "nobody"}.{" "}
              <span className="text-muted">{lane.text}</span>
            </p>
          )}
          {build ? <Build build={build} /> : <p className="text-xs text-muted">No item data for this hero yet.</p>}
          <p className="text-sm">{player.job}</p>
          {player.skills && <SkillPlanCard plan={player.skills} abilities={abilities} />}
          {player.enemies.length > 0 && <Enemies player={player} heroName={heroName} />}
          {player.fallbacks.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="micro text-muted">If It Goes Wrong</span>
              <ul className="flex flex-col gap-1 text-sm">
                {player.fallbacks.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

/** Each enemy for this player, lane enemies first: the threat in one line, then the items that answer it or a tip. */
function Enemies({ player, heroName }: { player: PlayerPlan; heroName: (id: number) => string }) {
  const build = player.build;
  const items = build ? [...build.start, ...build.lane, ...build.core, ...build.situational] : [];
  const itemName = (id: number) => items.find((i) => i.itemId === id)?.name;
  return (
    <div className="flex flex-col gap-1">
      <span className="micro text-muted">Who to Watch</span>
      <ul className="flex flex-col gap-1 text-sm">
        {player.enemies.map((enemy) => {
          const answers = enemy.answers.map(itemName).filter((name): name is string => Boolean(name));
          return (
            <li key={enemy.heroId}>
              <span className="font-bold">{heroName(enemy.heroId)}</span>
              {enemy.inLane && <span className="micro text-muted"> {enemy.laneSure ? "Lane" : "Lane, guessed"}</span>}{" "}
              <span className="text-muted">{enemy.threat}.</span>{" "}
              {answers.length > 0 ? <span className="text-accent">Buy {answers.join(", ")}.</span> : enemy.tip && <span>{enemy.tip}.</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Core items with their minutes, the most important counter item, and the rest folded away. */
function Build({ build }: { build: ItemBuild }) {
  const isRough = build.timings === "around";
  const counter = [...build.core, ...build.situational].find((item) => item.reason);
  const more = build.start.length + build.lane.length + build.situational.length > 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="micro text-muted">{isRough ? "Core, rough minutes" : "Core: usual minute, then slower than most after"}</span>
        <ItemRow items={build.core} minutes={isRough ? "rough" : "timed"} />
        {build.bootsOr && (
          <p className="text-xs text-muted">
            Or {build.bootsOr.name} at <span className="num">{build.bootsOr.minute}m</span>
          </p>
        )}
      </div>
      {counter && (
        <p className="text-xs">
          <span className="text-accent">{counter.name}</span> <span className="text-muted">{counter.reason}</span>
        </p>
      )}
      {more && (
        <details className="flex flex-col gap-2">
          <summary className="micro w-fit cursor-pointer text-muted hover:text-fg">Start and Other Items</summary>
          <div className="mt-2 flex flex-col gap-2">
            <Labelled label="Start" items={build.start} />
            {build.lane.length > 0 && <Labelled label="Lane" items={build.lane} minutes={isRough ? undefined : "timed"} />}
            {build.situational.length > 0 && <Labelled label="If needed" items={build.situational} core={build.core} />}
          </div>
        </details>
      )}
    </div>
  );
}

function Labelled({ label, items, minutes, core }: { label: string; items: BuildItem[]; minutes?: "timed"; core?: BuildItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="micro text-muted">{label}</span>
      <ItemRow items={items} minutes={minutes} core={core} />
    </div>
  );
}

function ItemRow({ items, minutes, core }: { items: BuildItem[]; minutes?: "timed" | "rough"; core?: BuildItem[] }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.itemId} title={itemTitle(item, minutes, core?.find((c) => c.itemId === item.replaces)?.name)} className="flex flex-col items-center gap-0.5">
          <span className={`block rounded-xs ${item.draft || item.reason ? "ring-1 ring-accent" : ""}`}>
            <Image
              src={ITEM_CDN + item.img}
              alt={item.count ? `${item.count} ${item.name}` : item.name}
              width={32}
              height={24}
              className="h-6 w-8 rounded-xs object-cover"
            />
          </span>
          {item.count && <span className="num text-xs">x{item.count}</span>}
          {minutes && (
            <span className="num text-xs">
              {minutes === "rough" ? "~" : ""}
              {item.minute}m
            </span>
          )}
          {minutes === "timed" && item.lateMinute !== undefined && (
            <span className="num text-xs text-warn">{item.lateMinute}m</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function itemTitle(item: BuildItem, minutes: "timed" | "rough" | undefined, replaces?: string): string {
  const parts = [item.name];
  if (minutes === "rough") parts.push(`around ${item.minute} min`);
  if (minutes === "timed") {
    parts.push(`usually by ${item.minute} min`);
    if (item.lateMinute !== undefined) parts.push(`slower than most after ${item.lateMinute} min`);
  }
  if (item.reason) parts.push(item.reason);
  if (replaces) parts.push(`instead of ${replaces}`);
  return parts.join(", ");
}
