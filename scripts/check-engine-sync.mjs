// Checks that the engine files copied from the backend repo still match its main branch.
// Each copied file starts with a "Copied from the backend repo (<repo>, <path>)" line.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "src/lib/engine";
const HEADER = /^\/\/ Copied from the backend repo \(([\w.-]+\/[\w.-]+), ([^)]+)\)\. Keep in sync\.\n/;

let drift = 0;
for (const name of (await readdir(DIR)).filter((f) => f.endsWith(".ts")).sort()) {
  const local = await readFile(join(DIR, name), "utf8");
  const match = local.match(HEADER);
  if (!match) continue;
  const [header, repo, path] = match;
  const url = `https://raw.githubusercontent.com/${repo}/main/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch ${url}: HTTP ${res.status}`);
  if ((await res.text()) === local.slice(header.length)) {
    console.log(`ok       ${name}`);
  } else {
    console.log(`changed  ${name}  (copy ${path} from ${repo} again)`);
    drift++;
  }
}
if (drift) {
  console.error(`\n${drift} engine file(s) differ from the backend's main branch.`);
  process.exit(1);
}
