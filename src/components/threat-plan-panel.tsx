import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { DraftThreat, ThreatLane } from "@/lib/engine/threat-plan";
import type { StairStep } from "@/lib/engine/threat";
import type { Snapshot } from "@/lib/engine/types";
import { HeroArt, HeroFace, HeroStage, LaneMark, type HeroArtPlacement } from "./hero-frame";
import { Icon, type IconName } from "./icon";
import { ThreatTiles } from "./threat-tiles";

/*
 * Game Plan Against a dangerous enemy core, in the Game Story once all ten heroes are in (it takes his line in Danger
 * Heroes). Four rows of measured facts, each a sentence and a picture: your answers on his stair, his lane with your
 * laners in it, when he finishes his big item, and his win rate by game length. The timing and length rows say when
 * he wins, not why, so they give no advice. With more than one dangerous enemy, a row of tiles (most dangerous first)
 * picks whose plan shows.
 */

const ITEM_CDN = "https://cdn.cloudflare.steamstatic.com";
const ART: HeroArtPlacement = { width: 280, at: [0.56, 0.4] };
const STEP_WORDS = ["none", "one", "two or more"];
const COUNT_WORDS = ["None", "One", "Two", "Three", "Four", "Five"];
const LENGTH_NAMES = ["Under 30", "30 to 35", "35 to 40", "40 to 45", "45+"];
/** A lane that goes this much more (or less) his way than usual is worth a line in the verdict. */
const LANE_CLEAR = 0.05;
/** Bars at or past these win rates are colored: his good games red, his bad games green. */
const HIGH = 53;
const LOW = 47;

const percent = (n: number) => `${n.toFixed(1)}%`;
const count = (n: number) => n.toLocaleString("en-US");
const lostShare = (c: ThreatLane["with"]) => (c[0] ? c[3] / c[0] : 0);
const toneOf = (rate: number) => (rate >= HIGH ? "text-dire" : rate <= LOW ? "text-radiant" : "text-fg");
const fillOf = (rate: number) => (rate >= HIGH ? "bg-dire-strong" : rate <= LOW ? "bg-radiant-strong" : "bg-line-control");

export type ThreatHeroOf = (id: number) => { name: string; portrait?: string };

/** The lane that moves most from his usual one. */
function keyLane(lanes: ThreatLane[]): ThreatLane | undefined {
  const moved = (l: ThreatLane) => Math.abs(lostShare(l.with) - lostShare(l.usual));
  return [...lanes].sort((a, b) => moved(b) - moved(a))[0];
}

/** One line over the rows: how many of his answers you have, and a lane that goes clearly against him. */
export function threatVerdict(threat: DraftThreat, hero: ThreatHeroOf): string {
  const n = threat.have.length;
  const answers =
    n === 0 ? "None of his answers are in your draft" : n === 1 ? "One of his answers is in your draft" : `${COUNT_WORDS[n] ?? n} of his answers are in your draft`;
  const lane = keyLane(threat.lanes);
  const helps = lane && lostShare(lane.with) - lostShare(lane.usual) >= LANE_CLEAR;
  return helps ? `${answers}, and ${hero(lane.ally).name} is in his lane.` : `${answers}.`;
}

function Faced({ id, hero }: { id: number; hero: ThreatHeroOf }) {
  const { name, portrait } = hero(id);
  return (
    <span className="inline-flex items-center gap-1.5 align-middle font-semibold text-fg">
      {portrait && <HeroFace portrait={portrait} name={name} size={20} isDecorative />}
      {name}
    </span>
  );
}

function Row({ icon, title, say, picture }: { icon: IconName | "lane"; title: string; say: ReactNode; picture: ReactNode }) {
  return (
    <div className="grid items-start gap-4 border-t border-line py-5 first:border-t-0 lg:grid-cols-[9rem_minmax(0,1fr)_20rem] lg:gap-8">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-fg">
        {icon === "lane" ? <LaneMark className="text-muted" /> : <Icon name={icon} />}
        {title}
      </h4>
      <div className="flex flex-col gap-2 text-sm text-muted">{say}</div>
      <div className="min-w-0">{picture}</div>
    </div>
  );
}

/**
 * Columns of bars with the value over each and a name under it. Every bar stands on one baseline and every name sits
 * in one row; your team's column gets a chip under its name instead of a taller column.
 */
function Bars({ steps, names, now, label }: { steps: StairStep[]; names: string[]; now?: number; label: string }) {
  const top = Math.max(60, ...steps.map((s) => s.winRate));
  const floor = 35;
  return (
    <div role="img" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => (
        <div key={names[i]} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex h-24 flex-col justify-end gap-1.5">
            <span className={`micro font-semibold tabular-nums ${toneOf(s.winRate)}`}>{percent(s.winRate)}</span>
            <span
              className={`rounded-xs ${fillOf(s.winRate)} ${now === undefined || now === i ? "" : "opacity-60"}`}
              style={{ height: Math.max(4, Math.round(((s.winRate - floor) / (top - floor)) * 64)) }}
            />
          </div>
          <span className={`micro ${now === i ? "font-semibold text-fg" : "text-subtle"}`}>{names[i]}</span>
          {now === i && <span className="chip micro chip-accent self-start font-semibold whitespace-nowrap">Your Team</span>}
        </div>
      ))}
    </div>
  );
}

interface ThreatPlanPanelProps {
  /** Every dangerous enemy core, most dangerous first. */
  threats: DraftThreat[];
  hero: ThreatHeroOf;
  items?: Snapshot["items"];
}

export function ThreatPlanPanel({ threats, hero, items }: ThreatPlanPanelProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const threat = threats.find((t) => t.hero === chosen) ?? threats[0];
  if (!threat) return null;
  const him = hero(threat.hero);
  const [none, , two] = threat.plan.stair;
  const now = threat.plan.stair[threat.step]!;
  const lanes = [...threat.lanes].sort((a, b) => lostShare(b.with) - lostShare(a.with));
  const lane = keyLane(threat.lanes);
  const pace = threat.pace;
  const item = pace ? items?.[pace.itemId] : undefined;
  const his = threat.length.his;
  const group = threat.length.group;
  const last = his.length - 1;
  return (
    <section aria-labelledby="threat-plan-title" className="flex flex-col rounded-xl bg-surface ring-1 ring-line ring-inset">
      {threats.length > 1 && (
        <div className="flex flex-col gap-4 border-b border-line p-5 md:p-6">
          <h3 className="text-sm font-semibold text-subtle">Dangerous Enemies</h3>
          <ThreatTiles threats={threats} chosen={threat.hero} hero={hero} onChoose={setChosen} />
        </div>
      )}
      <div className="flex items-center gap-4 p-5 md:p-6">
        {him.portrait && (
          <HeroStage size={96} isEnemy className="relative h-[4.25rem] w-[6.5rem] shrink-0 overflow-hidden lg:h-24 lg:w-[10.5rem]">
            <HeroArt heroId={threat.hero} portrait={him.portrait} placement={ART} />
          </HeroStage>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id="threat-plan-title" className="text-sm font-semibold text-subtle">
            Game Plan Against {him.name}
          </h3>
          <p className="text-lg font-semibold text-fg">{threatVerdict(threat, hero)}</p>
        </div>
      </div>

      <div className="flex flex-col px-5 md:px-6">
        <Row
          icon="swords"
          title="Your Answers"
          say={
            <p>
              {threat.have.length ? (
                <>
                  You have{" "}
                  {threat.have.map((a, i) => (
                    <span key={a.hero}>
                      {i > 0 && (i === threat.have.length - 1 ? " and " : ", ")}
                      <Faced id={a.hero} hero={hero} />
                    </span>
                  ))}
                  . He wins <span className={toneOf(now.winRate)}>{percent(now.winRate)}</span> against teams with{" "}
                  {STEP_WORDS[threat.step]} of his answers, and <span className={toneOf(none.winRate)}>{percent(none.winRate)}</span> against
                  teams with none.
                </>
              ) : (
                <>
                  You have none of his answers. He wins <span className={toneOf(none.winRate)}>{percent(none.winRate)}</span> against
                  teams like yours, and <span className={toneOf(two.winRate)}>{percent(two.winRate)}</span> against teams with two or
                  more.
                </>
              )}
            </p>
          }
          picture={
            <Bars
              steps={threat.plan.stair}
              names={["No Answers", "One", "Two or More"]}
              now={threat.step}
              label={`His win rate against teams with no answers ${percent(none.winRate)}, one ${percent(threat.plan.stair[1].winRate)}, two or more ${percent(two.winRate)}. Your team: ${STEP_WORDS[threat.step]}.`}
            />
          }
        />

        {lane && (
          <Row
            icon="lane"
            title="His Lane"
            say={
              <>
                <p>
                  With <Faced id={lane.ally} hero={hero} /> in his lane, he lost{" "}
                  <span className="text-radiant">{percent(lostShare(lane.with) * 100)}</span> of his lanes. He usually loses{" "}
                  {percent(lostShare(lane.usual) * 100)}.
                </p>
                <p className="text-xs text-subtle">A lane result counts every hero in the lane.</p>
              </>
            }
            picture={
              <div className="flex flex-col gap-2">
                {lanes.map((l) => {
                  const [games, won, drawn, lost] = l.with;
                  const { name, portrait } = hero(l.ally);
                  return (
                    <div key={l.ally} className="flex items-center gap-2">
                      {portrait && <HeroFace portrait={portrait} name={name} size={20} />}
                      <div
                        role="img"
                        aria-label={`With ${name}: he won ${percent((won / games) * 100)}, even ${percent((drawn / games) * 100)}, lost ${percent((lost / games) * 100)} of ${count(games)} lanes`}
                        className="flex h-3 flex-1 overflow-hidden rounded-xs"
                      >
                        <span className="bg-radiant-strong" style={{ width: `${(lost / games) * 100}%` }} />
                        <span className="bg-line-hover" style={{ width: `${(drawn / games) * 100}%` }} />
                        <span className="bg-dire-strong" style={{ width: `${(won / games) * 100}%` }} />
                      </div>
                      <span className="micro w-12 text-right font-semibold text-fg tabular-nums">{percent((lost / games) * 100)}</span>
                    </div>
                  );
                })}
                <span className="micro flex flex-wrap gap-x-3 text-subtle">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-xs bg-radiant-strong" />
                    Your Lane Won
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-xs bg-line-hover" />
                    Even
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-xs bg-dire-strong" />
                    His Lane Won
                  </span>
                </span>
              </div>
            }
          />
        )}

        {pace && (
          <Row
            icon="clock"
            title="His Timing"
            say={
              <>
                <p>
                  His most bought big item,{" "}
                  <span className="inline-flex items-center gap-1.5 align-middle font-semibold text-fg">
                    {item?.img && <Image src={ITEM_CDN + item.img} alt="" width={28} height={20} className="h-5 w-7 rounded-xs object-cover" />}
                    {item?.name ?? "his big item"}
                  </span>
                  , is usually done at {pace.minute} minutes. In games where it was done by {pace.minute - 2} he won{" "}
                  <span className={toneOf(pace.early.winRate)}>{percent(pace.early.winRate)}</span>; at {pace.minute + 1} to{" "}
                  {pace.minute + 3}, <span className={toneOf(pace.late.winRate)}>{percent(pace.late.winRate)}</span>.
                </p>
                <p className="text-xs text-subtle">
                  This shows when, not why: a fast item often comes from a game that was already going well.
                </p>
              </>
            }
            picture={
              <div
                role="img"
                aria-label={`His win rate by the minute ${item?.name ?? "the item"} was done: ${pace.minutes.map(([m, g, w]) => `${m} min ${percent((w / g) * 100)}`).join(", ")}`}
                className="flex flex-col gap-1.5"
              >
                <div className="flex h-16 items-end gap-0.5">
                  {pace.minutes.map(([m, g, w]) => {
                    const rate = (w / g) * 100;
                    return (
                      <span
                        key={m}
                        title={`${m} min: ${percent(rate)}`}
                        className={`flex-1 rounded-xs ${fillOf(rate)}`}
                        style={{ height: Math.max(4, Math.round(((Math.min(80, Math.max(30, rate)) - 30) / 50) * 64)) }}
                      />
                    );
                  })}
                </div>
                <span className="micro flex justify-between text-subtle tabular-nums">
                  <span>{pace.minutes[0]?.[0]} min</span>
                  <span>Minute Done</span>
                  <span>{pace.minutes.at(-1)?.[0]} min</span>
                </span>
              </div>
            }
          />
        )}

        {his.length > 1 && (
          <Row
            icon="trend"
            title="Game Length"
            say={
              <p>
                His win rate goes from <span className={toneOf(his[0]!.winRate)}>{percent(his[0]!.winRate)}</span> in games under 30
                minutes to <span className={toneOf(his[last]!.winRate)}>{percent(his[last]!.winRate)}</span> past 45.
                {/* The pooled line is for position 1 heroes, so it only stands next to a carry. */}
                {threat.position === 1 && group.length === his.length && (
                  <> The average carry goes from {percent(group[0]!.winRate)} to {percent(group[last]!.winRate)}.</>
                )}
              </p>
            }
            picture={<Bars steps={his} names={LENGTH_NAMES} label={`His win rate by game length: ${his.map((s, i) => `${LENGTH_NAMES[i]} ${percent(s.winRate)}`).join(", ")}`} />}
          />
        )}
      </div>
      <p className="px-5 pb-5 text-xs text-subtle md:px-6">
        From ranked All Pick games of the last 10 days (answers and game length) and STRATZ (lanes and items).
      </p>
    </section>
  );
}
