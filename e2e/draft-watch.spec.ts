import { expect } from "@playwright/test";
import { fakeDotaWindow, test } from "./helpers";

test("Watch Dota reads both teams and the bans off the shared window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(60_000);
  await fakeDotaWindow(page);
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch as Radiant" }).click();
  await expect(page.getByText("Watching Dota")).toBeVisible({ timeout: 45_000 });
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
  await expect(page.getByRole("button", { name: "Watch as Radiant" })).toBeVisible();
});

test("Watch Dota reads the enemy's last pick at strategy time, and the Game Story follows", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(60_000);
  await fakeDotaWindow(page, "draft-strategy-ten-picked.png");
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch as Radiant" }).click();
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
