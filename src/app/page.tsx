import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SteamButton } from "@/components/steam-button";
import { getHeroes, type Hero } from "@/lib/heroes";
import { getUser } from "@/lib/supabase/server";
import { canOpenCaptainMode } from "@/lib/user-type";

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

/** The one hero render on the page: graded down and faded at the edges so the copy stays in front. */
const RENDER_STYLE: CSSProperties = {
  filter: "grayscale(.55) sepia(.25) brightness(.55)",
  maskImage: "radial-gradient(closest-side at 50% 45%, #000 50%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(closest-side at 50% 45%, #000 50%, transparent 100%)",
};

export default async function Home() {
  const [user, heroes] = await Promise.all([getUser(), getHeroes().catch(() => [] as Hero[])]);
  const byId = new Map(heroes.map((h) => [h.id, h]));

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden">
      <Image
        src="/art/invoker.webp"
        alt=""
        aria-hidden
        width={1100}
        height={1100}
        priority
        style={RENDER_STYLE}
        className="pointer-events-none absolute -right-24 top-4 -z-10 w-[min(44rem,90vw)] opacity-60 lg:right-0 lg:opacity-100"
      />
      <section className="page grid items-center gap-12 pb-12 pt-16 lg:grid-cols-[minmax(0,1fr)_25rem] lg:pt-20">
        <div className="flex flex-col">
          <span className="text-sm text-accent">Draft assistant for Dota 2</span>
          <h1 className="mt-3 max-w-2xl text-5xl leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            Pick the Hero This Draft Needs
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-fg/80">
            Type the heroes as they come. In under a second you get eight picks for your position, each with the reason
            from this draft.
          </p>
          {user ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/draft" className="btn btn-primary btn-lg">
                Start a Draft
              </Link>
              <Link href="/my-heroes" className="btn btn-secondary btn-lg">
                Set Up My Heroes
              </Link>
              {(await canOpenCaptainMode(user.id)) && (
                <Link href="/admin/captain" className="btn btn-secondary btn-lg">
                  Open Captain Mode
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SteamButton next="/my-heroes" primary />
              <Link href="/signup" className="btn btn-secondary btn-lg">
                Sign Up with Email
              </Link>
            </div>
          )}
        </div>
        <DraftPreview byId={byId} />
      </section>

      <section className="page pb-16">
        <div className="grid gap-8 border-t border-line pt-7 md:grid-cols-3 md:gap-10">
          {POINTS.map((p) => (
            <div key={p.title}>
              <h2 className="text-lg leading-6">{p.title}</h2>
              <p className="mt-2 text-sm leading-[1.35rem] text-subtle">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/** The product in one picture: a real engine result for a draft in progress. */
function DraftPreview({ byId }: { byId: Map<number, Hero> }) {
  const hero = (id: number) => byId.get(id);
  const names = (ids: number[]) => ids.map((id) => hero(id)?.name ?? `Hero ${id}`).join(" and ");
  return (
    <figure className="rounded-sm bg-surface/90 px-5 py-4 ring-1 ring-line-strong lg:mt-64">
      <figcaption className="text-sm text-subtle">
        Example: you play mid with {names(EXAMPLE.allies)}, they have {names(EXAMPLE.enemies)}
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
                <span className="block truncate font-medium text-fg">{h?.name ?? `Hero ${s.id}`}</span>
                <span className="block truncate text-xs text-subtle">{s.reason}</span>
              </span>
              <span className={`num text-right ${i === 0 ? "text-accent" : "text-fg"}`}>{s.score.toFixed(1)}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
