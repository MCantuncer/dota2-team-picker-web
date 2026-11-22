import "server-only";
import { getOpenDotaConstants } from "@/lib/opendota-constants";

/** A shop item, for showing it by name and picture. */
export interface Item {
  id: number;
  name: string;
  image: string;
}

interface ItemConstant {
  id: number;
  dname?: string;
  img?: string;
}

const CDN = "https://cdn.cloudflare.steamstatic.com";

/** Shop items by id, from OpenDota's item list (or the site's copy of it while OpenDota is down). Fetched at most once a day. */
export async function getItems(): Promise<Map<number, Item>> {
  // OpenDota's list has this shape; entries without a name or picture are skipped below.
  const data = (await getOpenDotaConstants("items")) as Record<string, ItemConstant>;
  const items = new Map<number, Item>();
  for (const item of Object.values(data)) {
    if (typeof item.id !== "number" || !item.dname || !item.img) continue;
    items.set(item.id, { id: item.id, name: item.dname, image: CDN + item.img.replace(/\?.*$/, "") });
  }
  return items;
}
