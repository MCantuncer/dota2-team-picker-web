import "server-only";
import { getOpenDotaConstants } from "@/lib/opendota-constants";

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

/** All heroes, from OpenDota's hero list (or the site's copy of it while OpenDota is down). Fetched at most once a day. */
export async function getHeroes(): Promise<Hero[]> {
  // OpenDota's list has this shape; the copy keeps only these fields.
  const data = (await getOpenDotaConstants("heroes")) as Record<string, HeroConstant>;
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
