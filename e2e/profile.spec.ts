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
});
