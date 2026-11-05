import { expect } from "@playwright/test";
import { expectAccessible, seedFeedback, seedHeroStats, signUp, test, uniqueEmail } from "./helpers";

test("the profile explains a Steam player's heroes and recent form", async ({ page }) => {
  const email = uniqueEmail("profile-heroes");
  await signUp(page, email, "Kez");
  await seedFeedback(email);
  await seedHeroStats(email);

  await page.goto("/profile");
  await expect(page.getByText("Won 1 of 2")).toBeVisible();
  const takeaways = page.getByRole("list", { name: "Takeaways" });
  await expect(takeaways).toContainText("Most Played");
  await expect(takeaways).toContainText("Best Hero");
  await expect(takeaways).toContainText("Costing You Games");
  await expect(page.getByRole("list", { name: "Heroes" }).getByRole("listitem")).toHaveCount(4);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Best Win Rate" }).click();
  await expect(page).toHaveURL(/sort=won/);
  await expect(page.getByRole("link", { name: "Best Win Rate" })).toHaveAttribute("aria-current", "page");

  // A shorter period is counted from the saved game list, and keeps the sort.
  await page.getByRole("navigation", { name: "Period" }).getByRole("link", { name: "Week" }).click();
  await expect(page).toHaveURL(/period=7&sort=won/);
  await expect(page.getByText("Your public games of the last 7 days on OpenDota. You won 75% of 4 games.")).toBeVisible();
  // Best Win Rate lists heroes with a week's minimum of 3 games: Pudge, not the one Storm Spirit game.
  await expect(page.getByRole("list", { name: "Heroes" }).getByRole("listitem")).toHaveCount(1);
  await page.getByRole("link", { name: "Most Played" }).click();
  await expect(page).toHaveURL(/period=7$/);
  await expect(page.getByRole("list", { name: "Heroes" }).getByRole("listitem")).toHaveCount(2);
  await expectAccessible(page);
});
