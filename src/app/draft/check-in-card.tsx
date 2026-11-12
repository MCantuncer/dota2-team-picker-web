"use client";

import Image from "next/image";
import { useState } from "react";
import { OpenDotaButton } from "@/components/external-button";
import { Icon, type IconName } from "@/components/icon";
import {
  CHECK_IN_TAGS,
  type CheckInAnswer,
  type CheckInTag,
  type DueCheckIn,
  MAX_NOTE,
  MAX_TAGS,
  missingAnswer,
  PICKS_FEELS,
  type PicksFeel,
  STORY_FEELS,
  type StoryFeel,
  toggleTag,
} from "@/lib/game-check-in";
import { POSITION_NAMES } from "@/lib/draft";
import { ANSWER_TILE, PICK_ICONS } from "@/components/answer-tile";

const STORY_ICONS: Record<StoryFeel, { icon: IconName; tone: string }> = {
  helped: { icon: "check", tone: "text-radiant" },
  partly: { icon: "minus", tone: "text-muted" },
  off: { icon: "x", tone: "text-dire" },
};

/**
 * The game check-in on the Draft page, in the After the Game slot: the result (found on OpenDota, or the
 * player's own Victory / Defeat), then how the picks and the Game Story felt and what decided the game.
 * About ten seconds; every question but the result is optional.
 */
export function CheckInCard({
  game,
  heroOf,
  portraits,
  onSend,
  onSkip,
}: {
  game: DueCheckIn;
  heroOf: (id: number) => { name: string; image?: string };
  /** Wide hero portraits (16:9). */
  portraits: Record<number, string>;
  /** Returns an error message to show, or null once saved. */
  onSend: (answer: CheckInAnswer) => Promise<string | null>;
  onSkip: () => Promise<string | null>;
}) {
  const [won, setWon] = useState<boolean | null>(null);
  const [picks, setPicks] = useState<PicksFeel | null>(null);
  const [story, setStory] = useState<StoryFeel | null>(null);
  const [tags, setTags] = useState<CheckInTag[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const found = game.won !== null;
  const result = found ? game.won : won;
  const me = game.myHero !== null ? heroOf(game.myHero) : null;
  const art = game.myHero !== null ? portraits[game.myHero] : undefined;

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const message = await action();
    setBusy(false);
    if (message) setError(message);
  };
  const send = (played: boolean) => {
    const answer: CheckInAnswer = { played, won: found ? null : won, picks, story: game.storyShown ? story : null, tags, note };
    const missing = missingAnswer(game, answer);
    if (missing) return setError(missing);
    void run(() => onSend(answer));
  };

  return (
    <section aria-labelledby="check-in-title" className="flex flex-col gap-6">
      <div
        className={`relative flex flex-col overflow-hidden rounded-lg border border-line-strong bg-surface md:h-45 md:flex-row ${
          result === true ? "border-l-4 border-l-radiant" : result === false ? "border-l-4 border-l-dire" : ""
        }`}
      >
        {art && (
          <div className="relative hidden h-45 w-80 shrink-0 md:block">
            <Image src={art} alt="" width={320} height={180} className="size-full object-cover" />
            <span aria-hidden className="absolute inset-0 bg-linear-to-r from-transparent from-55% to-surface" />
          </div>
        )}
        <div className="flex grow flex-col justify-center gap-3 px-6 py-5 md:px-8">
          <h2
            id="check-in-title"
            className={`page-title ${found ? (game.won ? "text-radiant" : "text-dire") : ""}`}
          >
            {found ? (game.won ? "Victory" : "Defeat") : "Game Over"}
          </h2>
          {found ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-muted">
                {me ? `${me.name}, ${POSITION_NAMES[game.myPosition - 1]}` : POSITION_NAMES[game.myPosition - 1]}
                {game.matchId && (
                  <>
                    <span className="px-2 text-subtle">|</span>
                    Match <span className="num text-fg">{game.matchId}</span>
                  </>
                )}
              </p>
              {game.matchId && <OpenDotaButton matchId={game.matchId} />}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Result">
              <button
                aria-pressed={won === true}
                onClick={() => setWon(won === true ? null : true)}
                className="btn btn-lg w-36 border-radiant-strong bg-radiant-tint text-radiant aria-pressed:ring-2 aria-pressed:ring-radiant"
              >
                Victory
              </button>
              <button
                aria-pressed={won === false}
                onClick={() => setWon(won === false ? null : false)}
                className="btn btn-lg w-36 border-dire-strong bg-dire-tint text-dire aria-pressed:ring-2 aria-pressed:ring-dire"
              >
                Defeat
              </button>
              <button onClick={() => send(false)} disabled={busy} className="btn btn-ghost btn-lg">
                Didn&apos;t Play It
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2 px-6 pb-5 md:py-6 md:pr-7 md:pl-0">
          <Team ids={game.allies} portraits={portraits} heroOf={heroOf} edge="border-radiant-strong" label="My Team" />
          <Team ids={game.enemies} portraits={portraits} heroOf={heroOf} edge="border-dire-strong" label="Enemy" />
        </div>
      </div>

      <div className={`grid items-start gap-6 ${game.storyShown ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <Question title="The Picks">
          <div className="grid grid-cols-3 gap-2.5">
            {PICKS_FEELS.map((f) => (
              <button
                key={f.value}
                aria-pressed={picks === f.value}
                onClick={() => setPicks(picks === f.value ? null : f.value)}
                className={ANSWER_TILE}
              >
                <span className={PICK_ICONS[f.value].tone}>
                  <Icon name={PICK_ICONS[f.value].icon} large />
                </span>
                {f.label}
              </button>
            ))}
          </div>
        </Question>

        {game.storyShown && (
          <Question title="The Game Story">
            <div className="grid grid-cols-3 gap-2.5">
              {STORY_FEELS.map((f) => (
                <button
                  key={f.value}
                  aria-pressed={story === f.value}
                  onClick={() => setStory(story === f.value ? null : f.value)}
                  className={ANSWER_TILE}
                >
                  <span className={STORY_ICONS[f.value].tone}>
                    <Icon name={STORY_ICONS[f.value].icon} large />
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
          </Question>
        )}

        <Question title="What Decided It" hint={`up to ${MAX_TAGS}`}>
          <div className="grid grid-cols-4 gap-2">
            {CHECK_IN_TAGS.map((t) => (
              <button
                key={t.value}
                aria-pressed={tags.includes(t.value)}
                onClick={() => setTags(toggleTag(tags, t.value))}
                className={`${ANSWER_TILE} gap-1.5 text-xs`}
              >
                <Icon name={t.icon} large />
                <span className="text-center leading-4">{t.label}</span>
              </button>
            ))}
          </div>
        </Question>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex grow">
          <span className="sr-only">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE}
            placeholder="A note for your Story, if you like"
            className="field field-lg grow"
          />
        </label>
        <div className="flex gap-2">
          <button onClick={() => send(true)} disabled={busy} className="btn btn-primary btn-lg px-7">
            Send
          </button>
          <button onClick={() => void run(onSkip)} disabled={busy} className="btn btn-ghost btn-lg">
            Skip
          </button>
        </div>
      </div>
      {error && (
        <p role="status" className="notice notice-error text-sm">
          {error}
        </p>
      )}
    </section>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="card flex flex-col gap-4 p-4">
      <h3 className="flex items-baseline gap-2">
        <span className="section-title">{title}</span>
        {hint && <span className="text-sm text-subtle">{hint}</span>}
      </h3>
      {children}
    </section>
  );
}

function Team({
  ids,
  portraits,
  heroOf,
  edge,
  label,
}: {
  ids: number[];
  portraits: Record<number, string>;
  heroOf: (id: number) => { name: string };
  edge: string;
  label: string;
}) {
  return (
    <ul aria-label={label} className={`flex gap-1 border-l-3 pl-2 ${edge}`}>
      {ids.map((id) =>
        portraits[id] ? (
          <li key={id}>
            <Image
              src={portraits[id]}
              alt={heroOf(id).name}
              width={64}
              height={36}
              className="h-9 w-16 rounded-xs object-cover"
            />
          </li>
        ) : (
          <li key={id} className="micro flex h-9 w-16 items-center justify-center rounded-xs bg-raised text-center text-muted">
            {heroOf(id).name}
          </li>
        ),
      )}
    </ul>
  );
}
