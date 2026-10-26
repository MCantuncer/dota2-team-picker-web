// Keeps the files copied from the backend repo (the scoring engine and the generated database types)
// in step with a pinned backend commit, recorded in backend-ref.txt.
// Each copied file starts with a "Copied from the backend repo (...)" line, which is skipped when comparing.
//
//   node scripts/check-backend-sync.mjs           Check the copies match the pinned commit (CI).
//   node scripts/check-backend-sync.mjs --latest  Report how far the copies are behind backend main.
//   node scripts/check-backend-sync.mjs --update  Copy the files from backend main and pin its commit.
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const REPO = "MCantuncer/dota2-team-picker";
const PIN_FILE = "backend-ref.txt";
const run = promisify(execFile);
const HEADER = /^\/\/ Copied from the backend repo \([^)]*\)\. Keep in sync\.\n/;

/** Local folder → the backend folder its copied files come from. */
const COPIES = [
  { dir: "src/lib/engine", from: "services/engine/src/engine" },
  { dir: "src/lib/supabase", from: "services/accounts/supabase" },
];

const mode = process.argv[2] ?? "--check";
if (!["--check", "--latest", "--update"].includes(mode)) throw new Error(`Unknown option ${mode}`);

async function mainCommit() {
  const { stdout } = await run("git", ["ls-remote", `https://github.com/${REPO}.git`, "refs/heads/main"]);
  return stdout.split(/\s/)[0];
}

const pinned = (await readFile(PIN_FILE, "utf8")).trim();
if (!/^[0-9a-f]{40}$/.test(pinned)) throw new Error(`${PIN_FILE} must hold a full commit SHA`);
const ref = mode === "--check" ? pinned : await mainCommit();
console.log(`Comparing with backend ${mode === "--check" ? "pinned commit" : "main"} ${ref.slice(0, 7)}\n`);

// Fetch that one commit with git, which checks every file against its hash, and read the files from it.
const gitDir = await mkdtemp(join(tmpdir(), "backend-"));
await run("git", ["init", "--bare", "--quiet", gitDir]);
await run("git", ["--git-dir", gitDir, "fetch", "--quiet", "--depth", "1", `https://github.com/${REPO}.git`, ref]);

/** The file's content at the backend commit, or null when it doesn't exist there. */
async function backendFile(path) {
  try {
    return (await run("git", ["--git-dir", gitDir, "show", `${ref}:${path}`], { maxBuffer: 16 * 1024 * 1024 })).stdout;
  } catch {
    return null;
  }
}

let drift = 0;
for (const { dir, from } of COPIES) {
  for (const name of (await readdir(dir)).filter((f) => /^[\w.-]+\.ts$/.test(f)).sort()) {
    const path = join(dir, name);
    const local = await readFile(path, "utf8");
    const header = local.match(HEADER)?.[0];
    if (!header) continue;
    const remote = await backendFile(`${from}/${name}`);
    if (remote === null) {
      // A copy of a file that a backend PR adds: that PR has to be merged first.
      console.log(`missing  ${path}  (${from}/${name} is not in that backend commit, merge the backend PR first)`);
      drift++;
      continue;
    }
    if (remote === local.slice(header.length)) {
      console.log(`ok       ${path}`);
    } else if (mode === "--update") {
      await writeFile(path, header + remote);
      console.log(`updated  ${path}`);
    } else {
      console.log(`changed  ${path}`);
      drift++;
    }
  }
}

await rm(gitDir, { recursive: true, force: true });

if (mode === "--update" && !drift) {
  await writeFile(PIN_FILE, `${ref}\n`);
  console.log(`\nPinned backend ${ref.slice(0, 7)} in ${PIN_FILE}. Run the type check and tests, then commit.`);
} else if (drift && mode === "--latest") {
  console.error(`\n${drift} copied file(s) are behind backend main. Run npm run sync:backend in a PR to catch up.`);
  process.exit(1);
} else if (drift) {
  console.error(
    `\n${drift} copied file(s) don't match the pinned backend commit. ` +
      `Run npm run sync:backend to copy them again and update ${PIN_FILE}.`,
  );
  process.exit(1);
}
