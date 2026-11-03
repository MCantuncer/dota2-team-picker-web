// Keeps the files copied from the backend repo (the scoring engine and the generated database types)
// in step with backend main. There is no pin file: a copy is valid when it matches a version of that file
// on backend main, so sync PRs from different threads don't conflict on a shared line.
// Each copied file starts with a "Copied from the backend repo (...)" line, which is skipped when comparing.
//
//   node scripts/check-backend-sync.mjs                 Check every copy matches a version on backend main (CI).
//   node scripts/check-backend-sync.mjs --latest        Report copies that are behind backend main.
//   node scripts/check-backend-sync.mjs --update        Copy the files from backend main.
//   node scripts/check-backend-sync.mjs --schema-commit Print the newest backend main commit whose database
//                                                       types match the copy (for the browser tests).
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const REPO = "MCantuncer/dota2-team-picker";
const run = promisify(execFile);
const HEADER = /^\/\/ Copied from the backend repo \([^)]*\)\. Keep in sync\.\n/;
const SCHEMA = { local: "src/lib/supabase/database.types.ts", backend: "services/accounts/supabase/database.types.ts" };

/** Local folder → the backend folder its copied files come from. */
const COPIES = [
  { dir: "src/lib/engine", from: "services/engine/src/engine" },
  { dir: "src/lib/supabase", from: "services/accounts/supabase" },
];

const mode = process.argv[2] ?? "--check";
if (!["--check", "--latest", "--update", "--schema-commit"].includes(mode)) throw new Error(`Unknown option ${mode}`);
const log = mode === "--schema-commit" ? () => {} : (line) => console.log(line);

// Fetch backend main with its history (git checks every object against its hash).
const gitDir = await mkdtemp(join(tmpdir(), "backend-"));
const git = async (args, input) => {
  const child = run("git", ["--git-dir", gitDir, ...args], { maxBuffer: 64 * 1024 * 1024 });
  if (input !== undefined) child.child.stdin.end(input);
  return (await child).stdout;
};
await run("git", ["init", "--bare", "--quiet", gitDir]);
await git(["fetch", "--quiet", `https://github.com/${REPO}.git`, "refs/heads/main:refs/heads/main"]);
const head = (await git(["rev-parse", "main"])).trim();
log(`Comparing with backend main ${head.slice(0, 7)}\n`);

/** The file at backend main, or null when it isn't there. */
async function mainFile(path) {
  try {
    return await git(["show", `main:${path}`]);
  } catch {
    return null;
  }
}

/** Every change to `path` on main, newest first: the commit and the file's blob after it. */
async function history(path) {
  const out = await git(["log", "--format=commit %H", "--raw", "--no-abbrev", "main", "--", path]);
  const changes = [];
  let commit = "";
  for (const line of out.split("\n")) {
    if (line.startsWith("commit ")) commit = line.slice(7);
    else if (line.startsWith(":")) changes.push({ commit, blob: line.split(/\s+/)[3] });
  }
  return changes;
}

const blobOf = async (content) => (await git(["hash-object", "--stdin"], content)).trim();

/** The copy's content without its header, or null when the file isn't a copy. */
async function copyContent(path) {
  const local = await readFile(path, "utf8");
  const header = local.match(HEADER)?.[0];
  return header ? { header, body: local.slice(header.length) } : null;
}

if (mode === "--schema-commit") {
  const copy = await copyContent(SCHEMA.local);
  if (!copy) throw new Error(`${SCHEMA.local} is not a backend copy`);
  const blob = await blobOf(copy.body);
  const changes = await history(SCHEMA.backend);
  const i = changes.findIndex((c) => c.blob === blob);
  if (i < 0) throw new Error(`${SCHEMA.local} matches no version on backend main`);
  // The newest commit before the types changed again (main is a straight line of squash merges).
  console.log(i === 0 ? head : (await git(["rev-parse", `${changes[i - 1].commit}^`])).trim());
  await rm(gitDir, { recursive: true, force: true });
  process.exit(0);
}

let failed = 0;
let behind = 0;
for (const { dir, from } of COPIES) {
  for (const name of (await readdir(dir)).filter((f) => /^[\w.-]+\.ts$/.test(f)).sort()) {
    const path = join(dir, name);
    const copy = await copyContent(path);
    if (!copy) continue;
    const backendPath = `${from}/${name}`;
    const latest = await mainFile(backendPath);
    if (latest === copy.body) {
      log(`ok       ${path}`);
      continue;
    }
    if (mode === "--update") {
      if (latest === null) {
        log(`missing  ${path}  (${backendPath} is not on backend main, merge the backend PR first)`);
        failed++;
      } else {
        await writeFile(path, copy.header + latest);
        log(`updated  ${path}`);
      }
      continue;
    }
    const blob = await blobOf(copy.body);
    if ((await history(backendPath)).some((c) => c.blob === blob)) {
      log(`behind   ${path}  (an older version on backend main)`);
      behind++;
    } else if (latest === null) {
      log(`missing  ${path}  (${backendPath} is not on backend main, merge the backend PR first)`);
      failed++;
    } else {
      log(`changed  ${path}  (matches no version on backend main)`);
      failed++;
    }
  }
}

await rm(gitDir, { recursive: true, force: true });

if (failed) {
  console.error(
    `\n${failed} copied file(s) match no version on backend main. ` +
      `Don't edit copies here: change the backend, then run npm run sync:backend.`,
  );
  process.exit(1);
} else if (mode === "--update") {
  log("\nCopied from backend main. Run the type check and tests, then commit.");
} else if (behind && mode === "--latest") {
  console.error(`\n${behind} copied file(s) are behind backend main. Run npm run sync:backend in a PR to catch up.`);
  process.exit(1);
} else if (behind) {
  log(`\n${behind} copied file(s) are behind backend main, which is fine for this check.`);
}
