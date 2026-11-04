"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/account-menu";
import { renderOf } from "@/components/hero-render";
import { Icon } from "@/components/icon";
import { RankMedal } from "@/components/rank-medal";
import { rankName } from "@/lib/rank";
import { averageRankTier, type Seat } from "@/lib/stack-seats";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATARS = 5;

export interface BannerStack {
  id: string;
  name: string;
  ownerName: string;
  /** Games its players played together in the last 14 days. */
  games: number;
  openToRequests: boolean;
  /** Your part in it: owner, Manager (co_captain) or player; null when you are not in it. */
  myRole: "owner" | "co_captain" | "player" | null;
}

/**
 * The head of a Stack: its name with badges, three stats with icons (players, games together, average rank),
 * one hero render, and the actions. Only the owner can rename it. `hero` is the portrait of the hero the render
 * shows, the owner's top hero when you may see it.
 */
export function StackBanner({
  stack,
  seats,
  hero,
  waiting = 0,
  stackPage = true,
  inviteHref,
  heading = "h2",
  players = seats.length,
  actions,
  onError,
}: {
  stack: BannerStack;
  /** h1 on the Stack Page, h2 under the Stacks title. */
  heading?: "h1" | "h2";
  seats: Seat[];
  hero?: { name: string; image: string };
  /** Players asking to join, shown on the Stack Page button. */
  waiting?: number;
  /** False on the Stack Page itself. */
  stackPage?: boolean;
  /** Where the Invite button goes, for the owner and Managers. */
  inviteHref?: string;
  /** How many players it has, when you can't see who they are. */
  players?: number;
  /** More buttons after the banner's own, such as Ask to Join or Leave. */
  actions?: ReactNode;
  onError: (e: string | null) => void;
}) {
  const runs = stack.myRole === "owner" || stack.myRole === "co_captain";
  const average = averageRankTier(seats.map((s) => s.rankTier));
  const render = renderOf(hero?.image);

  return (
    <section aria-labelledby="stack-name" className="stack-banner flex min-h-72 flex-col gap-4 p-6 sm:p-9">
      {render && (
        <Image
          src={render}
          alt=""
          aria-hidden
          width={560}
          height={560}
          className="stack-render -right-24 -top-6 w-88 opacity-40 sm:right-6 sm:-top-8 sm:w-112 sm:opacity-100"
        />
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {stack.myRole === "owner" ? (
          <>
            <span className="chip chip-accent">
              <Icon name="layers" />
              Your Stack
            </span>
            <span className="chip">
              <Icon name="crown" />
              Owner
            </span>
          </>
        ) : (
          <span className="chip">
            <Icon name="crown" />
            Owned by {stack.ownerName}
          </span>
        )}
        {stack.myRole === "co_captain" && <span className="chip chip-accent">Manager</span>}
        {stack.openToRequests && (
          <span className="chip">
            <span aria-hidden className="size-1.5 rounded-full bg-radiant" />
            Open to Requests
          </span>
        )}
      </div>

      <StackTitle stack={stack} heading={heading} canRename={stack.myRole === "owner"} onError={onError} />

      <ul aria-label="About this Stack" className="flex flex-wrap gap-2.5">
        <Stat icon={<Icon name="users" />} label={`${players} ${players === 1 ? "player" : "players"}`}>
          <b className="num text-base text-fg">{players}</b>
          <span>{players === 1 ? "Player" : "Players"}</span>
          <span aria-hidden className="ml-1 flex">
            {seats.slice(0, MAX_AVATARS).map((s, i) => (
              <span
                key={s.id}
                className={i ? "-ml-1.5 rounded-full ring-2 ring-surface" : "rounded-full ring-2 ring-surface"}
              >
                <Avatar
                  account={{
                    name: s.name,
                    avatarUrl: s.avatarUrl,
                    detail: null,
                    steamLinked: false,
                  }}
                  size={22}
                />
              </span>
            ))}
            {seats.length > MAX_AVATARS && (
              <span className="micro ml-1 self-center">+{seats.length - MAX_AVATARS}</span>
            )}
          </span>
        </Stat>
        <Stat icon={<Icon name="swords" />} label={`${stack.games} games together in the last 2 weeks`}>
          <b className="num text-base text-fg">{stack.games}</b>
          <span>Games in 2 Weeks</span>
        </Stat>
        {average && (
          <Stat icon={<RankMedal rankTier={average} size={28} />} label={`Average rank ${rankName(average)}`}>
            <b className="text-base font-semibold text-fg">{rankName(average)}</b>
            <span>Average</span>
          </Stat>
        )}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2">
        {runs && (
          <Link href={`/draft?stack=${stack.id}`} className="btn btn-primary btn-lg">
            <Icon name="play" large />
            Draft for {stack.name}
          </Link>
        )}
        {stackPage && (
          <Link
            href={`/stacks/${stack.id}`}
            className="btn btn-secondary btn-lg"
            aria-label={
              waiting > 0
                ? `Stack Page, ${waiting} ${waiting === 1 ? "player wants" : "players want"} to join`
                : undefined
            }
            title={waiting > 0 ? `${waiting} ${waiting === 1 ? "player wants" : "players want"} to join` : undefined}
          >
            <Icon name="layers" large />
            Stack Page
            {waiting > 0 && (
              <span
                aria-hidden
                className="rounded-full bg-accent px-1.5 text-xs font-semibold tabular-nums leading-5 text-on-accent"
              >
                +{waiting}
              </span>
            )}
          </Link>
        )}
        {runs && inviteHref && (
          <a
            href={inviteHref}
            aria-label="Invite Players"
            title="Invite Players"
            className="btn btn-secondary btn-lg w-11 px-0"
          >
            <Icon name="userPlus" large />
          </a>
        )}
        {actions}
      </div>
    </section>
  );
}

function Stat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li
      aria-label={label}
      className="flex h-10 items-center gap-2 rounded-md bg-bg/60 px-3 text-sm text-subtle ring-1 ring-inset ring-line-strong"
    >
      <span className="text-muted">{icon}</span>
      <span aria-hidden className="flex items-center gap-1.5">
        {children}
      </span>
    </li>
  );
}

/** The Stack's name; the owner renames it in place with the pencil. */
function StackTitle({
  stack,
  heading: Heading,
  canRename,
  onError,
}: {
  stack: BannerStack;
  heading: "h1" | "h2";
  canRename: boolean;
  onError: (e: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stack.name);

  const save = async () => {
    setEditing(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === stack.name) return setName(stack.name);
    const { error } = await supabase.from("teams").update({ name: trimmed }).eq("id", stack.id);
    if (error) {
      setName(stack.name);
      return onError(`Stack name not saved: ${error.message}`);
    }
    onError(null);
    router.refresh();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor="stack-name-input" className="sr-only">
          Stack name
        </label>
        <input
          id="stack-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setName(stack.name);
              setEditing(false);
            }
          }}
          maxLength={40}
          autoFocus
          className="field field-lg w-full max-w-md text-2xl font-semibold"
        />
        <span id="stack-name" className="sr-only">
          {stack.name}
        </span>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Heading id="stack-name" className="page-title break-words sm:text-5xl">
        {name}
      </Heading>
      {canRename && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Rename Stack"
          title="Rename Stack"
          className="btn btn-icon"
        >
          <Icon name="pencil" />
        </button>
      )}
    </div>
  );
}

/** The hero the banner shows: the owner's top hero, else your own, when you may see it. */
export function bannerHero(seats: Seat[], youId: string, art: Record<number, { name: string; image?: string }>) {
  const pick = (s?: Seat) => (s?.heroes[0] ? art[s.heroes[0]] : undefined);
  const hero = pick(seats.find((s) => s.role === "owner")) ?? pick(seats.find((s) => s.id === youId));
  return hero?.image ? { name: hero.name, image: hero.image } : undefined;
}
