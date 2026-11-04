import { expect } from "@playwright/test";
import { expectAccessible, seedStack, signUp, test, uniqueEmail } from "./helpers";

test("a Stack owner plans a draft for Stack mates who aren't online", async ({ page }) => {
  const email = uniqueEmail("plan-owner");
  await signUp(page, email, "Mirana");
  await seedStack(email, "Night Owls", [
    { name: "Tusk", position: 3 },
    { name: "Lina", position: 2 },
    { name: "Axe" },
    { name: "Lion" },
    { name: "Pudge" },
  ]);

  await page.goto("/draft");
  const planFor = page.getByRole("region", { name: "Plan For" });
  await planFor.getByLabel("Plan For").selectOption({ label: "Night Owls" });
  const lineup = planFor.getByRole("list", { name: "Playing This Game" });
  await expect(lineup.getByRole("checkbox", { name: "You" })).toBeChecked();

  // Tusk is ticked at their favorite position; a sixth player can't be ticked.
  await lineup.getByRole("checkbox", { name: "Tusk" }).check();
  await expect(lineup.getByRole("radio", { name: "Pos 3, Offlane, chosen" })).toBeVisible();
  for (const name of ["Lina", "Axe", "Lion"]) await lineup.getByRole("checkbox", { name }).check();
  await expect(lineup.getByRole("checkbox", { name: "Pudge" })).toBeDisabled();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Per Player" }).click();
  await expect(page.getByRole("list", { name: "Suggested heroes for Tusk" })).toBeVisible();
  await page.getByRole("button", { name: "Team Plan" }).click();
  await expect(page.getByRole("heading", { name: "Team Plan" })).toBeVisible();
  await expectAccessible(page);

  // The lineup is kept on reload; Just Me brings back the plain solo screen.
  await page.reload();
  await expect(lineup.getByRole("checkbox", { name: "Tusk" })).toBeChecked();
  await planFor.getByLabel("Plan For").selectOption({ label: "Just Me" });
  await expect(page.getByRole("button", { name: "Per Player" })).toHaveCount(0);

  // Solo Queue and a Stack replace each other, and the last one chosen comes back on reload.
  await planFor.getByLabel("Plan For").selectOption({ label: "Solo Queue" });
  await expect(lineup).toHaveCount(0);
  await planFor.getByLabel("Plan For").selectOption({ label: "Night Owls" });
  await expect(lineup.getByRole("checkbox", { name: "You" })).toBeChecked();
  await page.reload();
  await expect(planFor.getByLabel("Plan For")).toHaveValue(/^(?!solo-queue$)/);
  await expect(lineup.getByRole("checkbox", { name: "You" })).toBeChecked();
});

test("a player who doesn't run a Stack gets only Just Me and Solo Queue in Plan For", async ({ page }) => {
  await signUp(page, uniqueEmail("plan-solo"), "Rubick");
  await page.goto("/draft");
  await expect(page.getByRole("heading", { name: "Draft", level: 1 })).toBeVisible();
  const options = page.getByRole("region", { name: "Plan For" }).getByLabel("Plan For").locator("option");
  await expect(options).toHaveText(["Just Me", "Solo Queue"]);
});
