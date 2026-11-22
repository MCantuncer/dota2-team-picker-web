#!/usr/bin/env node
// Refreshes the trimmed copies of OpenDota's hero and item lists in src/lib/data, which the site uses when OpenDota
// is down and the browser tests always use. Run it after a patch adds a hero or an item:
//
//   node scripts/update-opendota-copy.mjs          # from api.opendota.com
//   node scripts/update-opendota-copy.mjs <dir>    # from heroes.json and items.json in <dir>, e.g. the build folder
//                                                  # of the dotaconstants npm package, which OpenDota serves
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "src", "lib", "data");

/** Only the fields src/lib/heroes.ts and src/lib/items.ts read, so the copies stay small. */
const FIELDS = {
  heroes: ["id", "localized_name", "img", "icon", "primary_attr", "roles"],
  items: ["id", "dname", "img"],
};

async function load(name, dir) {
  if (dir) return JSON.parse(await readFile(path.join(dir, `${name}.json`), "utf8"));
  const res = await fetch(`https://api.opendota.com/api/constants/${name}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`OpenDota ${name} list failed: HTTP ${res.status}`);
  return res.json();
}

const dir = process.argv[2];
for (const [name, fields] of Object.entries(FIELDS)) {
  const data = await load(name, dir);
  const trimmed = Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => typeof v?.id === "number")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => [key, Object.fromEntries(fields.filter((f) => v[f] !== undefined).map((f) => [f, v[f]]))]),
  );
  const file = path.join(OUT, `opendota-${name}.json`);
  await writeFile(file, JSON.stringify(trimmed) + "\n");
  console.log(`${Object.keys(trimmed).length} ${name} -> ${path.relative(process.cwd(), file)}`);
}
