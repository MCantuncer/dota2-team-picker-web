import { expect } from "@playwright/test";
import { SNAPSHOT_URL } from "../src/lib/engine/snapshot";
import type { Page } from "@playwright/test";
import { expectAccessible, heroData, newPlayer, savedSuggestions, seedMidHeroes, test, uniqueEmail } from "./helpers";

/** The position chosen for an ally, as its checked radio. */
const chosen = (page: Page, hero: string) =>
  page.getByRole("radiogroup", { name: `${hero} position` }).getByRole("radio", { checked: true });

test("the draft screen suggests heroes as both teams fill in", async ({ page }) => {
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await expect(ally).toBeVisible();

  await page.getByLabel("Bans, several at once: pa sf am").fill("pa sf am");
  await page.keyboard.press("Enter");
  await ally.fill("cm5");
  await ally.press("Enter");
  await page.getByLabel("Enemy pick").fill("pudge");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible();
  await expect(chosen(page, "Crystal Maiden")).toHaveAccessibleName(/^Pos 5/);
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Pudge")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unban Anti-Mage" })).toBeVisible();

  const picks = page.getByRole("list", { name: "Suggested heroes" }).locator(":scope > li");
  await expect(picks).toHaveCount(8);
  await expectAccessible(page);

  // Taking a suggestion puts it on your team and ends the list.
  await page.getByRole("button", { name: "Picked" }).first().click();
  await expect(page.getByText(/Good luck!/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(picks).toHaveCount(8);
});

test("on Dire the Enemy team comes first, like the Radiant and Dire order in Dota", async ({ page }) => {
  await page.goto("/draft");
  await expect(page.getByLabel("My team pick, e.g. cm5")).toBeVisible();
  const teams = page.locator('section[aria-label="My Team"], section[aria-label="Enemy"]');
  await expect(teams.first()).toHaveAttribute("aria-label", "My Team");

  const side = page.getByRole("region", { name: "Read the Dota screen" });
  await side.getByRole("button", { name: "Dire", exact: true }).click();
  await expect(teams.first()).toHaveAttribute("aria-label", "Enemy");
  await expect(page.getByRole("heading", { name: /^Enemy .*Radiant$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^My Team .*Dire$/ })).toBeVisible();
  // Tab follows the screen: from the Enemy box to the My Team box.
  await page.getByLabel("Enemy pick, e.g. sf2").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("My team pick, e.g. cm5")).toBeFocused();
  await expectAccessible(page);

  await side.getByRole("button", { name: "Radiant", exact: true }).click();
  await expect(teams.first()).toHaveAttribute("aria-label", "My Team");
});

test("the draft screen takes several heroes at once and forgives a typo", async ({ page }) => {
  await page.goto("/draft");
  const enemy = page.getByLabel("Enemy pick");
  await expect(enemy).toBeVisible();

  await enemy.fill("pa sf");
  await enemy.press("Enter");
  await page.getByLabel("My team pick, e.g. cm5").fill("cm5 lion 4");
  await page.keyboard.press("Enter");
  await enemy.fill("meduas");
  await enemy.press("Enter");

  const enemies = page.getByRole("region", { name: "Enemy" });
  for (const name of ["Phantom Assassin", "Shadow Fiend", "Medusa"]) await expect(enemies.getByText(name)).toBeVisible();
  await expect(chosen(page, "Crystal Maiden")).toHaveAccessibleName(/^Pos 5/);
  await expect(chosen(page, "Lion")).toHaveAccessibleName(/^Pos 4/);
});

test("the draft screen guesses ally positions and swaps them in one click", async ({ page }) => {
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5 lion");
  await ally.press("Enter");

  // Lion has no position typed, so it shows a guess until someone sets it.
  const lion = page.getByRole("radiogroup", { name: "Lion position" });
  await expect(lion.getByRole("radio", { name: /guessed/ })).toBeVisible();
  await expect(page.getByText("Dashed positions are guesses")).toBeVisible();

  // Giving Lion Crystal Maiden's position swaps them, so two heroes never share one.
  await lion.getByRole("radio", { name: /^Pos 5/ }).click();
  await expect(chosen(page, "Lion")).toHaveAccessibleName(/^Pos 5/);
  await expect(page.getByRole("radiogroup", { name: "Crystal Maiden position" }).getByRole("radio", { name: /guessed/ })).toBeVisible();
  await expectAccessible(page);
});

test("the draft screen lets the player set enemy positions over the guess", async ({ page }) => {
  await page.goto("/draft");
  const enemy = page.getByLabel("Enemy pick, e.g. sf2");
  await enemy.fill("sf2 pa");
  await enemy.press("Enter");

  // A digit sets the position; without one the engine's guess shows dashed.
  await expect(chosen(page, "Shadow Fiend")).toHaveAccessibleName(/^Pos 2/);
  const pa = page.getByRole("radiogroup", { name: "Phantom Assassin position" });
  await expect(pa.getByRole("radio", { name: /guessed/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Dashed positions are guesses")).toBeVisible();

  // Moving Phantom Assassin to mid swaps Shadow Fiend back to a guess, so two enemies never share one.
  await pa.getByRole("radio", { name: /^Pos 2/ }).click();
  await expect(chosen(page, "Phantom Assassin")).toHaveAccessibleName(/^Pos 2/);
  await expect(page.getByRole("radiogroup", { name: "Shadow Fiend position" }).getByRole("radio", { name: /guessed/ })).toBeVisible();
  await expectAccessible(page);
});

test("the draft screen shows the win chance once a checked model exists", async ({ page }) => {
  // The live data has no checked model yet, so add one that favours neither side.
  await page.route(SNAPSHOT_URL, async (route) => {
    const byKnown = Object.fromEntries([2, 4, 6, 8, 10].map((k) => [k, { a: 0, b: 0.05 }]));
    await route.fulfill({ json: { ...(await heroData()), winModel: { fittedAt: "2026-10-26T00:00:00Z", games: 5000, byKnown } } });
  });
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  await expect(page.getByRole("region", { name: "Win chance" })).toHaveCount(0);

  await page.getByLabel("Enemy pick").fill("pudge");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Win chance" })).toContainText(/\d+\.\d%/);
  await expect(page.getByTitle("Change in your team's win chance")).toHaveCount(8);
  await expectAccessible(page);
});

test("in a party the draft is kept for the whole party", async ({ page }) => {
  await newPlayer(page, uniqueEmail("party-draft"), "Earthshaker");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await expect(page.getByRole("button", { name: "Leave party" })).toBeVisible();

  await page.goto("/draft");
  await expect(page.getByRole("main").getByText("Party", { exact: true })).toBeVisible();
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  const team = page.getByRole("region", { name: "My team" });
  await expect(team.getByText("Entered by You")).toBeVisible();

  // The draft lives in the database, so a reload (or a teammate's screen) shows it too.
  await page.reload();
  await expect(team.getByText("Crystal Maiden")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(team.getByText("Crystal Maiden")).toHaveCount(0);
  await ally.fill("pudge");
  await ally.press("Enter");
  await expect(team.getByText("Pudge")).toBeVisible();
  await page.getByRole("button", { name: "New draft" }).click();
  await expect(team.getByText("Pudge")).toHaveCount(0);
});

test("the party leader can plan the whole team", async ({ page }) => {
  await newPlayer(page, uniqueEmail("party-plan"), "Tiny");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await expect(page.getByRole("button", { name: "Leave party" })).toBeVisible();

  await page.goto("/draft");
  await page.getByRole("button", { name: "Team plan" }).click();
  const plan = page.getByRole("list", { name: "Team plan" }).locator(":scope > li");
  await expect(plan).toHaveCount(5);
  await expectAccessible(page);

  // Marking a planned hero as picked puts it on the team in its position.
  const first = plan.first();
  const hero = await first.locator("[data-hero-name]").innerText();
  await first.getByRole("button", { name: "Picked" }).click();
  await expect(page.getByRole("region", { name: "My team" }).getByText(hero)).toBeVisible();
  await expect(plan.first().getByText("Picked", { exact: true })).toBeVisible();
});

test("a party draft saves what each player was shown and ends with the after-game card", async ({ page }) => {
  const email = uniqueEmail("after-game");
  await newPlayer(page, email, "Lina");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await expect(page.getByRole("button", { name: "Leave party" })).toBeVisible();

  await page.goto("/draft");
  await expect(page.getByRole("list", { name: "Suggested heroes" }).locator(":scope > li")).toHaveCount(8);
  await expect.poll(async () => (await savedSuggestions(email)).map((r) => r.heroes.length)).toEqual([8]);
  // No heroes of her own, so the list is from every hero and Pool Check counts it as such.
  const [saved] = await savedSuggestions(email);
  expect(saved).toMatchObject({ list_rule: "any", outside: saved!.heroes });

  const ally = page.getByLabel("My team pick, e.g. cm5");
  for (const pick of ["cm5", "lion4", "axe3", "sf2", "am1"]) {
    await ally.fill(pick);
    await ally.press("Enter");
  }
  const card = page.getByRole("region", { name: "After the game" });
  await expect(card.getByRole("button", { name: "Find result" })).toBeVisible();
  await card.getByLabel("Or paste the match ID").fill("not a match");
  await card.getByRole("button", { name: "Check" }).click();
  await expect(card.getByRole("status")).toHaveText(/A match ID is a number/);
  await expectAccessible(page);
});

test("the draft screen shows the game plan once both teams are in", async ({ page }) => {
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await expect(ally).toBeVisible();
  for (const pick of ["jugg1", "puck2", "mars3", "lion4", "cm5"]) {
    await ally.fill(pick);
    await ally.press("Enter");
  }
  const enemy = page.getByLabel("Enemy pick");
  for (const pick of ["pa", "sf", "axe", "wd", "lich"]) {
    await enemy.fill(pick);
    await enemy.press("Enter");
  }

  const plan = page.getByRole("region", { name: "Game Story" });
  await expect(plan.getByRole("heading", { name: "The Team" })).toBeVisible();
  await expect(plan.getByRole("tab", { name: /Pos [1-5]/ })).toHaveCount(5);
  await expectAccessible(page);
});

test("a hero in the player's Top 5 gets its small boost in the draft", async ({ page }) => {
  const email = uniqueEmail("draft-top3");
  await newPlayer(page, email, "Draft Top");
  await seedMidHeroes(email, [74, 76], [76]);
  await page.goto("/draft");
  const picks = page.getByRole("list", { name: "Suggested heroes" }).locator(":scope > li");
  // The best pick shows its reasons open.
  await expect(picks.first()).toContainText("Outworld Devourer");
  await expect(picks.first().getByText("Top 5 (+0.5)")).toBeVisible();
  const invoker = picks.filter({ hasText: "Invoker" });
  await invoker.getByRole("button", { name: /Invoker/ }).click();
  await expect(invoker.getByText("Favorite (+1.5)")).toBeVisible();
  await expect(invoker.getByText("Top 5 (+0.5)")).toHaveCount(0);
});

test("a hero from outside the pool shows under the list only when it clearly beats the pool", async ({ page }) => {
  const email = uniqueEmail("draft-outsider");
  await newPlayer(page, email, "Draft Outsider");
  // Nature's Prophet is one of the weakest mids in the data, so the best mid clears the margin.
  await seedMidHeroes(email, [53]);
  await page.goto("/draft");
  const picks = page.getByRole("list", { name: "Suggested heroes" }).locator(":scope > li");
  await expect(picks).toHaveCount(1);
  await expect(picks.first()).toContainText("Nature's Prophet");

  const outside = page.getByRole("list", { name: "Hero from outside your pool" }).locator(":scope > li");
  await expect(outside).toHaveCount(1);
  await expect(outside.getByText("Outside Pool")).toBeVisible();
  await expect(page.getByText(/^Scores \d+\.\d above Nature's Prophet, your best, more than the \d+\.\d the data could be off by\.$/)).toBeVisible();
  await expectAccessible(page);
});
