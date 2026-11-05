import { expect } from "@playwright/test";
import { expectAccessible, savedSuggestions, seedFriend, seedStack, signUp, test, uniqueEmail } from "./helpers";

test("a Team mixes Stack mates and friends, and friends who don't share are planned as any hero", async ({ page }) => {
  const email = uniqueEmail("mixed");
  await signUp(page, email, "Mirana");
  await seedStack(email, "Night Owls", [
    { name: "Tusk", position: 3 },
    { name: "Lina", position: 2 },
  ]);
  await seedFriend(email, "Bristle", { position: 4 });
  await seedFriend(email, "Shy", { position: 5, shares: false });
  await seedFriend(email, "Stranger", { status: "pending" });

  await page.goto("/draft");
  const planFor = page.getByRole("region", { name: "Plan For" });
  await planFor.getByRole("button", { name: "Team", exact: true }).click();
  await planFor.getByLabel("Fill From Stack").selectOption({ label: "Night Owls" });
  const seats = planFor.getByRole("list", { name: "Team Seats" });
  await expect(seats.getByRole("listitem").nth(2)).toContainText("Tusk");

  // Keyboard only: open the Pos 4 seat, find the friend, and add them.
  await page.locator('[data-seat-add="4"]:visible').focus();
  await page.keyboard.press("Enter");
  const search = planFor.getByRole("combobox", { name: "Find a Stack mate or friend for Pos 4" });
  await expect(search).toBeFocused();
  // Everyone once, and never someone who hasn't accepted the friend request.
  const options = planFor.getByRole("listbox").getByRole("option");
  await expect(options.filter({ hasText: "Stranger" })).toHaveCount(0);
  await expect(options.filter({ hasText: "Shy" })).toContainText("planned as any hero");
  await expectAccessible(page);
  await page.keyboard.type("bris");
  await page.keyboard.press("Enter");
  await expect(seats.getByRole("listitem").nth(3)).toContainText("Bristle");
  await expect(seats.getByRole("listitem").nth(3)).toContainText("Friend");
  await expect(planFor.getByRole("button", { name: "Remove Bristle from Pos 4" })).toBeFocused();

  // The friend who doesn't share takes Pos 5 and is planned as any hero.
  await page.locator('[data-seat-add="5"]:visible').click();
  await planFor.getByRole("listbox").getByRole("option", { name: /Shy/ }).click();
  await expect(seats.getByRole("listitem").nth(4)).toContainText("Any Hero");
  await expect(planFor).toContainText("5 of 5 seats filled");

  await page.getByRole("button", { name: "Per Player" }).click();
  await expect(page.getByRole("list", { name: "Suggested heroes for Bristle" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Suggested heroes for Shy" })).toBeVisible();
  await expectAccessible(page);

  // Planning for a Team saves nothing as party suggestions.
  expect(await savedSuggestions(email)).toEqual([]);

  // Phone width: the seats stack as rows and stay accessible.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(seats).toBeVisible();
  await expectAccessible(page);
});
