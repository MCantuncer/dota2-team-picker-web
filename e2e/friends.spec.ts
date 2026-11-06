import { expect } from "@playwright/test";
import { expectAccessible, newPlayer, seedFriend, seedGameTogether, test, uniqueEmail } from "./helpers";

test("friends show as a list with the one you played with last opened beside it", async ({ page }) => {
  const email = uniqueEmail("friends");
  await newPlayer(page, email, "Mirana");
  const deniz = await seedFriend(email, "Deniz", { position: 1 });
  await seedFriend(email, "Selin", { shares: false });
  await seedFriend(email, "Arda", { status: "pending" });
  await seedGameTogether(email, deniz, { won: true, myHero: 74, friendHero: 8 });
  await seedGameTogether(email, deniz, { won: false, myHero: 13, friendHero: 8 });

  await page.goto("/friends");
  const list = page.getByRole("complementary", { name: "Your friends" });
  await expect(list.getByRole("region", { name: "Requests" })).toContainText("Arda");
  await expect(list.getByRole("link", { name: /Deniz/ })).toHaveAttribute("aria-current", "page");
  await expect(list.getByRole("link", { name: /Selin/ })).toContainText("Rank hidden");

  const detail = page.getByRole("region", { name: "Deniz" });
  await expect(detail).toContainText("Games Together");
  await expect(detail).toContainText("50%");
  await expect(detail.getByRole("listitem")).toHaveCount(2);
  await expect(detail.getByRole("button", { name: "Invite to Party" })).toBeVisible();
  await expectAccessible(page);

  // Opening another friend keeps the list and updates the address.
  await list.getByRole("link", { name: /Selin/ }).click();
  await expect(page).toHaveURL(/friend=/);
  await expect(page.getByRole("region", { name: "Selin" })).toContainText("No games together");

  // Accepting a request moves them into your friends.
  await list.getByRole("button", { name: "Accept" }).click();
  await expect(list.getByRole("region", { name: "Friends" })).toContainText("Arda");

  // Phone width: the opened friend is its own screen with a way back.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(list).toBeHidden();
  await page.getByRole("link", { name: "All Friends" }).click();
  await expect(list).toBeVisible();
  await expectAccessible(page);
});
