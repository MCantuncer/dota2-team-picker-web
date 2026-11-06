import { expect } from "@playwright/test";
import { expectAccessible, seedFeedback, signUp, test, uniqueEmail } from "./helpers";

test("Your Games shows strengths and problems with what to change", async ({ page }) => {
  const email = uniqueEmail("your-games");
  await signUp(page, email, "Your Games");

  // Without Steam there is nothing to read yet.
  await page.goto("/my-heroes/games");
  await expect(page.getByRole("status")).toContainText("it needs your Steam account");

  await seedFeedback(email);
  await page.goto("/my-heroes");
  await page.getByRole("link", { name: /Your Games/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your Games" })).toBeVisible();
  // The intro names the games the feedback comes from, and the squares show each result.
  await expect(page.getByText(/worked out from your 2 ranked and normal games (on|between) /)).toBeVisible();
  await expect(page.getByText("Last 2 results: won 1")).toBeVisible();

  const problems = page.getByRole("region", { name: "Problems" });
  await expect(problems.getByRole("heading", { name: "Early deaths are costing your lanes" })).toBeVisible();
  await problems.getByText("Show Details").click();
  await expect(problems.getByText(/Most early deaths came from Ember Spirit/)).toBeVisible();
  // Once open, the toggle offers to close the details again.
  await expect(problems.getByText("Show Details")).toBeHidden();
  await problems.getByText("Hide Details").click();
  await expect(problems.getByText(/Most early deaths came from Ember Spirit/)).toBeHidden();
  await expect(problems.getByText("Show Details")).toBeVisible();
  await problems.getByText("Show Details").click();
  await expect(page.getByRole("region", { name: "Strengths" })).toContainText("Strong farm");
  await expect(page.getByRole("region", { name: "Better Than Last Week" })).toContainText("You fall behind in lane");

  const games = page.getByRole("region", { name: /Previous Games/ });
  await expect(games.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("combobox", { name: "Result" }).selectOption("lost");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page).toHaveURL(/result=lost/);
  await expect(games.getByRole("listitem")).toHaveCount(1);
  await expect(games).toContainText("2 deaths before 10 minutes");
  await expectAccessible(page);

  // Each game opens its own feedback.
  await games.getByRole("link", { name: /Monkey King lost/ }).click();
  await expect(page).toHaveURL(/\/my-heroes\/games\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Monkey King");
  await expect(page.getByRole("region", { name: "To Fix" })).toContainText("Keep a Town Portal Scroll");
  await expect(page.getByRole("region", { name: "Lane at 10 Minutes" })).toContainText("640 net worth behind");
  await expect(page.getByRole("region", { name: /Deaths/ })).toContainText("Rotation from Mid");
  await expectAccessible(page);

  // Someone else's game, or one that isn't there, is a 404.
  const missing = await page.goto("/my-heroes/games/1");
  expect(missing?.status()).toBe(404);
});
