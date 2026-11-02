import "server-only";

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

/** Shop items by id, from OpenDota's item list. Fetched at most once a day. */
export async function getItems(): Promise<Map<number, Item>> {
  const res = await fetch("https://api.opendota.com/api/constants/items", { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Could not load items: HTTP ${res.status}`);
  const data = (await res.json()) as Record<string, ItemConstant>;
  const items = new Map<number, Item>();
  for (const item of Object.values(data)) {
    if (typeof item.id !== "number" || !item.dname || !item.img) continue;
    items.set(item.id, { id: item.id, name: item.dname, image: CDN + item.img.replace(/\?.*$/, "") });
  }
  return items;
}
