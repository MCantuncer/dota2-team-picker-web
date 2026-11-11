import { expect } from "@playwright/test";
import { expectAccessible, newPlayer, seedStack, test, uniqueEmail } from "./helpers";

test("a Stack owner plans a draft for Stack mates who aren't online", async ({ page }) => {
  const email = uniqueEmail("plan-owner");
  await newPlayer(page, email, "Mirana");
  await seedStack(email, "Night Owls", [
    { name: "Tusk", position: 3 },
    { name: "Lina", position: 2 },
    { name: "Axe" },
    { name: "Lion" },
    { name: "Pudge" },
  ]);

  await page.goto("/draft");
  const planFor = page.getByRole("region", { name: "Plan For" });
  await page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Team", exact: true }).click();
  const seats = planFor.getByRole("list", { name: "Team Seats" });
  await expect(seats.getByRole("listitem").filter({ hasText: "You" })).toHaveCount(1);

  // Fill From Stack seats people at their favorite free positions, in the order they joined, and says who didn't fit.
  await planFor.getByLabel("Fill From Stack").selectOption({ label: "Night Owls" });
  await expect(seats.getByRole("listitem").nth(2)).toContainText("Tusk");
  await expect(seats.getByRole("listitem").nth(1)).toContainText("Lina");
  await expect(planFor.getByRole("status")).toHaveText("Pudge didn't fit: all seats are taken.");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Per Player" }).click();
  await expect(page.getByRole("list", { name: "Suggested heroes for Tusk" })).toBeVisible();
  await page.getByRole("button", { name: "Team Plan" }).click();
  await expect(page.getByRole("heading", { name: "Team Plan" })).toBeVisible();
  await expectAccessible(page);

  // Seats are kept on reload; Just Me brings back the plain solo screen, and Team brings the seats back.
  await page.reload();
  await expect(seats.getByRole("listitem").nth(2)).toContainText("Tusk");
  await page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Just Me" }).click();
  await expect(seats).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Per Player" })).toHaveCount(0);
  await page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Team", exact: true }).click();
  await expect(seats.getByRole("listitem").nth(2)).toContainText("Tusk");
});

test("a Stack page's Draft link starts a Team with that Stack", async ({ page }) => {
  const email = uniqueEmail("plan-link");
  await newPlayer(page, email, "Mirana");
  const stackId = await seedStack(email, "Night Owls", [{ name: "Tusk", position: 3 }]);
  await page.goto(`/draft?stack=${stackId}`);
  const seats = page.getByRole("list", { name: "Team Seats" });
  await expect(seats.getByRole("listitem").nth(2)).toContainText("Tusk");
  await expect(page).toHaveURL((url) => !url.searchParams.has("stack"));
});

test("a player who doesn't run a Stack gets no Fill From Stack", async ({ page }) => {
  await newPlayer(page, uniqueEmail("plan-solo"), "Rubick");
  await page.goto("/draft");
  const planFor = page.getByRole("region", { name: "Plan For" });
  await page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Team", exact: true }).click();
  await expect(planFor.getByRole("list", { name: "Team Seats" })).toBeVisible();
  await expect(planFor.getByLabel("Fill From Stack")).toHaveCount(0);
});
