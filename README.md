# Dota 2 Team Picker: website

The website for Dota 2 Team Picker: sign in with Steam or email, keep your favorite heroes, and
get hero suggestions during a draft.

The backend (hero data, scoring engine, accounts) lives in
[dota2-team-picker](https://github.com/MCantuncer/dota2-team-picker). Accounts run on Supabase;
set them up first with the
[`services/accounts`](https://github.com/MCantuncer/dota2-team-picker/tree/main/services/accounts)
README.

Built with Next.js (App Router), Tailwind CSS and Supabase Auth.

## Pages

| Path            | What it does                                                               |
| --------------- | -------------------------------------------------------------------------- |
| `/`             | Home                                                                       |
| `/login`        | Sign in with Steam, or log in with email and password                      |
| `/signup`       | Sign up with email (Supabase sends a confirmation link)                    |
| `/auth/confirm` | Finishes Steam sign-in and email confirmation links, then sets the session |

## Run locally

```sh
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm install
npm run dev                  # http://localhost:3000
```

## Deploy on Vercel (free)

1. On [vercel.com/new](https://vercel.com/new), import this repository. Vercel detects Next.js.
2. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase dashboard (Project Settings > API).
3. Deploy, then put the site address into Supabase: **Authentication > URL Configuration > Site
   URL**, and the `SITE_URL` secret of the Steam login function.
