import { expect } from "@playwright/test";
import { expectAccessible, linkSteam, makeAdmin, newPlayer, test, uniqueEmail } from "./helpers";

test("Players is hidden from players who are not admins", async ({ page }) => {
  await newPlayer(page, uniqueEmail("players-player"), "Lina");
  const res = await page.goto("/admin/players");
  expect(res?.status()).toBe(404);
  await page.goto("/profile");
  await page.getByRole("button", { name: /^Account menu/ }).click();
  await expect(page.getByRole("menuitem", { name: "Players" })).toHaveCount(0);
});

test("an admin opens Players from the account menu and sees the newest player", async ({ page }) => {
  // Other tests add Steam players at the same time, so this one gets a name only it uses.
  const name = `Newcomer ${Math.random().toString(36).slice(2, 8)}`;
  const newcomer = uniqueEmail("players-newcomer");
  await newPlayer(page, newcomer, name);
  await linkSteam(newcomer, name);
  const email = uniqueEmail("players-admin");
  await newPlayer(page, email, "Can");
  await linkSteam(email, "Can");
  await makeAdmin(email);

  await page.goto("/profile");
  await page.getByRole("button", { name: /^Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Players" }).click();
  await expect(page.getByRole("heading", { name: "Players", level: 1 })).toBeVisible();
  await expect(page.getByText("Total Players")).toBeVisible();
  const newest = page.getByRole("list", { name: "Newest players" });
  const row = newest.getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText(/(Today|Yesterday), \d\d:\d\d/);
  await expect(row).toContainText("No heroes");
  await expectAccessible(page);
});
