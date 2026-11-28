import { expect } from "@playwright/test";
import { expectAccessible, newPlayer, test, uniqueEmail } from "./helpers";

test("the four sections and the Section Row lead to every page and say where you are", async ({ page }) => {
  await newPlayer(page, uniqueEmail("sections"), "Sections");

  // The row lists the pages of the open section and marks the one you are on.
  await page.goto("/my-heroes");
  const you = page.getByRole("navigation", { name: "You", exact: true });
  await expect(you.getByRole("link")).toHaveText(["Heroes", "Games", "Profile"]);
  await expect(you.getByRole("link", { name: "Heroes" })).toHaveAttribute("aria-current", "page");
  await you.getByRole("link", { name: "Games" }).click();
  await expect(page).toHaveURL(/\/my-heroes\/games$/);
  await expect(you.getByRole("link", { name: "Games" })).toHaveAttribute("aria-current", "page");
  await expectAccessible(page);

  // A section in the top bar (the bottom bar on a phone) opens on its first page.
  const main = page.getByRole("navigation", { name: "Main", exact: true });
  await main.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/\/friends$/);
  const team = page.getByRole("navigation", { name: "Team", exact: true });
  await expect(team.getByRole("link", { name: "Friends" })).toHaveAttribute("aria-current", "page");
  await team.getByRole("link", { name: "Stacks" }).click();
  await expect(page).toHaveURL(/\/stacks$/);
  await expect(main.getByRole("link", { name: "Team" })).toHaveAttribute("aria-current", "true");

  // Draft has one page, so it shows no row.
  await main.getByRole("link", { name: "Draft" }).click();
  await expect(page).toHaveURL(/\/draft$/);
  await expect(main.getByRole("link", { name: "Draft" })).toHaveAttribute("aria-current", "page");
  await expect(team).toHaveCount(0);
});
