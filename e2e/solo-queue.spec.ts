import { expect } from "@playwright/test";
import { expectAccessible, test } from "./helpers";

test("a Team with open seats suggests heroes for every teammate, as if they can play any hero", async ({ page }) => {
  await page.goto("/draft");
  const planFor = page.getByRole("region", { name: "Plan For" });
  await page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Team", exact: true }).click();
  // Signed out, only the player can take a seat.
  await expect(planFor).toContainText("Sign in to add Stack mates and friends.");

  // Per Player opens with the player's own column and one Teammate column per other position.
  await expect(page.getByRole("heading", { name: "Per Player" })).toBeVisible();
  await page.getByRole("button", { name: "Carry", exact: true }).click();
  await expect(page.getByRole("list", { name: "Suggested heroes for You" })).toBeVisible();
  const mates = page.getByRole("list", { name: "Suggested heroes for Teammate" });
  await expect(mates).toHaveCount(4);
  await expect(page.getByRole("heading", { name: /Teammate.*Carry/ })).toHaveCount(0);
  await expect(mates.first().locator(":scope > li")).toHaveCount(6);
  // Teammates have no hero pool, so nothing is marked Outside Pool.
  await expect(page.getByText("Outside Pool")).toHaveCount(0);
  await expectAccessible(page);

  // A teammate's column goes once a hero is picked for that position.
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  await expect(mates).toHaveCount(3);
  // An ally typed without a position takes its guessed one, never the player's own (Pos 1, the first open one).
  await ally.fill("sf");
  await ally.press("Enter");
  await expect(page.getByRole("list", { name: "Suggested heroes for You" })).toBeVisible();
  await expect(mates).toHaveCount(2);

  // My Picks is still the player's own list; the choice is kept on reload.
  await page.getByRole("button", { name: "My Picks" }).click();
  await expect(page.getByRole("list", { name: "Suggested heroes" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Team", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Just Me" }).click();
  await expect(page.getByRole("button", { name: "Per Player" })).toHaveCount(0);
});
