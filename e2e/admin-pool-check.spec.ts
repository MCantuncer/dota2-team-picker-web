import { expect } from "@playwright/test";
import { expectAccessible, linkSteam, makeAdmin, newPlayer, savedSuggestions, seedMidHeroes, startPartyOnDraft, test, uniqueEmail } from "./helpers";

test("Pool Check is hidden from players who are not admins", async ({ page }) => {
  await newPlayer(page, uniqueEmail("pool-check-player"), "Lina");
  const res = await page.goto("/admin/pool-check");
  expect(res?.status()).toBe(404);
  await page.goto("/profile");
  await page.getByRole("button", { name: /^Account menu/ }).click();
  await expect(page.getByRole("menuitem", { name: "Pool Check" })).toHaveCount(0);
});

test("a party list from the player's own heroes is saved as a pool list, and an admin opens Pool Check", async ({ page }) => {
  const email = uniqueEmail("pool-check-mid");
  await newPlayer(page, email, "Puck");
  await seedMidHeroes(email, [74, 76]);
  await startPartyOnDraft(page);
  await expect(page.getByRole("list", { name: "Suggested heroes" }).locator(":scope > li")).toHaveCount(2);
  // The server works out the outside heroes from My Heroes: none for a pool list.
  await expect.poll(async () => (await savedSuggestions(email)).map((r) => [r.list_rule, r.outside])).toEqual([["pool", []]]);

  const admin = uniqueEmail("pool-check-admin");
  await newPlayer(page, admin, "Can");
  await linkSteam(admin, "Can");
  await makeAdmin(admin);
  await page.goto("/profile");
  await page.getByRole("button", { name: /^Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Pool Check" }).click();
  await expect(page.getByRole("heading", { name: "Pool Check", level: 1 })).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "Pool Lists" })).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "Played Lists" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest Slips" })).toBeVisible();
  await expectAccessible(page);
});
