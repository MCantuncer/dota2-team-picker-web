import Image from "next/image";
import Link from "next/link";
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

/** Heroes for the portrait wall behind the headline. */
const WALL = [
  1, 2, 5, 8, 11, 14, 17, 19, 21, 22, 26, 30, 35, 39, 41, 44, 46, 53, 54, 62, 63, 64, 69, 71, 74, 75, 86, 87, 93,
  96, 98, 100, 104, 106, 107, 113, 114, 119, 120, 121, 123, 126, 128, 129, 135, 136, 137, 138, 145, 131,
];

const FEATURES = [
  {
    title: "Counters and synergy",
    text: "Every suggestion is weighed against the enemy lineup and with your allies, from hundreds of thousands of recent ranked matches.",
  },
  {
    title: "Tuned to you",
    text: "Your position, your rank's meta, and the heroes you actually win with. Sign in with Steam and it reads them for you.",
  },
  {
    title: "Built for the 30 seconds",
    text: "Alt-tab, type two letters, press Enter. Eight picks with plain reasons, ready before the timer matters.",
  },
];

export default async function Home() {
  const [user, heroes] = await Promise.all([getUser(), getHeroes().catch(() => [] as Hero[])]);
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const wall = WALL.map((id) => byId.get(id)).filter((h): h is Hero => Boolean(h));

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative isolate overflow-hidden border-b border-line">
        <PortraitWall heroes={wall} />
        <div className="page grid items-center gap-12 py-16 lg:grid-cols-[1fr_minmax(0,34rem)] lg:py-24">
          <div className="flex flex-col gap-6">
            <span className="label-caps text-accent">Draft assistant for Dota 2</span>
            <h1 className="text-5xl font-bold uppercase leading-[0.95] tracking-tight text-fg sm:text-6xl">
              Win the draft
              <br />
              <span className="text-accent">before the horn.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Enter the heroes already picked and your position. Get the 8 best picks for this game in seconds, each
              with the reason it works.
            </p>
            {user ? (
              <div className="flex flex-wrap gap-3">
                <Link href="/my-heroes" className="btn btn-primary btn-lg">
                  Set up my heroes
                </Link>
                {(await canOpenCaptainMode(user.id)) && (
                  <Link href="/admin/captain" className="btn btn-secondary btn-lg">
                    Open captain mode
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <SteamButton next="/my-heroes" primary />
                <Link href="/signup" className="btn btn-secondary btn-lg">
                  Sign up with email
                </Link>
              </div>
            )}
            {user && <p className="text-sm text-subtle">The live draft screen is coming next.</p>}
          </div>
          <DraftPreview byId={byId} />
        </div>
      </section>

      <section className="page grid gap-4 py-14 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={f.title} className="card flex flex-col gap-2 p-5">
            <span className="font-heading text-sm font-semibold text-accent">0{i + 1}</span>
            <h2 className="text-xl font-semibold uppercase tracking-wide text-fg">{f.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

/** A tilted wall of hero portraits that fades into the page, behind the headline. */
function PortraitWall({ heroes }: { heroes: Hero[] }) {
  if (!heroes.length) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -inset-x-24 -top-24 bottom-0 grid origin-center -rotate-6 grid-cols-6 gap-2 opacity-40 sm:grid-cols-8 lg:grid-cols-10">
        {heroes.concat(heroes).map((h, i) => (
          <Image
            key={i}
            src={h.image}
            alt=""
            width={256}
            height={144}
            sizes="(min-width: 1024px) 10vw, 16vw"
            className="aspect-video w-full rounded-sm object-cover grayscale-[35%]"
          />
        ))}
      </div>
      {/* Fade the wall out under the text and toward the bottom so copy stays readable. */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/60" />
    </div>
  );
}

/** The product in one picture: a draft in progress and the engine's 8 picks. */
function DraftPreview({ byId }: { byId: Map<number, Hero> }) {
  const hero = (id: number) => byId.get(id);
  return (
    <figure className="card overflow-hidden bg-surface/90 backdrop-blur">
      <div className="grid grid-cols-2 border-b border-line">
        <TeamRow label="Your team" ids={EXAMPLE.allies} hero={hero} side="radiant" />
        <TeamRow label="Enemy" ids={EXAMPLE.enemies} hero={hero} side="dire" />
      </div>
      <div className="flex items-baseline justify-between px-4 pb-2 pt-4">
        <span className="label-caps">Best picks for you · Mid</span>
        <span className="text-xs text-subtle">Legend</span>
      </div>
      <ol className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
        {EXAMPLE.suggestions.map((s, i) => {
          const h = hero(s.id);
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2.5 rounded-md border p-1.5 pr-2.5 ${
                i === 0 ? "border-accent/60 bg-accent/10" : "border-line bg-raised/60"
              }`}
            >
              {h && <Image src={h.image} alt="" width={64} height={36} className="h-9 w-16 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fg">{h?.name ?? `Hero ${s.id}`}</span>
                  <span className="text-xs font-semibold text-accent">{s.score.toFixed(1)}</span>
                </div>
                <div className="truncate text-xs text-muted">{s.reason}</div>
              </div>
            </li>
          );
        })}
      </ol>
      <figcaption className="border-t border-line px-4 py-2.5 text-xs text-subtle">
        Real output from the engine for this draft.
      </figcaption>
    </figure>
  );
}

function TeamRow({
  label,
  ids,
  hero,
  side,
}: {
  label: string;
  ids: number[];
  hero: (id: number) => Hero | undefined;
  side: "radiant" | "dire";
}) {
  const color = side === "radiant" ? "text-radiant" : "text-dire";
  const bar = side === "radiant" ? "bg-radiant" : "bg-dire";
  return (
    <div className={`relative flex flex-col gap-2 p-4 ${side === "dire" ? "border-l border-line" : ""}`}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} />
      <span className={`label-caps ${color}`}>{label}</span>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const h = ids[i] ? hero(ids[i]) : undefined;
          return h ? (
            <Image key={i} src={h.image} alt={h.name} title={h.name} width={64} height={36} className="aspect-video w-full rounded-sm object-cover" />
          ) : (
            <span key={i} className="aspect-video w-full rounded-sm border border-dashed border-line-strong" />
          );
        })}
      </div>
    </div>
  );
}
