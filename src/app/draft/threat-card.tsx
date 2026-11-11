import { HeroArt, HeroStage, LaneMark, type HeroArtPlacement } from "@/components/hero-frame";
import { POSITION_NAMES } from "@/lib/draft";
import type { DraftThreat } from "@/lib/engine/threat-plan";
import type { Position } from "@/lib/engine/types";
import { Face, type PlanHeroOf } from "./team-plan";

/*
 * Answer card on the Draft page: a dangerous enemy core is picked and your team has fewer than two of his answers.
 * His win rate against teams with none, one and two or more of his answers, the step your team is on now, and the
 * open answers for each empty seat with the pick engine's own matchup numbers. Facts only, from ranked games.
 */

/** The card's render puts the face on the same spot at the same scale for every hero. */
const CARD_ART: HeroArtPlacement = { width: 280, at: [0.56, 0.4] };
/** The stair's scale: a bar this many win rate points tall at the bottom, and the top. */
const STAIR_FLOOR = 40;
const STAIR_TOP = 62;
const STEP_NAMES = ["No Answers", "One Answer", "Two or More"];

const percent = (n: number) => `${n.toFixed(1)}%`;
/** Matchup points with a real minus sign. */
const points = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;
const count = (n: number) => n.toLocaleString("en-US");

/** The sentence over the stair: where he stands against teams like yours, and what one more answer does. */
export function threatSentence(threat: DraftThreat, hero: PlanHeroOf): string {
  const [none, one, two] = threat.plan.stair;
  const name = hero(threat.hero).name;
  const haveNames = threat.have.map((a) => hero(a.hero).name).join(" and ");
  const start = `${name} wins ${percent(none.winRate)} against teams with none of his answers.`;
  if (threat.step === 0) return `${start} Your team has none yet. One answer drops him to ${percent(one.winRate)}, two to ${percent(two.winRate)}.`;
  return `${start} Your team has one, ${haveNames}. A second answer drops him to ${percent(two.winRate)}.`;
}

interface ThreatCardProps {
  threat: DraftThreat;
  /** Other dangerous enemy cores in the draft, one line each. */
  others: { hero: number; step: 0 | 1 | 2 }[];
  hero: PlanHeroOf;
  /** The player's own position, to mark that seat as their pick. */
  myPosition: Position | null;
  /** Ranked games the stair comes from. */
  games: number;
}

export function ThreatCard({ threat, others, hero, myPosition, games }: ThreatCardProps) {
  const him = hero(threat.hero);
  const { stair } = threat.plan;
  const height = (rate: number) => Math.round(((Math.min(STAIR_TOP, Math.max(STAIR_FLOOR, rate)) - STAIR_FLOOR) / (STAIR_TOP - STAIR_FLOOR)) * 96);
  const tone = ["text-dire", "text-fg", "text-radiant"];
  const fill = ["bg-dire-strong", "bg-line-control", "bg-radiant-strong"];
  return (
    <section
      aria-labelledby="threat-title"
      className="grid rounded-xl bg-surface ring-1 ring-line ring-inset lg:grid-cols-[minmax(0,1fr)_22.5rem]"
    >
      <div className="flex min-w-0 flex-col gap-5 p-5 md:p-6 lg:pr-11">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LaneMark className="text-fg" />
          <h2 id="threat-title" className="text-base font-semibold text-fg">
            Answer {him.name}
          </h2>
          <span className="chip micro ml-auto bg-dire-tint font-semibold text-dire">
            Their Pos {threat.position} {POSITION_NAMES[threat.position - 1]}
          </span>
        </div>

        <div className="flex items-start gap-4">
          {him.portrait && (
            <HeroStage size={96} isEnemy className="relative h-[4.25rem] w-[6.5rem] shrink-0 overflow-hidden lg:h-24 lg:w-[10.5rem]">
              <HeroArt heroId={threat.hero} portrait={him.portrait} placement={CARD_ART} />
            </HeroStage>
          )}
          <p className="text-sm text-muted">{threatSentence(threat, hero)}</p>
        </div>

        {threat.open.length > 0 && (
          <ul aria-label="Open Answers" className="flex flex-col gap-3">
            {threat.open.map((seat) => {
              const isMine = seat.position === myPosition;
              return (
                <li key={seat.position} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex w-36 shrink-0 flex-col">
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      {isMine ? "Your Pick" : "Teammates"}
                      {isMine && <span className="micro rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">You</span>}
                    </span>
                    <span className="micro text-subtle">
                      Pos {seat.position} {POSITION_NAMES[seat.position - 1]}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {seat.heroes.map((a) => (
                      <span key={a.hero} className="flex items-center gap-2 rounded-lg bg-raised py-1.5 pr-3 pl-1.5 ring-1 ring-line-strong ring-inset">
                        <Face id={a.hero} hero={hero} size={32} />
                        <span className="flex flex-col">
                          <span className="text-sm text-fg">{hero(a.hero).name}</span>
                          <span className="micro text-radiant tabular-nums">{points(a.edge)} for him</span>
                        </span>
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {others.length > 0 && (
          <ul aria-label="Other Dangerous Heroes" className="flex flex-col gap-2">
            {others.map((o) => (
              <li key={o.hero} className="flex items-center gap-2 text-sm text-muted">
                <Face id={o.hero} hero={hero} size={20} isEnemy />
                {hero(o.hero).name} is dangerous too: your team has {o.step === 0 ? "none" : o.step === 1 ? "one" : "two or more"} of
                his answers.
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-subtle">
          From {count(games)} ranked All Pick games of the last 10 days. Points are the pick engine&apos;s matchups: how far
          below his expected win rate he plays against that hero. Only open heroes who often play the seat show.
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-line p-5 md:p-6 lg:border-t-0 lg:border-l">
        <span className="micro text-subtle">His Win Rate by Your Team&apos;s Answers</span>
        <div
          role="img"
          aria-label={`His win rate: ${STEP_NAMES.map((s, i) => `${s} ${percent(stair[i]!.winRate)}`).join(", ")}. Your team: ${STEP_NAMES[threat.step]}.`}
          className="grid grid-cols-3 gap-3"
        >
          {stair.map((s, i) => {
            const isNow = i === threat.step;
            return (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex h-32 flex-col justify-end gap-1.5">
                  <span className={`text-lg font-semibold tabular-nums ${tone[i]}`}>{percent(s.winRate)}</span>
                  <span
                    className={`rounded-xs ${fill[i]} ${isNow ? "" : "opacity-60"}`}
                    style={{ height: Math.max(4, height(s.winRate)) }}
                  />
                </div>
                <span className="flex flex-col">
                  <span className={`text-sm ${isNow ? "font-semibold text-fg" : "text-muted"}`}>{STEP_NAMES[i]}</span>
                  <span className="micro text-subtle tabular-nums">{count(s.games)} games</span>
                </span>
                {isNow && (
                  <span className="chip micro chip-accent self-start font-semibold whitespace-nowrap">
                    {threat.have.map((a) => (
                      <Face key={a.hero} id={a.hero} hero={hero} size={20} />
                    ))}
                    Your Team
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
