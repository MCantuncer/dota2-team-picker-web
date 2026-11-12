import type { LanePlan, LaneVerdict, PlayerPlan } from "@/lib/engine/game-plan";
import type { PairLane } from "@/lib/engine/lane-odds";
import { HeroArt, HeroFace, HeroStage, type HeroArtPlacement } from "./hero-frame";
import { PositionLabel } from "./position-label";

interface Art {
  heroName: (id: number) => string;
  /** Wide hero portraits (16:9) by hero id: faces are cropped from them and renders found from them. */
  icons: Record<number, string>;
}

/** The enemy positions in each lane, in the order the plan lists the lane's enemies (game-plan.ts LANES). */
const ENEMY_POSITIONS: Record<string, number[]> = { "Safe lane": [3, 4], Mid: [2], "Off lane": [1, 5] };
const LANE_TITLES: Record<string, string> = { "Safe lane": "Safe Lane", Mid: "Mid", "Off lane": "Off Lane" };
const VERDICT_WORDS: Record<LaneVerdict, string> = { win: "Won", even: "Even", hard: "Hard" };
const VERDICT_TEXT: Record<LaneVerdict, string> = { win: "text-radiant", even: "text-muted", hard: "text-dire" };
const VERDICT_CHIPS: Record<LaneVerdict, string> = { win: "bg-radiant-tint text-radiant", even: "bg-raised text-muted", hard: "bg-dire-tint text-dire" };
const VERDICT_STROKES: Record<LaneVerdict, string> = { win: "var(--radiant)", even: "var(--line-control)", hard: "var(--dire)" };

/** One placement for both versus frames, so the two faces meet at the same height and scale. */
const VERSUS_ART: HeroArtPlacement = { width: 300, at: [0.5, 0.42] };

/**
 * The lanes on the logo's map (Radiant bottom left), in a 300 unit square: the line each lane runs on, where our two
 * faces and theirs sit, and where the lane's name goes. Mid is the logo's diagonal.
 */
const MAP: Record<string, { path: string; ours: [number, number][]; theirs: [number, number][]; label: { x: number; y: number; end?: boolean } }> = {
  "Off lane": { path: "M30 252 V52 Q30 30 52 30 H248", ours: [[30, 160], [30, 112]], theirs: [[112, 30], [160, 30]], label: { x: 62, y: 66 } },
  Mid: { path: "M50 250 L250 50", ours: [[116, 184]], theirs: [[184, 116]], label: { x: 140, y: 192 } },
  "Safe lane": { path: "M48 270 H248 Q270 270 270 248 V48", ours: [[140, 270], [188, 270]], theirs: [[270, 188], [270, 140]], label: { x: 248, y: 214, end: true } },
};

/** The pair the player meets most: their hero against the enemy most likely in the lane (the highest weight). */
export function playerPair(lane: LanePlan, heroId: number): (PairLane & { weight: number }) | undefined {
  return (lane.pairs ?? []).filter((p) => p.hero === heroId).reduce<(PairLane & { weight: number }) | undefined>((best, p) => (!best || p.weight > best.weight ? p : best), undefined);
}

const pct = (n: number, of: number) => Math.round((n / of) * 100);

/**
 * The Game Story's lane board (Can's go on the Your Game mockup, 2026-11-12): the three lanes on the logo's map, each
 * coloured by its verdict with the player's lane lit, then the player against the enemy they meet most as two
 * renders, and that pair's real lane results as a won, even and lost bar with the counts.
 */
export function LaneBoard({ lanes, player, heroName, icons }: Art & { lanes: LanePlan[]; player: PlayerPlan }) {
  const lane = lanes.find((l) => l.ours.includes(player.heroId));
  if (!lane) return null;
  const pair = playerPair(lane, player.heroId);
  const enemy = pair?.enemy ?? lane.theirs[0];
  const enemyPosition = enemy !== undefined && lane.theirs.length === ENEMY_POSITIONS[lane.name]?.length ? ENEMY_POSITIONS[lane.name]![lane.theirs.indexOf(enemy)] : undefined;
  return (
    <section aria-labelledby="lane-board-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h3 id="lane-board-title" className="text-[1.375rem] font-semibold tracking-[-0.02em] text-fg">
          Lanes
        </h3>
        {pair && <span className="text-sm text-muted">{pair.allRanks ? "Lane results from all ranks" : "Lane results at your rank"}</span>}
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[18.75rem_minmax(0,1fr)]">
        <LaneMap lanes={lanes} mine={lane} heroName={heroName} icons={icons} />
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid grid-cols-2 items-center gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
            <span className={`chip col-span-full h-6 justify-self-start px-2.5 text-[0.8125rem] font-medium shadow-none sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-self-center ${VERDICT_CHIPS[lane.verdict]}`}>
              Lane: {VERDICT_WORDS[lane.verdict]}
            </span>
            <Versus heroId={player.heroId} position={player.position} side="ours" heroName={heroName} icons={icons} />
            {enemy !== undefined ? <Versus heroId={enemy} position={enemyPosition} side="theirs" heroName={heroName} icons={icons} /> : <span className="text-sm text-muted">No enemy laner</span>}
          </div>
          {pair && <PairBar pair={pair} heroName={heroName} />}
          <div className="flex max-w-[62ch] flex-col gap-3">
            <p className="text-[0.9375rem] text-fg">{lane.text}</p>
            <p className="text-[0.9375rem] text-fg">{player.job}</p>
            {player.fallbacks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h4 className="text-sm font-medium text-muted">If It Goes Wrong</h4>
                <ul className="flex flex-col gap-1 text-sm text-fg/85">
                  {player.fallbacks.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The three lanes on the logo's map, as a picture with its verdicts said in its name. */
function LaneMap({ lanes, mine, heroName, icons }: Art & { lanes: LanePlan[]; mine: LanePlan }) {
  const summary = lanes.map((l) => `${LANE_TITLES[l.name] ?? l.name} ${VERDICT_WORDS[l.verdict].toLowerCase()}${l === mine ? " (yours)" : ""}`).join(", ");
  const at = ([x, y]: [number, number]) => ({ left: `${(x / 300) * 100}%`, top: `${(y / 300) * 100}%` });
  return (
    <div role="img" aria-label={`Lane map: ${summary}.`} className="relative aspect-square w-full max-w-[18.75rem] justify-self-center rounded-xl border border-line-hover bg-surface">
      <svg viewBox="0 0 300 300" className="absolute inset-0 size-full" aria-hidden>
        <path d="M0 300 V200 L100 300 Z" fill="var(--radiant)" opacity="0.12" />
        <path d="M300 0 V100 L200 0 Z" fill="var(--dire)" opacity="0.12" />
        {lanes.map((l) => {
          const m = MAP[l.name];
          if (!m) return null;
          const stroke = VERDICT_STROKES[l.verdict];
          return (
            <g key={l.name} opacity={l === mine ? 1 : 0.55}>
              {l === mine && <path d={m.path} fill="none" stroke={stroke} strokeWidth="16" strokeLinecap="round" opacity="0.2" />}
              <path d={m.path} fill="none" stroke={stroke} strokeWidth={l === mine ? 7 : 5} strokeLinecap="round" />
            </g>
          );
        })}
        <circle cx="28" cy="272" r="9" fill="var(--radiant)" />
        <circle cx="272" cy="28" r="9" fill="var(--dire)" />
      </svg>
      {lanes.flatMap((l) => {
        const m = MAP[l.name];
        if (!m) return [];
        const faces = [
          ...l.ours.map((id, i) => ({ id, spot: m.ours[i], enemy: false })),
          ...l.theirs.map((id, i) => ({ id, spot: m.theirs[i], enemy: true })),
        ];
        return [
          ...faces.flatMap(({ id, spot, enemy }) =>
            spot && icons[id]
              ? [
                  <span key={`${l.name}-${id}`} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[0.375rem] shadow-[0_0_0_3px_var(--surface)]" style={at(spot)}>
                    <HeroFace portrait={icons[id]} name={heroName(id)} size={30} isEnemy={enemy} isDecorative />
                  </span>,
                ]
              : [],
          ),
          <span
            key={`${l.name}-label`}
            className={`absolute flex flex-col whitespace-nowrap leading-tight ${m.label.end ? "-translate-x-full items-end text-right" : ""}`}
            style={at([m.label.x, m.label.y])}
          >
            <span className={`text-[0.8125rem] font-semibold ${l === mine ? VERDICT_TEXT[l.verdict] : "text-muted"}`}>{LANE_TITLES[l.name] ?? l.name}</span>
            <span className={`text-xs ${l === mine ? VERDICT_TEXT[l.verdict] : "text-subtle"}`}>{VERDICT_WORDS[l.verdict]}</span>
          </span>,
        ];
      })}
    </div>
  );
}

/** A hero's render in a Lane Cut frame, ours facing right and the enemy mirrored, with the name and role under it. */
function Versus({ heroId, position, side, heroName, icons }: Art & { heroId: number; position?: number; side: "ours" | "theirs" }) {
  const enemy = side === "theirs";
  const portrait = icons[heroId];
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${enemy ? "items-end text-right" : ""}`}>
      <HeroStage size={120} isEnemy={enemy} className={`relative block aspect-[3/2] w-full max-w-72 overflow-hidden ${enemy ? "" : "lane-cut-you"}`}>
        {portrait && <HeroArt heroId={heroId} portrait={portrait} placement={VERSUS_ART} mirror={enemy} />}
      </HeroStage>
      <span className="flex flex-col gap-0.5">
        <b className="text-base font-semibold text-fg">{heroName(heroId)}</b>
        {position !== undefined && (
          <span className={`flex items-center gap-1.5 text-[0.8125rem] text-muted ${enemy ? "justify-end" : ""}`}>
            {enemy && "Enemy"}
            <PositionLabel position={position} size={14} iconClassName={enemy ? "text-dire" : "text-radiant"} />
          </span>
        )}
      </span>
    </div>
  );
}

/** The pair's lane results: won, even and lost as one bar, the shares big, and how many lanes they come from. */
function PairBar({ pair, heroName }: { pair: PairLane; heroName: (id: number) => string }) {
  const parts = [
    { key: "won", share: pct(pair.won, pair.games), label: `${heroName(pair.hero)} Won`, bar: "bg-radiant", text: "text-radiant" },
    { key: "even", share: pct(pair.drawn, pair.games), label: "Even", bar: "bg-line-control", text: "text-fg" },
    { key: "lost", share: pct(pair.lost, pair.games), label: `${heroName(pair.enemy)} Won`, bar: "bg-dire", text: "text-dire" },
  ];
  return (
    <figure className="flex flex-col gap-2.5">
      <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-md">
        {parts.map((p) => (p.share > 0 ? <i key={p.key} className={`block ${p.bar}`} style={{ flex: p.share }} /> : null))}
      </div>
      <dl className="grid grid-cols-3 gap-3 text-[0.8125rem] text-muted">
        {parts.map((p, i) => (
          <div key={p.key} className={`flex flex-col-reverse justify-end ${i === 1 ? "items-center text-center" : i === 2 ? "items-end text-right" : ""}`}>
            <dt>{p.label}</dt>
            <dd className={`num text-xl font-semibold leading-tight tracking-[-0.02em] ${p.text}`}>{p.share}%</dd>
          </div>
        ))}
      </dl>
      <figcaption className="text-[0.8125rem] text-subtle">
        <span className="num">{pair.games.toLocaleString("en-US")}</span> lanes of {heroName(pair.hero)} against {heroName(pair.enemy)}
      </figcaption>
    </figure>
  );
}
