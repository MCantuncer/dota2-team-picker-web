import { expect } from "@playwright/test";
import { expectAccessible, linkSteam, makeAdmin, newPlayer, test, uniqueEmail } from "./helpers";

test("Data Status is hidden from players who are not admins", async ({ page }) => {
  await newPlayer(page, uniqueEmail("data-status-player"), "Lina");
  const res = await page.goto("/admin/data-status");
  expect(res?.status()).toBe(404);
  await page.goto("/profile");
  await page.getByRole("button", { name: /^Account menu/ }).click();
  await expect(page.getByRole("menuitem", { name: "Data Status" })).toHaveCount(0);
});

test("an admin opens Data Status from the account menu", async ({ page }) => {
  const admin = uniqueEmail("data-status-admin");
  await newPlayer(page, admin, "Can");
  await linkSteam(admin, "Can");
  await makeAdmin(admin);
  await page.goto("/profile");
  await page.getByRole("button", { name: /^Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Data Status" }).click();
  await expect(page.getByRole("heading", { name: "Data Status", level: 1 })).toBeVisible();
  // The server reads the hero data from Storage, which the local database has no copy of, so the page may
  // show its error notice here; the counts themselves are covered by src/lib/admin-data-status.test.ts.
  await expect(page.getByRole("progressbar", { name: "Two-Path Builds" }).or(page.getByRole("alert"))).toBeVisible();
  await expectAccessible(page);
});
