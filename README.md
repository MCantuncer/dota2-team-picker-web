# Dota 2 Team Picker: website

The website for Dota 2 Team Picker: sign in with Steam, keep your favorite heroes, and
get hero suggestions during a draft.

The backend (hero data, scoring engine, accounts) lives in
[dota2-team-picker](https://github.com/MCantuncer/dota2-team-picker). Accounts run on Supabase;
set them up first with the
[`services/accounts`](https://github.com/MCantuncer/dota2-team-picker/tree/main/services/accounts)
README.

Built with Next.js (App Router), Tailwind CSS and Supabase Auth.

All UI work follows the [design system](docs/design-system.md): tokens and shared classes in
`src/app/globals.css`, rules for using them in the doc.

## Pages

| Path            | What it does                                                               |
| --------------- | -------------------------------------------------------------------------- |
| `/`             | Home                                                                       |
| `/login`        | Sign in with Steam, the only way in (the first sign-in makes the account)  |
| `/signup`       | Old address: opens `/login`                                                |
| `/auth/confirm` | Finishes Steam sign-in, then sets the session                              |

## Run locally

```sh
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm install
npm run dev                  # http://localhost:3000
```

## Tests

```sh
npm test               # Vitest unit and component tests (src/**/*.test.ts[x])
npm run test:watch
npm run typecheck      # route types + tsc
npm run lint
npm run check:backend  # engine and database type copies match a version on backend main
npm run sync:backend   # copy them from backend main again
npm run test:e2e       # Playwright browser tests, see e2e/README.md
```

`src/lib/engine/` and `src/lib/supabase/database.types.ts` are copied from the backend repo. The Supabase
clients use the database types, so a query on a missing table or column fails the type check. There is no pin
file: PR checks accept a copy that matches any version of that file on backend main, and the browser tests run
against the newest backend commit whose database types match the copy. So a backend change never turns an
unrelated website PR red, and sync PRs from different threads don't conflict. To pick up backend changes, run
`npm run sync:backend` in its own PR: it copies the files from backend main. The "Backend drift" workflow
reports, without blocking anything, when backend main has newer versions.

Unit tests cover helpers and client components with React Testing Library. Async Server Components and
full pages are covered by the browser tests in `e2e/` instead, as the Next.js docs recommend: sign in,
profile, private-page redirects, parties and the Draft Room, with automatic accessibility checks on every page.

CI runs on every pull request and on `main`: lint, type check, unit tests with coverage, the build, the
backend copy check, dependency review (fails on a new package with a known high or critical
vulnerability), and CodeQL. Dependabot opens grouped update PRs weekly.

Before opening a pull request, read [CONTRIBUTING.md](CONTRIBUTING.md): it holds the code standards and the
checklist every change follows.

## Deploy on Vercel (free)

1. On [vercel.com/new](https://vercel.com/new), import this repository. Vercel detects Next.js.
2. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase dashboard (Project Settings > API).
3. Deploy, then put the site address into Supabase: **Authentication > URL Configuration > Site
   URL**, and the `SITE_URL` secret of the Steam login function.

Only `main` deploys. `vercel.json` turns off preview deployments for `feature/`, `bugfix/`, `dependabot/` and
`claude/` branches: CI already builds and browser-tests every pull request, Steam sign-in only returns to the
production address, and each preview build is billed in Build CPU Minutes.
