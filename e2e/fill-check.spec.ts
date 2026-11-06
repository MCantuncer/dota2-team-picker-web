import { expect } from "@playwright/test";
import { sampleReport } from "../src/lib/fill-check.sample";
import { expectAccessible, makeAdmin, newPlayer, test, uniqueEmail } from "./helpers";

test("Fill Check is hidden from players who are not admins", async ({ page }) => {
  await newPlayer(page, uniqueEmail("fill-check-player"), "Lina");
  const res = await page.goto("/admin/fill-check");
  expect(res?.status()).toBe(404);
});

test("an admin runs the fill dry run and reads the result", async ({ page }) => {
  const email = uniqueEmail("fill-check-admin");
  await newPlayer(page, email, "Can");
  await makeAdmin(email);
  // The local stack runs without edge functions, so the dry run's answer comes from the sample.
  await page.route("**/functions/v1/fill-heroes", (route) => route.fulfill({ json: sampleReport() }));

  await page.goto("/admin/fill-check");
  await expect(page.getByRole("heading", { name: "Fill Check" })).toBeVisible();
  await page.getByRole("button", { name: "Run Dry Run" }).click();
  await expect(page.getByText(/^Go: 92% of games have a position/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Would Add" })).toContainText("Medusa");
  await expect(page.getByRole("region", { name: "Near Misses" })).toContainText("Anti-Mage");
  await expectAccessible(page);
});
