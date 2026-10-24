# Browser tests

Playwright tests that drive a production build of the site against a local Supabase stack, on a desktop
and a phone viewport. Each page visit also runs [axe](https://github.com/dequelabs/axe-core) and fails on
serious or critical WCAG 2.2 AA problems.

## Run locally

Needs Docker and a checkout of the backend repo next to this one.

```sh
# 1. Local Supabase with every migration (from the backend repo)
cd ../dota2-team-picker/services/accounts
npx supabase start -x realtime,storage-api,imgproxy,logflare,vector,supavisor,edge-runtime,studio,postgres-meta,mailpit

# 2. Point the site at it, using the local stack's development keys
eval "$(npx supabase status -o env)"
export NEXT_PUBLIC_SUPABASE_URL=$API_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY E2E_SUPABASE_SECRET_KEY=$SECRET_KEY

# 3. Build and test (back in this repo)
npx playwright install chromium   # once
npm run build && npm run test:e2e
```

Every test signs up its own fresh user, so tests run in parallel and need no cleanup. The helpers refuse to
run against anything but a local Supabase.
