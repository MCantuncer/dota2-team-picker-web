import Image from "next/image";
import type { ReactNode } from "react";
import type { GamePlan, LanePlan, LaneVerdict, PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem, ItemBuild } from "@/lib/engine/item-build";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];
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
}

/**
 * The Game Story for a finished draft, a one-minute read from our side: how we win, the game in four
 * timed chapters, the enemies who decide it, and each player's card with their items, minutes and
 * what to do if it goes wrong. The viewer's card is open; teammates' cards open with one tap.
 */
export function GameStoryPanel({ plan, heroName, icons, playerNames, myPosition, action }: GameStoryPanelProps) {
  const players = [...plan.players].sort((a, b) => Number(b.position === myPosition) - Number(a.position === myPosition));
  const laneOf = (heroId: number) => plan.lanes.find((l) => l.ours.includes(heroId));
  return (
    <section aria-label="Game Story" className="card flex flex-col gap-4 border-t-[3px] border-t-accent p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Game Story</h2>
          {action}
        </div>
        <p className="font-heading text-xl font-bold leading-6">{plan.story.headline}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-2">
          <h3 className="label-caps text-muted">The story</h3>
          <ol className="flex flex-col gap-2">
            {plan.story.chapters.map((chapter) => (
              <li key={chapter.phase} className="rounded-sm bg-raised px-3 py-2 text-sm">
                <span className="num font-semibold">{chapter.phase}.</span> {chapter.text}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="label-caps text-muted">Danger heroes</h3>
          {plan.danger.length ? (
            plan.danger.map((line) => (
              <p key={line} className="notice notice-warn">
                {line}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted">No enemy stands out.</p>
          )}
          {plan.teamFallbacks.length > 0 && (
            <>
              <h3 className="label-caps mt-2 text-muted">If the game goes wrong</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {plan.teamFallbacks.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="label-caps text-muted">Each player</h3>
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <PlayerCard
              key={player.position}
              player={player}
              heroName={heroName}
              lane={laneOf(player.heroId)}
              icon={icons[player.heroId]}
              playerName={playerNames[player.position - 1] ?? null}
              isMine={player.position === myPosition}
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
}: {
  player: PlayerPlan;
  heroName: (id: number) => string;
  lane: LanePlan | undefined;
  icon: string | undefined;
  playerName: string | null;
  isMine: boolean;
}) {
  const name = heroName(player.heroId);
  const build = player.build;
  return (
    <li aria-label={`${name}, position ${player.position}`}>
      <details open={isMine} className={`group rounded-sm bg-raised ${isMine ? "ring-1 ring-accent" : ""}`}>
        <summary className="flex cursor-pointer items-center gap-2 rounded-sm p-3 hover:bg-hover">
          {icon && <Image src={icon} alt="" width={32} height={32} className="size-8 shrink-0 rounded-xs" />}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-heading text-xl font-bold leading-6">{name}</span>
            <span className="text-xs text-muted">
              {playerName ?? POSITION_NAMES[player.position - 1]} · <span className="micro">Pos {player.position}</span>
            </span>
          </div>
          {lane && <span className={`micro ${VERDICT_STYLES[lane.verdict]}`}>{VERDICT_LABELS[lane.verdict]}</span>}
          <span aria-hidden className="micro text-subtle group-open:rotate-180">▾</span>
        </summary>
        <div className="flex flex-col gap-3 px-3 pb-3">
          {lane && (
            <p className="text-sm">
              <span className="text-muted">Lane vs</span> {lane.theirs.map(heroName).join(" + ") || "nobody"}.{" "}
              <span className="text-muted">{lane.text}</span>
            </p>
          )}
          {build ? <Build build={build} /> : <p className="text-xs text-muted">No item data for this hero yet.</p>}
          <p className="text-sm">{player.job}</p>
          {player.fallbacks.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="micro text-muted">If it goes wrong</span>
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
      </div>
      {counter && (
        <p className="text-xs">
          <span className="text-accent">{counter.name}</span> <span className="text-muted">{counter.reason}</span>
        </p>
      )}
      {more && (
        <details className="flex flex-col gap-2">
          <summary className="micro w-fit cursor-pointer text-muted hover:text-fg">Start and other items</summary>
          <div className="mt-2 flex flex-col gap-2">
            <Labelled label="Start" items={build.start} />
            {build.lane.length > 0 && <Labelled label="Lane" items={build.lane} />}
            {build.situational.length > 0 && <Labelled label="If needed" items={build.situational} />}
          </div>
        </details>
      )}
    </div>
  );
}

function Labelled({ label, items }: { label: string; items: BuildItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="micro text-muted">{label}</span>
      <ItemRow items={items} />
    </div>
  );
}

function ItemRow({ items, minutes }: { items: BuildItem[]; minutes?: "timed" | "rough" }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.itemId} title={itemTitle(item, minutes)} className="flex flex-col items-center gap-0.5">
          <span className={`block rounded-xs ${item.reason ? "ring-1 ring-accent" : ""}`}>
            <Image src={ITEM_CDN + item.img} alt={item.name} width={32} height={24} className="h-6 w-8 rounded-xs object-cover" />
          </span>
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

function itemTitle(item: BuildItem, minutes: "timed" | "rough" | undefined): string {
  const parts = [item.name];
  if (minutes === "rough") parts.push(`around ${item.minute} min`);
  if (minutes === "timed") {
    parts.push(`usually by ${item.minute} min`);
    if (item.lateMinute !== undefined) parts.push(`slower than most after ${item.lateMinute} min`);
  }
  if (item.reason) parts.push(item.reason);
  return parts.join(", ");
}
