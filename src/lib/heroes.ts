import "server-only";

export interface Hero {
  id: number;
  name: string;
  image: string;
  /** Small square icon, for lists. */
  icon: string;
  primaryAttr: string;
  roles: string[];
}

interface HeroConstant {
  id: number;
  localized_name: string;
  img: string;
  icon: string;
  primary_attr: string;
  roles: string[];
}

const CDN = "https://cdn.cloudflare.steamstatic.com";

/** All heroes, from OpenDota's hero list. Fetched at most once a day. */
export async function getHeroes(): Promise<Hero[]> {
  const res = await fetch("https://api.opendota.com/api/constants/heroes", { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Could not load heroes: HTTP ${res.status}`);
  const data = (await res.json()) as Record<string, HeroConstant>;
  return Object.values(data)
    .map((h) => ({
      id: h.id,
      name: h.localized_name,
      image: CDN + h.img.replace(/\?$/, ""),
      icon: CDN + h.icon.replace(/\?$/, ""),
      primaryAttr: h.primary_attr,
      roles: h.roles,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
