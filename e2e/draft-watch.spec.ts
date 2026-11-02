import { expect } from "@playwright/test";
import { fakeDotaWindow, test } from "./helpers";

test("Watch Dota reads both teams and the bans off the shared window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(60_000);
  await fakeDotaWindow(page);
  await page.goto("/draft");
  await page.getByRole("button", { name: "Watch Dota" }).click();
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

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Watch Dota" })).toBeVisible();
});
