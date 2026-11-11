import { expect } from "@playwright/test";
import { fakeDotaWindow, linkSteam, newPlayer, test } from "./helpers";

test("Watch Dota reads both teams and the bans off the shared window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(60_000);
  await fakeDotaWindow(page);
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch Dota" }).click();
  await expect(page.getByText("Watching Dota")).toBeVisible({ timeout: 45_000 });
  // This frame has the names blanked out, so the side is chosen by hand.
  await expect(page.getByText("Choose your team so picks go to the right side.")).toBeVisible();
  await page.getByRole("group", { name: "My Side" }).getByRole("button", { name: "Radiant", exact: true }).click();
  const mine = page.getByRole("region", { name: "My team" });
  const enemy = page.getByRole("region", { name: "Enemy" });
  for (const name of ["Crystal Maiden", "Warlock", "Juggernaut", "Omniknight"])
    await expect(mine.getByText(name)).toBeVisible({ timeout: 15_000 });
  for (const name of ["Lion", "Death Prophet", "Bloodseeker", "Tiny"])
    await expect(enemy.getByText(name)).toBeVisible();
  await expect(page.getByRole("button", { name: "Unban Pudge" })).toBeVisible();

  // A hero removed by hand stays out, even though the window still shows it.
  await mine.getByRole("button", { name: "Remove Warlock" }).click();
  await page.waitForTimeout(2_500);
  await expect(mine.getByText("Warlock")).toHaveCount(0);

  // The frame it read can be saved, for reporting a missed pick.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save frame" }).click();
  expect((await download).suggestedFilename()).toMatch(/^watch-dota-.+\.png$/);

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Watch Dota" })).toBeVisible();
});

test("Watch Dota reads the enemy's last pick at strategy time, and the Game Story follows", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(60_000);
  await fakeDotaWindow(page, "draft-strategy-ten-picked.png");
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch Dota" }).click();
  // Signed out there is no Steam name, but Dota's glow under your own name still shows your side.
  await expect(page.getByText("Found you on Radiant")).toBeVisible({ timeout: 45_000 });
  const enemy = page.getByRole("region", { name: "Enemy" });
  // Lich is their last pick: Ranked All Pick shows it only once strategy time starts.
  for (const name of ["Lion", "Death Prophet", "Bloodseeker", "Tiny", "Lich"])
    await expect(enemy.getByText(name)).toBeVisible({ timeout: 45_000 });

  // Our first slot is the player's own persona art, which is typed in; the Story waits for all ten.
  const plan = page.getByRole("region", { name: "Game Story" });
  await expect(plan).toHaveCount(0);
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("snap");
  await ally.press("Enter");
  await expect(plan.getByRole("heading", { name: "The Team" })).toBeVisible();
});

test("Watch Dota finds your side from your Steam name, and a side set by hand wins", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(60_000);
  const email = `watch-side-${Date.now()}@example.com`;
  await newPlayer(page, email, "Watcher");
  await linkSteam(email, "ct'x");
  // The strategy time frame with the name "ct'x" (and the glow under it) moved to Dire's third slot.
  await fakeDotaWindow(page, "draft-strategy-dire.png");
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch Dota" }).click();
  await expect(page.getByText("Found ct'x on Dire")).toBeVisible({ timeout: 45_000 });
  const side = page.getByRole("group", { name: "My Side" });
  await expect(side.getByRole("button", { name: "Dire", exact: true })).toHaveAttribute("aria-pressed", "true");
  const mine = page.getByRole("region", { name: "My team" });
  for (const name of ["Lion", "Death Prophet", "Bloodseeker", "Tiny", "Lich"]) await expect(mine.getByText(name)).toBeVisible({ timeout: 15_000 });

  // The player knows better: a side chosen by hand stays, though the window still shows Dire.
  await side.getByRole("button", { name: "Radiant", exact: true }).click();
  await page.waitForTimeout(2_000);
  await expect(side.getByRole("button", { name: "Radiant", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Found ct'x on Dire")).toHaveCount(0);
});

test("Watch Dota asks whether a hero it put in My team is your pick", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(60_000);
  await fakeDotaWindow(page);
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch Dota" }).click();
  // This frame has the names blanked out, so the side is chosen by hand.
  await page.getByRole("group", { name: "My Side" }).getByRole("button", { name: "Radiant", exact: true }).click();
  // The newest hero read into My team comes first.
  const ask = page.getByRole("group", { name: "Did you pick Omniknight?" });
  await expect(ask).toBeVisible({ timeout: 45_000 });
  await ask.getByRole("button", { name: "Not Me" }).click();
  const next = page.getByRole("group", { name: /^Did you pick / });
  await expect(next).toBeVisible();
  const heroName = (await next.locator("#did-you-pick").innerText()).replace(/^Did you pick (.+)\?$/, "$1");
  await next.getByRole("button", { name: "Yes, My Pick" }).click();
  await expect(page.getByText(`You're on ${heroName}. Good luck!`)).toBeVisible();
  await expect(page.getByRole("group", { name: /^Did you pick / })).toHaveCount(0);
});

test("Watch Dota learns a hero's look when you add it by hand, and reads it by itself next time", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(90_000);
  // Our first slot shows Invoker's persona art, which no store portrait matches.
  await fakeDotaWindow(page, "draft-strategy-ten-picked.png");
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch Dota" }).click();
  const mine = page.getByRole("region", { name: "My team" });
  await expect(mine.getByText("Omniknight")).toBeVisible({ timeout: 45_000 });
  await expect(mine.getByText("Invoker")).toHaveCount(0);
  // The glow under our first slot marks it as the player's, so nobody is asked about their teammates' heroes.
  await expect(page.getByRole("group", { name: /^Did you pick / })).toHaveCount(0);

  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("invoker");
  await ally.press("Enter");
  await expect(page.getByText("Learned how Invoker looks on your screen")).toBeVisible({ timeout: 10_000 });

  // Next game: the draft starts empty and Watch Dota reads Invoker on its own.
  await mine.getByRole("button", { name: "Remove Invoker" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Watch Dota" }).click();
  await expect(mine.getByText("Invoker")).toBeVisible({ timeout: 45_000 });
  // He is in the player's own slot, so he is their hero and their picks stop.
  await expect(page.getByText("You're on Invoker. Good luck!")).toBeVisible();
});
