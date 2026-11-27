import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { NextSkillShowcase, type SkillChoice } from "@/components/next-skill-showcase";
import { SteamButton } from "@/components/steam-button";
import { getHeroes, type Hero } from "@/lib/heroes";
import { getProof, percent, signedPoints, type Proof } from "@/lib/proof";
import { getUser } from "@/lib/supabase/server";

/**
 * A real engine result, kept static so the landing page loads instantly: Legend bracket, you play mid,
 * your team has Faceless Void (pos 1) and Earthshaker, the enemy has Pudge and Anti-Mage.
 */
const EXAMPLE = {
  allies: [41, 7],
  enemies: [14, 1],
  suggestions: [
    { id: 107, score: 10.9, reason: "Strong against Pudge and Anti-Mage" },
    { id: 76, score: 8.6, reason: "54.1% win rate in Legend" },
    { id: 32, score: 8.4, reason: "Strong against Anti-Mage and Pudge" },
    { id: 88, score: 8.2, reason: "Works well with Earthshaker" },
    { id: 52, score: 7.8, reason: "A natural pos 2" },
    { id: 93, score: 7.7, reason: "Strong against Anti-Mage" },
    { id: 82, score: 7.6, reason: "53.2% win rate in Legend" },
    { id: 90, score: 6.9, reason: "Works well with Earthshaker" },
  ],
};

/**
 * A real skill choice for the homepage Invoker, kept static like EXAMPLE: STRATZ's latest high-rank mid Invoker
 * guide games against Pudge or Anti-Mage (19 games, patch 7.41, 6 November 2026). Their level 5 point went to
 * Exort in 15, Wex in 2 and Quas in 2. Guide games are all wins, so this counts what winners took.
 */
const SKILL: SkillChoice = {
  level: 5,
  games: 19,
  players: "winning high-rank mid Invokers",
  against: "Pudge or Anti-Mage",
  wex: { orb: "wex", name: "Wex", took: 2 },
  exort: { orb: "exort", name: "Exort", took: 15 },
};

const POINTS = [
  {
    title: "Your Position First",
    text: "Picks for the role you play, weighed against the enemy lineup and with your allies, from recent ranked matches.",
  },
  {
    title: "Tuned to You",
    text: "Your rank's meta and the heroes you actually win with. Sign in with Steam and it reads them for you.",
  },
  {
    title: "Built for the 30 Seconds",
    text: "Type two letters, press Enter. Eight picks with plain reasons, ready before the timer matters.",
  },
];

export default async function Home() {
  const [user, heroes, proof] = await Promise.all([
    getUser(),
    getHeroes().catch(() => [] as Hero[]),
    getProof().catch(() => null),
  ]);
  const byId = new Map(heroes.map((h) => [h.id, h]));

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden">
      <section className="page grid items-center gap-12 pb-12 pt-16 lg:grid-cols-[minmax(0,1fr)_25rem] lg:pt-20">
        <div className="flex flex-col">
          <span className="text-sm text-accent">Draft assistant for Dota 2</span>
          <h1 className="mt-3 max-w-2xl text-2xl leading-[1.05] tracking-[-0.035em]">
            Pick the Hero This Draft Needs
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-fg/80">
            Type the heroes as they come. In under a second you get eight picks for your position, each with the reason
            from this draft.
          </p>
          {user ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/draft" className="btn btn-primary btn-lg">
                <Icon name="play" />
                Start a Draft
              </Link>
              <Link href="/my-heroes" className="btn btn-secondary btn-lg">
                <Icon name="helmet" />
                Set Up My Heroes
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SteamButton next="/my-heroes" primary />
            </div>
          )}
        </div>
        {/* The Invoker scene sits right above the example card at every width. */}
        <div className="relative lg:mt-64">
          <NextSkillShowcase choice={SKILL} />
          <DraftPreview byId={byId} />
        </div>
      </section>

      <section className="page pb-16">
        <div className="grid gap-8 border-t border-line pt-7 md:grid-cols-3 md:gap-10">
          {POINTS.map((p) => (
            <div key={p.title}>
              <h2 className="text-lg leading-6">{p.title}</h2>
              <p className="mt-2 text-sm leading-[1.35rem] text-muted">{p.text}</p>
            </div>
          ))}
        </div>
        {proof && <ProofTeaser proof={proof} />}
      </section>
    </main>
  );
}

/** The Proof Page's headline, with the button to it. */
function ProofTeaser({ proof }: { proof: Proof }) {
  const { top3, other, lift } = proof.rivals.engine;
  if (lift === null) return null;
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <span className="grid size-20 shrink-0 place-content-center rounded-full bg-accent text-center text-on-accent">
          <span className="text-xl leading-none font-semibold tabular-nums">{signedPoints(lift)}</span>
          <span className="text-xs font-semibold">Points</span>
        </span>
        <div className="grid max-w-xl gap-1">
          <h2 className="text-lg leading-6">Do Our Picks Win?</h2>
          <p className="text-sm leading-[1.35rem] text-muted">
            Players who took one of our top 3 picks won {percent(top3.won)} of their games, against {percent(other.won)}{" "}
            for any other hero, in {proof.games.toLocaleString("en-US")} ranked games the engine never saw.
          </p>
        </div>
      </div>
      <Link href="/proof" className="btn btn-secondary">
        See the Proof
        <Icon name="chevronRight" />
      </Link>
    </div>
  );
}

/** The product in one picture: a real engine result for a draft in progress. */
function DraftPreview({ byId }: { byId: Map<number, Hero> }) {
  const hero = (id: number) => byId.get(id);
  const names = (ids: number[]) => keepWhole(ids.map((id) => hero(id)?.name ?? `Hero ${id}`).join(" and "));
  return (
    <figure className="rounded-sm bg-surface/90 px-5 py-4 ring-1 ring-line-strong">
      <figcaption className="text-sm text-muted">
        Example: you play mid with {names(EXAMPLE.allies)}, the enemy has {names(EXAMPLE.enemies)}
      </figcaption>
      <ol className="mt-2">
        {EXAMPLE.suggestions.slice(0, 4).map((s, i) => {
          const h = hero(s.id);
          return (
            <li key={s.id} className="grid grid-cols-[4rem_minmax(0,1fr)_2.75rem] items-center gap-3 border-t border-line py-2.5">
              {h ? (
                <Image src={h.image} alt="" width={64} height={36} className="h-9 w-16 rounded-xs object-cover" />
              ) : (
                <span className="h-9 w-16 rounded-xs bg-raised" />
              )}
              <span className="min-w-0">
                <span className="block font-medium text-fg">{h?.name ?? `Hero ${s.id}`}</span>
                <span className="mt-0.5 block text-xs leading-4 text-muted">{keepWhole(s.reason)}</span>
              </span>
              <span className={`num text-right ${i === 0 ? "text-accent" : "text-fg"}`}>{s.score.toFixed(1)}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

/** Text whose hyphenated words (hero names such as Anti-Mage) never break across lines. */
function keepWhole(text: string) {
  return text.split(/(\S+-\S+)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
