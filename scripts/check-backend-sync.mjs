// Checks that the files copied from the backend repo still match its main branch:
// the scoring engine and the generated database types.
// Each copied file starts with a "Copied from the backend repo (...)" line, which this check skips.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const BACKEND = "https://raw.githubusercontent.com/MCantuncer/dota2-team-picker/main";
const HEADER = /^\/\/ Copied from the backend repo \([^)]*\)\. Keep in sync\.\n/;

/** Local folder → the backend folder its copied files come from. */
const COPIES = [
  { dir: "src/lib/engine", from: "services/engine/src/engine" },
  { dir: "src/lib/supabase", from: "services/accounts/supabase" },
];

let drift = 0;
for (const { dir, from } of COPIES) {
  for (const name of (await readdir(dir)).filter((f) => /^[\w.-]+\.ts$/.test(f)).sort()) {
    const local = await readFile(join(dir, name), "utf8");
    const header = local.match(HEADER)?.[0];
    if (!header) continue;
    const res = await fetch(`${BACKEND}/${from}/${name}`);
    if (!res.ok) throw new Error(`Could not fetch ${from}/${name} from the backend: HTTP ${res.status}`);
    if ((await res.text()) === local.slice(header.length)) {
      console.log(`ok       ${dir}/${name}`);
    } else {
      console.log(`changed  ${dir}/${name}  (copy ${from}/${name} from the backend again)`);
      drift++;
    }
  }
}
if (drift) {
  console.error(`\n${drift} copied file(s) differ from the backend's main branch.`);
  process.exit(1);
}
