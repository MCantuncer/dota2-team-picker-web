# Development

Everything you need after the [Quick Start](../README.md#quick-start).

## Commands

```sh
npm test               # Vitest unit and component tests (src/**/*.test.ts[x])
npm run test:watch
npm run typecheck      # route types + tsc
npm run lint
npm run check:backend  # engine and database type copies match a version on backend main
npm run sync:backend   # copy them from backend main again
npm run test:e2e       # Playwright browser tests, see e2e/README.md
```

## Backend Copies

`src/lib/engine/` and `src/lib/supabase/database.types.ts` are copied from the backend repo. The Supabase
clients use the database types, so a query on a missing table or column fails the type check. There is no pin
file: PR checks accept a copy that matches any version of that file on backend main, and the browser tests run
against the newest backend commit whose database types match the copy. So a backend change never turns an
unrelated website PR red, and sync PRs from different threads don't conflict. To pick up backend changes, run
`npm run sync:backend` in its own PR: it copies the files from backend main. The "Backend drift" workflow
reports, without blocking anything, when backend main has newer versions.

## Tests

Unit tests cover helpers and client components with React Testing Library. Async Server Components and
full pages are covered by the browser tests in `e2e/` instead, as the Next.js docs recommend: sign in,
profile, private-page redirects, parties and the Draft Room, with automatic accessibility checks on every page.

## CI

CI runs on every pull request and on `main`: lint, type check, unit tests with coverage, the build, the
backend copy check, dependency review (fails on a new package with a known high or critical
vulnerability), and CodeQL. Dependabot opens grouped update PRs weekly.

## Deploy on Vercel (Free)

1. On [vercel.com/new](https://vercel.com/new), import this repository. Vercel detects Next.js.
2. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase dashboard (Project Settings > API).
3. Deploy, then put the site address into Supabase: **Authentication > URL Configuration > Site
   URL**, and the `SITE_URL` secret of the Steam login function.

Only `main` deploys. `vercel.json` turns off preview deployments for `feature/`, `bugfix/`, `dependabot/` and
`claude/` branches: CI already builds and browser-tests every pull request, Steam sign-in only returns to the
production address, and each preview build is billed in Build CPU Minutes. A branch with any other prefix still
gets a preview, so add new prefixes to `vercel.json`.
