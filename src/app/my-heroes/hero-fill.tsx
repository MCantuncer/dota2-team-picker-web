"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import {
  againAt,
  fillInProgress,
  fillReadyAt,
  type FillState,
  type FillStatus,
  MIN_POSITIONED_GAMES,
  readFillAnswer,
  readFillStatus,
} from "@/lib/hero-fill";
import { createClient } from "@/lib/supabase/client";

/** profiles.hero_fill_* exactly as the page read them. */
export interface FillRow {
  hero_fill_state: string | null;
  hero_fill_at: string | null;
  hero_fill_games: number | null;
  hero_fill_next_at: string | null;
}

/** The heroes the fill put in the player's lists that are still there, most played first. */
export interface FillAdded {
  count: number;
  heroes: { id: number; name: string; image: string }[];
}

interface Fill {
  status: FillStatus;
  /** What the page shows: running while this page's own call is out. */
  state: FillState | null;
  steamLinked: boolean;
  /** When Fill from My Games may run again; null means now. */
  readyAt: Date | null;
  /** Null until the page is on screen, so the server and browser render the same text. */
  now: Date | null;
  error: string | null;
  start: () => void;
}

const FillContext = createContext<Fill | null>(null);
const useFill = () => useContext(FillContext);

/** The page checks for a finished fill this often while one runs or waits for its retry. */
const CHECK_MS = 30_000;
const HIDDEN_KEY = "my-heroes-fill-hidden";
const noSubscribe = () => () => {};
const readHidden = () => {
  try {
    return localStorage.getItem(HIDDEN_KEY);
  } catch {
    // Private windows may refuse storage: the card simply stays.
    return null;
  }
};

/**
 * Runs the fill and shares its state with the card at the top of My Heroes and the
 * Fill from My Games button by the heroes. A player who has never been filled is filled on
 * their first visit; the database lets only one fill run at a time.
 */
export function FillProvider({ row, steamLinked, children }: { row: FillRow; steamLinked: boolean; children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const status = useMemo(() => readFillStatus(row), [row]);
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  // A player never filled is filled on this visit, so the page shows the run from the start.
  const welcome = steamLinked && status.state === null;
  const [calling, setCalling] = useState(welcome);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const now = inBrowser ? clock : null;
  const started = useRef(false);

  /** Asks fill-heroes to run; the caller has already shown the run. */
  const run = useCallback(
    async (by: "welcome" | "button") => {
      const { data, error } = await supabase.functions.invoke("fill-heroes", { body: { by } });
      setCalling(false);
      setError(error || !readFillAnswer(data) ? "Couldn't start reading your games. Please try again in a minute." : null);
      router.refresh();
    },
    [supabase, router],
  );

  useEffect(() => {
    if (welcome && !started.current) {
      started.current = true;
      void run("welcome");
    }
  }, [welcome, run]);

  // While a fill runs or waits, check again every 30 seconds; the clock also moves the rest times on.
  const inProgress = now !== null && fillInProgress(status, now);
  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
      if (inProgress && !calling) router.refresh();
    }, CHECK_MS);
    return () => clearInterval(timer);
  }, [inProgress, calling, router]);

  const value: Fill = {
    status,
    state: calling ? "running" : status.state,
    steamLinked,
    readyAt: now ? fillReadyAt(status, now) : null,
    now,
    error,
    start: () => {
      setCalling(true);
      setError(null);
      void run("button");
    },
  };
  return <FillContext value={value}>{children}</FillContext>;
}

/** Fill from My Games. In the heading it hides while the card above carries its own. */
export function FillButton({ place = "heading", primary = false }: { place?: "heading" | "card"; primary?: boolean }) {
  const fill = useFill();
  if (!fill?.steamLinked) return null;
  const { state, readyAt, now, start } = fill;
  if (place === "heading" && (state === "no_games" || state === "too_few" || state === "failed")) return null;
  const running = state === "running";
  return (
    <div className="flex flex-wrap items-center gap-3" data-tour="my-heroes-fill">
      {readyAt && now && !running && <span className="text-sm text-subtle">{againAt(readyAt, now)}</span>}
      <button
        type="button"
        onClick={start}
        disabled={running || readyAt !== null}
        className={`btn ${primary ? "btn-primary" : "btn-secondary"}`}
      >
        {!primary && (
          <span className="text-accent">
            <Icon name="chart" />
          </span>
        )}
        Fill from My Games
      </button>
    </div>
  );
}

/** The fill's card at the top of My Heroes: reading, what it added, or why it added nothing. */
export function FillCard({ added }: { added: FillAdded }) {
  const fill = useFill();
  const stored = useSyncExternalStore(noSubscribe, readHidden, () => null);
  const [hiddenNow, setHidden] = useState<string | null>(null);
  const hidden = hiddenNow ?? stored;
  if (!fill?.steamLinked) return null;
  const { state, status, error } = fill;

  const errorLine = error && (
    <p role="alert" className="notice notice-error">
      {error}
    </p>
  );

  if (state === "running")
    return (
      <section aria-labelledby="fill-title" aria-busy className="card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-4">
          <CardIcon tone="accent" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="fill-title" className="text-base font-semibold text-fg">
              Reading Your Games
            </h2>
            <p className="text-sm text-muted">Your heroes will appear by position. You can start picking below meanwhile.</p>
          </div>
        </div>
        <div aria-hidden className="sweep-track">
          <div className="sweep-bar" />
        </div>
      </section>
    );

  if (state === "done") {
    const atKey = status.at?.toISOString() ?? "";
    if (added.count === 0 || hidden === atKey) return errorLine || null;
    const hide = () => {
      setHidden(atKey);
      try {
        localStorage.setItem(HIDDEN_KEY, atKey);
      } catch {
        // Hidden for this visit only.
      }
    };
    return (
      <section aria-labelledby="fill-title" className="card flex items-center gap-4 py-4 pl-4 pr-3">
        <CardIcon tone="accent" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="fill-title" className="text-base font-semibold text-fg">
            <span className="num text-base">{added.count}</span> {added.count === 1 ? "Hero" : "Heroes"} Added from Your Games
          </h2>
          <p className="text-sm text-muted">
            {status.games !== null && (
              <>
                From <span className="num">{status.games}</span> games with a known position in the last 6 months.{" "}
              </>
            )}
            Remove any you don&apos;t want.
          </p>
        </div>
        <div aria-hidden className="hidden shrink-0 pl-2.5 sm:flex">
          {added.heroes.map((h) => (
            <Image
              key={h.id}
              src={h.image}
              alt=""
              width={64}
              height={36}
              unoptimized
              className="-ml-2.5 h-9 w-16 rounded-xs object-cover ring-2 ring-surface"
            />
          ))}
        </div>
        <button type="button" onClick={hide} aria-label="Hide this card" className="btn btn-icon">
          <Icon name="x" />
        </button>
      </section>
    );
  }

  const card = (
    tone: "quiet" | "warn",
    title: string,
    line: ReactNode,
    action: ReactNode = null,
    icon: "lock" | "chart" | "clock" | "alert" = "chart",
  ) => (
    <>
      <section aria-labelledby="fill-title" className="card flex flex-wrap items-center gap-4 p-4">
        <CardIcon tone={tone} icon={icon} />
        <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
          <h2 id="fill-title" className="text-base font-semibold text-fg">
            {title}
          </h2>
          <p className="text-sm text-muted">{line}</p>
        </div>
        {action}
      </section>
      {errorLine}
    </>
  );

  switch (state) {
    case "no_games":
      return card(
        "quiet",
        "No Public Games Found",
        "If your match data is private, turn on Expose Public Match Data in Dota 2, then try again. New games may take a few minutes to show.",
        <FillButton place="card" primary />,
        "lock",
      );
    case "too_few":
      return card(
        "quiet",
        "Not Enough Games Yet",
        <>
          We found <span className="num">{status.games ?? 0}</span> games with a known position and need{" "}
          <span className="num">{MIN_POSITIONED_GAMES}</span>. Pick your heroes below.
        </>,
        <FillButton place="card" />,
      );
    case "waiting":
      return card("warn", "Couldn't Read Your Games Right Now", "We'll try again shortly. Your heroes will show here when it works.", null, "clock");
    case "failed":
      return card("warn", "Couldn't Read Your Games", "Try again later, or pick your heroes below.", <FillButton place="card" />, "alert");
    default:
      return errorLine || null;
  }
}

function CardIcon({ tone, icon = "chart" }: { tone: "accent" | "quiet" | "warn"; icon?: "lock" | "chart" | "clock" | "alert" }) {
  const colors = {
    accent: "bg-accent-tint text-accent",
    quiet: "bg-raised text-subtle",
    warn: "bg-warn-tint text-warn",
  }[tone];
  return (
    <span aria-hidden className={`flex size-11 shrink-0 items-center justify-center rounded-sm ${colors}`}>
      <Icon name={icon} large />
    </span>
  );
}
