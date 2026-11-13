import { CutOutline, HeroFace } from "@/components/hero-frame";
import { Icon } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITIONS, type Position } from "@/lib/engine/types";
import { POSITION_NAMES } from "@/lib/party";
import { seatCount, type PartySeat } from "@/lib/party-seats";

/** A hero's name and 16:9 portrait; the portrait is missing when the hero list couldn't be loaded. */
interface HeroArt {
  name: string;
  image?: string;
}

type Status = PartySeat["status"] | "captain";

/** How a player holds their seat, in words: In Party, Invited, Not on Site, or Draft Captain. */
function StatusLine({ status }: { status: Status }) {
  if (status === "in")
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <span aria-hidden className="live-dot text-radiant" />
        In Party
      </span>
    );
  if (status === "captain")
    return (
      <span className="flex items-center gap-1.5 text-xs text-accent [&_svg]:size-3">
        <Icon name="crown" />
        Draft Captain
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted [&_svg]:size-3">
      <span className={status === "invited" ? "text-warn" : "text-subtle"}>
        <Icon name={status === "invited" ? "clock" : "monitor"} />
      </span>
      {status === "invited" ? "Invited" : "Not on Site"}
    </span>
  );
}

/**
 * The Team Seats in a party: each position holds a member (In Party), a player seated who hasn't
 * joined (Invited while their pop-up shows, then Not on Site), or nobody. Seated players are planned
 * with their own heroes, the same as members. One row per seat on a phone, with the state on the right.
 */
export function PartySeats({
  title,
  seats,
  userId,
  captainId,
  hero,
  heroAt,
}: {
  /** The party's name: "Can's Party". */
  title: string;
  seats: PartySeat[];
  userId: string;
  captainId: string | null;
  hero: (id: number) => HeroArt;
  /** The hero picked or planned for a position, shown as a face in its seat. */
  heroAt: (position: Position) => number | null;
}) {
  return (
    <section aria-label="Team Seats" className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span aria-hidden className="live-dot text-radiant" />
        <span className="font-semibold text-fg">{title}</span>
        <span className="text-subtle">{seatCount(seats)}</span>
      </p>
      <ul
        aria-label="Seats"
        className="grid min-w-0 divide-line rounded-xl bg-surface ring-1 ring-line ring-inset max-sm:divide-y sm:grid-cols-5 sm:divide-x"
      >
        {POSITIONS.map((position) => {
          const seat = seats.find((s) => s.position === position);
          const status: Status | null = seat ? (seat.id === captainId ? "captain" : seat.status) : null;
          const heroId = heroAt(position);
          const art = heroId ? hero(heroId) : null;
          return (
            <li
              key={position}
              data-seat={position}
              className="relative flex min-h-18 min-w-0 items-center gap-3 px-5 py-4 max-sm:min-h-16 max-sm:px-4 max-sm:py-3"
            >
              {art?.image ? (
                <HeroFace portrait={art.image} name={art.name} size={40} />
              ) : (
                <span className="relative size-10 shrink-0" aria-hidden>
                  <CutOutline width={40} height={40} />
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-1.5 max-sm:gap-1">
                <span className="micro flex items-start gap-1.5 text-subtle">
                  <PositionIcon position={position} size={12} className="mt-0.5 shrink-0" />
                  {POSITION_NAMES[position]}
                </span>
                {seat?.id === userId ? (
                  <span className="micro w-fit rounded-full bg-radiant px-2 leading-5 font-semibold text-bg">You</span>
                ) : seat ? (
                  <span className="text-sm font-semibold break-words text-fg">{seat.name}</span>
                ) : (
                  <span className="text-sm text-subtle">Open</span>
                )}
                {status && (
                  <span className="max-sm:hidden">
                    <StatusLine status={status} />
                  </span>
                )}
              </span>
              {status && (
                <span className="ml-auto sm:hidden">
                  <StatusLine status={status} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
