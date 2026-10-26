import Image from "next/image";
import type { GamePlan, LaneVerdict, PlayerPlan } from "@/lib/engine/game-plan";
import type { BuildItem } from "@/lib/engine/item-build";

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const POSITION_NAMES = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];
const VERDICT_LABELS: Record<LaneVerdict, string> = { win: "Won lane", even: "Even lane", hard: "Hard lane" };
const VERDICT_STYLES: Record<LaneVerdict, string> = { win: "text-radiant", even: "text-muted", hard: "text-warn" };

export interface GamePlanPanelProps {
  plan: GamePlan;
  heroName: (id: number) => string;
  /** Square hero icons by hero id; heroes without one show their name only. */
  icons: Record<number, string>;
  /** Who plays each position (index 0 = pos 1), when known. */
  playerNames: (string | null)[];
  /** The viewer's position, whose card comes first. */
  myPosition?: number;
}

/** The game plan for a finished draft: roadmap to win, lanes, and each player's job and item build. */
export function GamePlanPanel({ plan, heroName, icons, playerNames, myPosition }: GamePlanPanelProps) {
  const players = [...plan.players].sort((a, b) => Number(b.position === myPosition) - Number(a.position === myPosition));
  return (
    <section aria-label="Game plan" className="card flex flex-col gap-4 border-t-[3px] border-t-accent p-4">
      <div className="flex flex-col gap-1">
        <h2 className="section-title">Game plan</h2>
        <p className="text-sm">{plan.winCondition}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-2">
          <h3 className="label-caps text-muted">Roadmap to win</h3>
          <ol className="flex flex-col gap-2">
            {plan.roadmap.map((step) => (
              <li key={step.phase} className="rounded-sm bg-raised px-3 py-2 text-sm">
                <span className="font-semibold">{step.phase}.</span> {step.text}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="label-caps text-muted">Watch out</h3>
          {plan.fears.length ? (
            plan.fears.map((fear) => (
              <p key={fear} className="notice notice-warn">
                {fear}.
              </p>
            ))
          ) : (
            <p className="text-sm text-muted">No hard counter or enemy combo stands out.</p>
          )}
          {plan.ourCombos.map((combo) => (
            <p key={combo} className="notice notice-done">
              Your combo: {combo}.
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="label-caps text-muted">Lanes</h3>
        <ul className="grid gap-2 md:grid-cols-3">
          {plan.lanes.map((lane) => (
            <li key={lane.name} className="flex flex-col gap-1 rounded-sm bg-raised px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{lane.name}</span>
                <span className={`micro ${VERDICT_STYLES[lane.verdict]}`}>{VERDICT_LABELS[lane.verdict]}</span>
              </div>
              <p className="text-sm">
                {lane.ours.map(heroName).join(" + ")} <span className="text-muted">vs</span>{" "}
                {lane.theirs.map(heroName).join(" + ") || "nobody"}
              </p>
              <p className="text-xs text-muted">{lane.text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="label-caps text-muted">Each player</h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {players.map((player) => (
            <PlayerCard
              key={player.position}
              player={player}
              heroName={heroName(player.heroId)}
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
  icon,
  playerName,
  isMine,
}: {
  player: PlayerPlan;
  heroName: string;
  icon: string | undefined;
  playerName: string | null;
  isMine: boolean;
}) {
  const build = player.build;
  return (
    <li
      aria-label={`${heroName}, position ${player.position}`}
      className={`flex flex-col gap-2 rounded-sm bg-raised p-3 ${isMine ? "ring-1 ring-accent" : ""}`}
    >
      <div className="flex items-center gap-2">
        {icon && <Image src={icon} alt="" width={32} height={32} className="size-8 shrink-0 rounded-xs" />}
        <div className="flex min-w-0 flex-col">
          <span className="font-heading text-xl font-bold leading-6">{heroName}</span>
          <span className="text-xs text-muted">
            {playerName ?? POSITION_NAMES[player.position - 1]} · <span className="micro">Pos {player.position}</span>
          </span>
        </div>
      </div>
      <p className="text-sm">{player.job}</p>
      {build ? (
        <div className="flex flex-col gap-2">
          <ItemRow label="Start" items={build.start} />
          {build.lane.length > 0 && <ItemRow label="Lane" items={build.lane} />}
          <ItemRow label="Core, in order" items={build.core} showMinute />
          {build.situational.length > 0 && <ItemRow label="If needed" items={build.situational} />}
          <Reasons items={[...build.core, ...build.situational]} />
        </div>
      ) : (
        <p className="text-xs text-muted">No item data for this hero yet.</p>
      )}
    </li>
  );
}

function ItemRow({ label, items, showMinute }: { label: string; items: BuildItem[]; showMinute?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="micro text-muted">{label}</span>
      <ol className="flex flex-wrap gap-1">
        {items.map((item) => (
          <li key={item.itemId} title={item.reason ? `${item.name}: ${item.reason}` : item.name} className="flex flex-col items-center gap-0.5">
            <span className={`block rounded-xs ${item.reason ? "ring-1 ring-accent" : ""}`}>
              <Image src={ITEM_CDN + item.img} alt={item.name} width={32} height={24} className="h-6 w-8 rounded-xs object-cover" />
            </span>
            {showMinute && <span className="num text-xs text-subtle">{item.minute}m</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One line per item that is in the build because of the enemy lineup. */
function Reasons({ items }: { items: BuildItem[] }) {
  const changed = items.filter((item) => item.reason);
  if (!changed.length) return null;
  return (
    <ul className="flex flex-col gap-0.5 text-xs">
      {changed.map((item) => (
        <li key={item.itemId}>
          <span className="text-accent">{item.name}</span> <span className="text-muted">{item.reason}</span>
        </li>
      ))}
    </ul>
  );
}
