"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/account-menu";
import { Icon } from "@/components/icon";
import { PositionIcon } from "@/components/position-icon";
import { POSITION_NAMES } from "@/lib/draft";
import { RankMedal } from "@/components/rank-medal";
import type { HeroArt } from "@/components/stacks/stack-lineup";
import { bestPair, gameModeName, signatureHeroes, winPercent, type Friend, type SharedGame } from "@/lib/friends";
import { rankName } from "@/lib/rank";
import { createClient } from "@/lib/supabase/client";
import type { PartyRole } from "./friends-board";

/** The hero strip's columns; the third hero hides on phones. */
const STRIP_COLUMNS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3" };

/** Games listed before "Show All". */
const FIRST_GAMES = 5;

/**
 * One friend opened: their most played heroes, who they are, how you do together, and every game you
 * played as a pair in the last 60 days.
 */
export function FriendDetail({
  friend: f,
  games,
  heroes,
  partyRole,
  lastGame,
  className = "",
  onRemove,
}: {
  friend: Friend;
  games: SharedGame[];
  heroes: Record<number, HeroArt>;
  partyRole: PartyRole;
  /** "2 hours ago" for their last game, worked out by the page. */
  lastGame: string | null;
  className?: string;
  onRemove: () => void;
}) {
  const [all, setAll] = useState(false);
  const hero = (id: number): HeroArt => heroes[id] ?? { name: `Hero ${id}` };
  const signature = signatureHeroes(f, games);
  const pair = bestPair(games);
  const won = winPercent(f.together);
  const without = winPercent(f.without);
  const shown = all ? games : games.slice(0, FIRST_GAMES);

  return (
    <section aria-labelledby="friend-name" className={`card overflow-hidden ${className}`}>
      {signature.length > 0 && (
        <div className={`grid h-34 sm:h-40 ${STRIP_COLUMNS[signature.length] ?? ""}`}>
          {signature.map((r, i) => {
            const art = hero(r.heroId);
            const rate = winPercent(r);
            return (
              <div key={r.heroId} className={`relative overflow-hidden bg-bg ${i > 0 ? "border-l-2 border-surface" : ""} ${i === 2 ? "max-sm:hidden" : ""}`}>
                {art.image && <Image src={art.image} alt="" fill sizes="(min-width: 1024px) 18rem, 50vw" className="object-cover" />}
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-b from-transparent to-bg/90" />
                {i === 0 && <span className="chip absolute top-2.5 left-2.5 text-xs font-semibold text-fg">{f.shared ? "Most Played" : "Most Played With You"}</span>}
                <span className="absolute bottom-2 left-3 flex flex-col">
                  <span className="text-sm font-semibold text-fg">{art.name}</span>
                  <span className="text-xs text-muted">
                    <span className="num font-medium">{r.games}</span> {r.games === 1 ? "game" : "games"}
                    {rate !== null && <span className={rate >= 55 ? "font-semibold text-radiant" : ""}> · Won {rate}%</span>}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
        <Avatar account={{ name: f.name, avatarUrl: f.avatarUrl, detail: null, steamLinked: false }} size={64} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id="friend-name" className="text-2xl font-bold leading-tight text-fg">
            {f.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {f.rankTier !== null ? (
              <span className="flex items-center gap-1.5">
                <RankMedal rankTier={f.rankTier} size={22} />
                {rankName(f.rankTier)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-subtle">
                <Icon name="lock" />
                {f.shared ? "No rank yet" : "Rank hidden"}
              </span>
            )}
            {f.positions.map((p) => (
              <span key={p} className="chip h-6 gap-1.5 pl-1">
                <PositionIcon position={p} size={16} />
                {POSITION_NAMES[p - 1]}
              </span>
            ))}
            {lastGame && <span className="text-subtle">Last game {lastGame}</span>}
          </div>
        </div>
        <FriendActions friend={f} partyRole={partyRole} onRemove={onRemove} />
      </div>

      <dl className="grid grid-cols-2 border-b border-line md:grid-cols-[0.9fr_1.2fr_1.9fr_1fr] [&>div]:min-w-0 [&>div]:border-line [&>div]:px-5 [&>div]:py-3.5">
        <div className="border-r max-md:border-b">
          <dt className="text-xs text-subtle">Games Together</dt>
          <dd className="mt-1 text-2xl font-semibold text-fg">
            <span className="num text-2xl">{f.together.games}</span> <span className="text-xs font-normal text-subtle">60 days</span>
          </dd>
        </div>
        <div className="max-md:border-b md:border-r">
          <dt className="text-xs text-subtle">Won Together</dt>
          <dd className="mt-1 text-2xl font-semibold">
            {won === null ? <span className="text-subtle">No games</span> : <span className={`num text-2xl ${won >= 55 ? "text-radiant" : "text-fg"}`}>{won}%</span>}
            {without !== null && <span className="ml-1.5 text-xs font-normal text-subtle">{without}% without</span>}
            {won !== null && (
              <span aria-hidden className="relative mt-2 block h-1.5 rounded-full bg-line-hover">
                <span className={`block h-full rounded-full ${won >= 55 ? "bg-radiant" : "bg-muted"}`} style={{ width: `${won}%` }} />
                {without !== null && <span className="absolute -top-0.5 h-2.5 w-0.5 bg-fg/60" style={{ left: `${without}%` }} />}
              </span>
            )}
          </dd>
        </div>
        <div className="max-md:col-span-2 max-md:border-b md:border-r">
          <dt className="text-xs text-subtle">Best Pair</dt>
          <dd className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
            {pair ? (
              <>
                <Face art={hero(pair.myHeroId)} />
                <span className="text-sm text-subtle">+</span>
                <Face art={hero(pair.friendHeroId)} />
                <span className="ml-1.5 text-base font-semibold text-radiant">Won {winPercent(pair)}%</span>
                <span className="text-xs text-subtle">in {pair.games}</span>
              </>
            ) : (
              <span className="text-sm text-subtle">Shows after 3 games on the same heroes</span>
            )}
          </dd>
        </div>
        <div className="max-md:col-span-2">
          <dt className="text-xs text-subtle">Last Together</dt>
          <dd className="mt-1 text-base font-semibold text-fg">{f.lastTogether ? <GameTime iso={f.lastTogether} /> : "Not in 60 days"}</dd>
        </div>
      </dl>

      <div className="px-5 pt-4">
        <h3 className="flex items-baseline gap-2 font-semibold text-fg">
          Games Together <span className="text-sm font-normal text-subtle">Times are your local time.</span>
        </h3>
        {games.length === 0 ? (
          <p className="py-4 text-sm text-muted">
            No games together in the last 60 days. Games show here once both of you have Steam linked and play on the same team.
          </p>
        ) : (
          <ul className="mt-2.5">
            {shown.map((g) => (
              <li key={g.matchId} className="grid grid-cols-2 items-center gap-x-3.5 gap-y-2 border-t border-line py-2.5 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_8rem]">
                <span className={`flex items-center gap-2 text-sm font-semibold ${g.won ? "text-radiant" : "text-dire"}`}>
                  <span aria-hidden className="h-6.5 w-[3px] rounded-full bg-current" />
                  {g.won ? "Won" : "Lost"}
                </span>
                <HeroLine art={hero(g.myHeroId)} who="You" />
                <HeroLine art={hero(g.friendHeroId)} who={f.name} />
                <span className="text-right text-sm text-muted max-sm:col-start-2 max-sm:row-start-1">
                  <GameTime iso={g.startedAt} />
                  <span className="block text-xs text-subtle">{gameModeName(g.gameMode, g.lobbyType)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {games.length > FIRST_GAMES && (
        <button onClick={() => setAll((a) => !a)} aria-expanded={all} className="block w-full border-t border-line py-3 text-sm text-muted hover:bg-hover hover:text-fg">
          {all ? "Show Fewer" : `Show All ${games.length} Games`}
        </button>
      )}
    </section>
  );
}

function Face({ art }: { art: HeroArt }) {
  return art.image ? (
    <Image src={art.image} alt={art.name} title={art.name} width={48} height={27} className="h-6.75 w-12 rounded-xs object-cover" />
  ) : (
    <span className="text-sm text-fg">{art.name}</span>
  );
}

function HeroLine({ art, who }: { art: HeroArt; who: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {art.image && <Image src={art.image} alt="" width={64} height={36} className="h-8 w-14 shrink-0 rounded-sm object-cover sm:h-9 sm:w-16" />}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-fg">{art.name}</span>
        <span className="truncate text-xs text-subtle">{who}</span>
      </span>
    </span>
  );
}

/**
 * Invite to Party (the leader invites; with no party one starts first), Plan a Draft, and a menu with
 * Remove Friend. A friend already in your party gets Open Party instead.
 */
function FriendActions({ friend: f, partyRole, onRemove }: { friend: Friend; partyRole: PartyRole; onRemove: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<"closed" | "open" | "confirm">("closed");

  const invite = async () => {
    setState("busy");
    if (partyRole === null) {
      const started = await supabase.rpc("start_party");
      if (started.error) {
        setState("idle");
        return setError(`Party not started: ${started.error.message}`);
      }
    }
    const { error } = await supabase.rpc("invite_to_party", { target: f.id });
    if (error) {
      setState("idle");
      return setError(`Invite not sent: ${error.message}`);
    }
    setError(null);
    setState("sent");
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1.5 max-sm:w-full sm:ml-auto">
      <div className="flex gap-2 max-sm:w-full">
        {f.party === "yours" ? (
          <Link href="/party" className="btn btn-secondary max-sm:flex-1">
            <Icon name="users" />
            Open Party
          </Link>
        ) : (
          <button
            onClick={invite}
            disabled={state !== "idle" || partyRole === "member"}
            aria-describedby={partyRole === "member" ? "invite-note" : undefined}
            className="btn btn-primary max-sm:flex-1"
          >
            <Icon name={state === "sent" ? "check" : "send"} />
            {state === "sent" ? "Invite Sent" : "Invite to Party"}
          </button>
        )}
        <Link href={`/draft?with=${f.id}`} className="btn btn-secondary">
          Plan a Draft
        </Link>
        <div className="relative">
          <button onClick={() => setMenu((m) => (m === "closed" ? "open" : "closed"))} aria-expanded={menu !== "closed"} aria-label={`More for ${f.name}`} className="btn btn-ghost btn-icon">
            <Icon name="more" />
          </button>
          {menu !== "closed" && (
            <div className="absolute top-full right-0 z-10 mt-1 flex w-56 flex-col gap-1 rounded-md bg-raised p-1.5 shadow-lg ring-1 ring-line-strong">
              {menu === "open" ? (
                <button onClick={() => setMenu("confirm")} className="btn btn-ghost btn-sm justify-start">
                  <Icon name="trash" />
                  Remove Friend
                </button>
              ) : (
                <>
                  <p className="px-2 py-1 text-sm text-muted">Remove {f.name} from your friends?</p>
                  <div className="flex gap-1.5">
                    <button onClick={onRemove} className="btn btn-danger btn-sm flex-1">
                      Remove
                    </button>
                    <button autoFocus onClick={() => setMenu("closed")} className="btn btn-secondary btn-sm flex-1">
                      Keep
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {partyRole === "member" && f.party !== "yours" && (
        <p id="invite-note" className="text-xs text-subtle">
          Only your party leader can invite.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-dire">{error}</p>}
    </div>
  );
}

const noSubscribe = () => () => {};
const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "Today, 15:12" in the viewer's own time zone; the server renders the date alone. */
function GameTime({ iso }: { iso: string }) {
  const local = useSyncExternalStore(noSubscribe, () => true, () => false);
  const date = new Date(iso);
  if (!local) return <>{dayFormat.format(date)}</>;
  return <>{localGameTime(date, new Date())}</>;
}

/** "Today, 15:12", "Yesterday, 23:05" or "3 Nov, 21:40", in the local time zone. */
export function localGameTime(date: Date, now: Date): string {
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((day(now) - day(date)) / 86400000);
  if (daysAgo === 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
}
