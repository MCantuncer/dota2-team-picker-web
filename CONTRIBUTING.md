# Contributing

The rules every change to this site follows. They keep the code easy to read and safe to change as it grows.
Where a tool can check a rule, CI checks it; the rest is on the author and the reviewer.

## Before you open a pull request

```sh
npm run lint
npm run typecheck
npm test
npm run check:engine
npm run test:e2e     # when you change a page or a flow, see e2e/README.md
```

Then review your own diff from top to bottom as if someone else wrote it, and fix what you find before asking for
review. The PR template has the checklist.

## Branches, commits and pull requests

- Branch from `main` as `feature/<what-it-does>` or `bugfix/<what-it-fixes>`, for example `feature/party-lobby`.
- One purpose per pull request, aimed at `main`. Keep it small: under about 400 changed lines, not counting generated
  files or lockfiles. Split bigger work into PRs that each work on their own. No stacked PRs.
- Commit messages start with a verb in the imperative and say what changes, for example
  `Show an error when the lineup fails to save`.
- Update your branch by rebasing onto `main`, not by merging `main` into it.
- Don't mix a refactor or reformat with a behaviour change; put them in separate commits or PRs.
- A change that needs a backend change links the backend PR, and says which one merges first.

## Code

### Types

- `strict` TypeScript. Type every Supabase client with the generated `Database` types.
- No `any`. Use `unknown` and narrow it. A cast (`as X`) or non-null assertion (`!`) needs a one-line comment saying
  why it is safe, or a guard instead.
- Name prop types (`interface DraftViewProps`) once a component takes more than three props.

### Errors

- Check `error` on every Supabase call and `fetch`. Never read only `data`.
- The user sees a short, plain message near what failed, with a way to retry. Log the detail with `console.error`.
- Don't swallow errors with an empty `catch` unless losing the value is truly fine, and say so in a comment.
- Pages that can fail to load have an `error.tsx` or show an error state; pages that load slowly show a loading
  state.

### Input

- Validate data where it enters: form fields, URL parameters, `localStorage` and function responses. Check the shape
  once at the edge, then trust it inside. Saved browser data can be from an older version of the site, so a value
  that doesn't match falls back to the default instead of crashing.
- Redirect targets from the URL go through `safeNext`.
- Never put tokens or secrets in URLs, logs or `NEXT_PUBLIC_` variables.

### Structure

- Server Components by default. Add `"use client"` only to the part that needs state, effects or the browser, and
  keep it as low in the tree as possible.
- Pages render; they don't hold logic. Database queries live in a data module per feature under `src/lib` (teams,
  friends, party, profile), which owns the query, its types and its error handling. Logic that isn't UI (scoring
  glue, parsing, formatting) lives in `src/lib` with unit tests.
- One main component per file. Aim for files under about 300 lines and functions under about 50. When a file grows
  past that, split it by responsibility, next to the page that uses it, or in `src/components` once two pages share
  it.
- One source of truth for shared values (position names, rank names, limits). Import them; don't copy them.
- `src/lib/engine` is a copy of the backend engine. Never edit it here: change the backend, then sync the copy.
  `npm run check:engine` fails on any drift.

### Naming

- Files and folders in `kebab-case`; components in `PascalCase`; hooks start with `use`.
- Use the product's words: draft, pick, ban, lineup, party, captain.
- Booleans read as questions: `isCaptain`, `hasSteam`, `canInvite`. Event props start with `on`: `onPicked`.
- Constants in `UPPER_SNAKE_CASE`, with the unit in the name when there is one: `INVITE_TTL_MS`.
- No unexplained abbreviations in exported names.

### Comments

- Explain why, not what. Every exported component, function and type gets a short doc comment saying what it is for
  and anything surprising about it.
- No commented-out code and no stray `console.log`.

### Styling and accessibility

- Use the design system's tokens and classes from `globals.css` (`bg-surface`, `text-muted`, `btn`, `page`), never
  raw colours or one-off pixel values.
- Every control works by keyboard and has an accessible name. Use real elements (`button`, `a`, `label`) before ARIA.
  The e2e tests run axe on every page and fail on violations.
- Check every layout at phone width.

## Tests

- New logic in `src/lib` and new client components get unit tests. Test what the user sees and does (React Testing
  Library queries by role and label), not implementation details.
- New pages and flows get at least one Playwright test in `e2e/`.
- A bug fix starts with a test that fails without the fix.
- Never skip or delete a failing test to get green; fix the cause.

## Security and dependencies

- Supabase row level security is the real guard; hiding a button is not. Every write the site makes must also be
  refused by the database for someone who isn't allowed.
- Secrets go in Vercel or GitHub Actions settings, never in the repo.
- Add a dependency only when it clearly beats writing the code, and prefer well-maintained packages. Dependency
  review blocks packages with known high or critical vulnerabilities.
