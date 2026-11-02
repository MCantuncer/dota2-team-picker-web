import Image from "next/image";

const HERO_ART = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";

/**
 * Layout for the log in and sign up pages: our own abstract lane map on the left (from laptop width up), the form on
 * the right. No card around the form; the page itself is the surface.
 */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="page grid flex-1 items-center gap-16 py-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-24">
      <LaneMap />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 lg:mx-0">
        <h1 className="page-title">{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** Puck against Pudge in mid on a plain map: two bases, three lanes, the river. Decoration only. */
function LaneMap() {
  return (
    <figure aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-[35rem] lg:block">
      <svg viewBox="0 0 560 560" className="h-full w-full">
        <rect x="0.5" y="0.5" width="559" height="559" rx="2" className="fill-surface stroke-line" />
        <path d="M0 240 C120 250 200 300 280 280 C360 260 440 310 560 320" fill="none" className="stroke-raised" strokeWidth="26" />
        <g fill="none" className="stroke-line-hover" strokeWidth="10" strokeLinecap="round">
          <path d="M40 520 L40 60 L500 60" />
          <path d="M40 520 L500 520 L500 60" />
          <path d="M40 520 L500 60" />
        </g>
        <rect x="22" y="502" width="36" height="36" rx="2" className="fill-radiant" opacity=".85" />
        <rect x="482" y="22" width="36" height="36" rx="2" className="fill-dire" opacity=".85" />
      </svg>
      <Pin slug="puck" side="radiant" left="39%" top="48%" />
      <Pin slug="pudge" side="dire" left="52%" top="35%" />
      <figcaption className="absolute inset-x-0 -bottom-9 text-center text-sm text-subtle">
        Puck against Pudge in mid. Know the lane before it starts.
      </figcaption>
    </figure>
  );
}

function Pin({ slug, side, left, top }: { slug: string; side: "radiant" | "dire"; left: string; top: string }) {
  const ring = side === "radiant" ? "ring-radiant" : "ring-dire";
  return (
    <span
      style={{ left, top }}
      className={`absolute h-[9.3%] w-[9.3%] overflow-hidden rounded-full ring-1 ring-offset-2 ring-offset-bg ${ring}`}
    >
      <Image src={`${HERO_ART}/${slug}.png`} alt="" width={104} height={104} className="h-full w-full object-cover" />
    </span>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-sm text-subtle">
      <span className="h-px flex-1 bg-line" />
      or with email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
