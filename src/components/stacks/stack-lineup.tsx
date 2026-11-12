import Image from "next/image";
import type { ReactNode } from "react";
import { Avatar } from "@/components/account-menu";
import { PositionIcon } from "@/components/position-icon";
import { RankMedal } from "@/components/rank-medal";
import { rankName } from "@/lib/rank";
import type { Seat } from "@/lib/stack-seats";

export const POSITION_NAMES: Record<number, string> = {
  1: "Safe Lane",
  2: "Mid Lane",
  3: "Off Lane",
  4: "Soft Support",
  5: "Hard Support",
};

/** A hero's name and 16:9 portrait; the portrait is missing when the hero list couldn't be loaded. */
export interface HeroArt {
  name: string;
  image?: string;
}

/** Extra heroes shown under a seat. */
const ALSO = 2;

/**
 * The Stack as a lineup: one equal seat per player in position order, each with the top hero for their main
 * position, then who covers each position. Players whose heroes you can't see show their avatar instead.
 */
export function StackLineup({
  seats,
  hero,
  youId,
  action,
}: {
  seats: Seat[];
  hero: (id: number) => HeroArt;
  youId: string;
  /** A control on the right of the Lineup title. */
  action?: ReactNode;
}) {
  const shared = seats.some((s) => s.positions.length > 0);
  return (
    <>
      <section aria-labelledby="lineup-heading" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="lineup-heading" className="section-title">
            Lineup
          </h2>
          <p className="text-sm text-subtle">
            {shared ? "Each player's top hero for the position they play most." : "Everyone in this Stack."}
          </p>
          {action && <div className="ml-auto">{action}</div>}
        </div>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-5">
          {seats.map((s) => (
            <SeatCard key={s.id} seat={s} hero={hero} you={s.id === youId} />
          ))}
        </ul>
      </section>
      {shared && <Coverage seats={seats} />}
    </>
  );
}

function SeatCard({ seat: s, hero, you }: { seat: Seat; hero: (id: number) => HeroArt; you: boolean }) {
  const top = s.heroes[0] ? hero(s.heroes[0]) : null;
  const rank = rankName(s.rankTier);
  return (
    <li className="grid min-w-0 grid-cols-[8.5rem_1fr] overflow-hidden rounded-md bg-surface ring-1 ring-inset ring-line sm:grid-cols-1">
      <div className="relative aspect-video overflow-hidden bg-bg max-sm:aspect-auto max-sm:h-full">
        {top?.image ? (
          <Image
            src={top.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 9rem"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full min-h-20 flex-col items-center justify-center gap-1.5">
            <Avatar
              account={{
                name: s.name,
                avatarUrl: s.avatarUrl,
                detail: null,
                steamLinked: false,
              }}
              size={44}
            />
            {s.shared && <span className="micro text-subtle">No heroes saved</span>}
          </div>
        )}
        {top && (
          <>
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-bg/95 to-transparent" />
            <span className="absolute bottom-1.5 left-2.5 text-sm font-semibold text-fg">{top.name}</span>
          </>
        )}
        {you && (
          <span className="absolute right-1.5 top-1.5 rounded-xs bg-radiant px-1.5 text-xs font-semibold leading-4 text-bg">
            You
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1 p-3">
        {s.position ? (
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-sm text-muted">
              <PositionIcon position={s.position} size={18} className="text-accent" />
              {POSITION_NAMES[s.position]}
            </span>
            <span
              className="micro pl-6 text-subtle"
              title={
                s.played
                  ? `Played ${POSITION_NAMES[s.position]} in ${s.played.games} of their last ${s.played.of} games with a known position`
                  : undefined
              }
            >
              {s.played ? (
                <>
                  Played in <span className="num text-muted">{s.played.games}</span> of last {s.played.of} games
                </>
              ) : (
                "No recent games yet"
              )}
            </span>
          </span>
        ) : (
          <span className="text-sm text-subtle">
            {!s.shared ? "Heroes not shared" : s.positions.length ? "Any position" : "No positions yet"}
          </span>
        )}
        <span className="mt-1 flex min-w-0 items-center gap-1.5">
          <span className="truncate text-base font-semibold text-fg">{s.name}</span>
          {s.role !== "player" && <span className="chip shrink-0">{s.role === "owner" ? "Owner" : "Manager"}</span>}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted">
          {s.rankTier && rank ? (
            <>
              <RankMedal rankTier={s.rankTier} size={24} />
              {rank}
            </>
          ) : (
            <span className="text-subtle">No rank</span>
          )}
        </span>
        {s.heroes.length > 1 && (
          <span className="mt-2 flex items-center gap-1.5 border-t border-line pt-2.5 max-sm:hidden">
            {s.heroes.slice(1, 1 + ALSO).map((id) => {
              const h = hero(id);
              return h.image ? (
                <Image
                  key={id}
                  src={h.image}
                  alt={h.name}
                  title={h.name}
                  width={40}
                  height={22}
                  unoptimized
                  className="h-5.5 w-10 rounded-xs object-cover"
                />
              ) : (
                <span key={id} className="micro text-subtle">
                  {h.name}
                </span>
              );
            })}
            {s.heroes.length > 1 + ALSO && (
              <span className="micro ml-auto text-subtle">+{s.heroes.length - 1 - ALSO}</span>
            )}
          </span>
        )}
      </div>
    </li>
  );
}

/** Who in the Stack plays each position; an uncovered position is marked in amber. */
function Coverage({ seats }: { seats: Seat[] }) {
  return (
    <section aria-labelledby="coverage-heading" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="coverage-heading" className="section-title">
          Position Coverage
        </h2>
        <p className="text-sm text-subtle">Who in the Stack plays each position.</p>
      </div>
      <ul className="grid grid-cols-1 overflow-hidden rounded-md ring-1 ring-inset ring-line sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((p) => {
          const who = seats.filter((s) => s.positions.includes(p));
          return (
            <li
              key={p}
              className="flex items-center gap-2.5 border-line px-3.5 py-3 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r"
            >
              <PositionIcon position={p} size={24} className={who.length ? "text-muted" : "text-warn"} />
              <span className="flex min-w-0 flex-col text-sm leading-tight">
                <span className="font-semibold text-fg">{POSITION_NAMES[p]}</span>
                {!who.length && <span className="text-warn">Nobody yet</span>}
              </span>
              <span
                className="ml-auto flex"
                aria-label={who.length ? `Played by ${who.map((s) => s.name).join(", ")}` : undefined}
              >
                {who.map((s, i) => (
                  <span key={s.id} title={s.name} className={`rounded-full ring-2 ring-bg ${i ? "-ml-1.5" : ""}`}>
                    <Avatar
                      account={{
                        name: s.name,
                        avatarUrl: s.avatarUrl,
                        detail: null,
                        steamLinked: false,
                      }}
                      size={24}
                    />
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
