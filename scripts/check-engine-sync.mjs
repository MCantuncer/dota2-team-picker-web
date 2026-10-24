// Checks that the engine files copied from the backend repo still match its main branch.
// Each copied file starts with a "Copied from the backend repo (...)" line, which this check skips.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "src/lib/engine";
const BACKEND = "https://raw.githubusercontent.com/MCantuncer/dota2-team-picker/main/services/engine/src/engine";
const HEADER = /^\/\/ Copied from the backend repo \([^)]*\)\. Keep in sync\.\n/;

let drift = 0;
for (const name of (await readdir(DIR)).filter((f) => /^[\w-]+\.ts$/.test(f)).sort()) {
  const local = await readFile(join(DIR, name), "utf8");
  const header = local.match(HEADER)?.[0];
  if (!header) continue;
  const res = await fetch(`${BACKEND}/${name}`);
  if (!res.ok) throw new Error(`Could not fetch ${name} from the backend: HTTP ${res.status}`);
  if ((await res.text()) === local.slice(header.length)) {
    console.log(`ok       ${name}`);
  } else {
    console.log(`changed  ${name}  (copy services/engine/src/engine/${name} from the backend again)`);
    drift++;
  }
}
if (drift) {
  console.error(`\n${drift} engine file(s) differ from the backend's main branch.`);
  process.exit(1);
}
