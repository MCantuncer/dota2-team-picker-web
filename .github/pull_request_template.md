## What and why

<!-- What this changes and the reason, in a few sentences. Link the backend PR if there is one, and say which merges first. -->

## How it was tested

<!-- Tests added or changed, and what was checked by hand. Add a screenshot for visible changes (desktop and phone). -->

## Checklist

- [ ] One purpose, under about 400 changed lines (not counting generated files)
- [ ] Self-reviewed the whole diff and fixed what I found
- [ ] Lint, type check, unit tests and engine check pass locally; e2e run for page or flow changes
- [ ] Every Supabase call and `fetch` checks its error and shows the user a plain message
- [ ] Input from forms, URLs and `localStorage` is validated where it enters
- [ ] New logic and client components have unit tests; new pages or flows have an e2e test
- [ ] Uses design system tokens; works by keyboard and at phone width
- [ ] No secrets, no commented-out code, no stray `console.log`
- [ ] Follows [CONTRIBUTING.md](https://github.com/MCantuncer/dota2-team-picker-web/blob/main/CONTRIBUTING.md)
