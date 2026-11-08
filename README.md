<div align="center">

<img src="docs/readme/icon.svg" width="64" height="64" alt="">

# Dota 2 Team Picker

**Pick the hero this draft needs.**<br>
Type the heroes as they come. In under a second you get eight picks for your position,<br>
each with the reason from this draft.

[![Live Site](https://img.shields.io/website?url=https%3A%2F%2Fdota2-team-picker-web.vercel.app&style=flat-square&label=Live%20Site&up_message=online&up_color=e8a052&down_message=offline&labelColor=1a1815&logo=vercel&logoColor=ece6da)](https://dota2-team-picker-web.vercel.app)
[![CI](https://img.shields.io/github/actions/workflow/status/MCantuncer/dota2-team-picker-web/ci.yml?branch=main&style=flat-square&label=CI&labelColor=1a1815&logo=githubactions&logoColor=ece6da)](https://github.com/MCantuncer/dota2-team-picker-web/actions/workflows/ci.yml)
[![Browser Tests](https://img.shields.io/github/actions/workflow/status/MCantuncer/dota2-team-picker-web/e2e.yml?branch=main&style=flat-square&label=Browser%20Tests&labelColor=1a1815&logo=playwright&logoColor=ece6da)](https://github.com/MCantuncer/dota2-team-picker-web/actions/workflows/e2e.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/MCantuncer/dota2-team-picker-web/codeql.yml?branch=main&style=flat-square&label=CodeQL&labelColor=1a1815&logo=github&logoColor=ece6da)](https://github.com/MCantuncer/dota2-team-picker-web/actions/workflows/codeql.yml)

[![Next.js 16](https://img.shields.io/badge/Next.js-16-3a352e?style=flat-square&labelColor=1a1815&logo=nextdotjs&logoColor=ece6da)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-3a352e?style=flat-square&labelColor=1a1815&logo=react&logoColor=ece6da)](https://react.dev)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3a352e?style=flat-square&labelColor=1a1815&logo=typescript&logoColor=ece6da)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-3a352e?style=flat-square&labelColor=1a1815&logo=tailwindcss&logoColor=ece6da)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20and%20Postgres-3a352e?style=flat-square&labelColor=1a1815&logo=supabase&logoColor=ece6da)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-3a352e?style=flat-square&labelColor=1a1815&logo=vercel&logoColor=ece6da)](https://vercel.com)

<a href="https://dota2-team-picker-web.vercel.app"><img src="docs/readme/landing.jpg" width="860" alt="The home page: a big headline, Sign In with Steam, and an example draft where Earth Spirit is the top pick for mid against Pudge and Anti-Mage"></a>

</div>

## What You Get

| Feature | What It Does |
| --- | --- |
| **Draft Room** | Eight picks for your position, recalculated every round, each with a reason that names this draft's heroes and real numbers. |
| **Watch Dota** | Press PrtScn in Dota and paste: both teams and the bans fill in by themselves. |
| **My Heroes** | Your hero pool per position, filled from your Steam games, with a Top 3 that the picks lean on. |
| **Party and Stacks** | Draft with friends and plan the whole lineup's picks together. |
| **Game Story** | After the game: items, skills and the full talent tree for your hero, against this enemy lineup. |
| **Steam Sign-In** | One click, no password. Your rank and hero record are read for you. |

## Quick Start

```sh
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm install
npm run dev                  # http://localhost:3000
```

Accounts run on Supabase. Set them up first with the
[accounts README](https://github.com/MCantuncer/dota2-team-picker/tree/main/services/accounts) in the backend repo.

## Where Things Live

| Path | What Is There |
| --- | --- |
| [`src/app`](src/app) | Pages (Next.js App Router) |
| [`src/lib/engine`](src/lib/engine) | The scoring engine, copied from the [backend repo](https://github.com/MCantuncer/dota2-team-picker) |
| [`src/app/globals.css`](src/app/globals.css) | Design tokens and shared classes, see the [design system](docs/design-system.md) |
| [`e2e`](e2e) | Playwright browser tests with accessibility checks |
| [`docs/development.md`](docs/development.md) | Tests, backend copies, CI and deploying to Vercel |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request: it holds the code standards and the checklist
every change follows.

<sub>Match data from OpenDota and STRATZ. Hero art © Valve Corporation. Not affiliated with or endorsed by Valve.
Dota 2 is a trademark of Valve Corporation.</sub>
