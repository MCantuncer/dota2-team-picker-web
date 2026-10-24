import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

test("the landing page shows the pitch and a way to start", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in with steam/i }).first()).toBeVisible();
  await expectAccessible(page);
});

for (const path of ["/login", "/signup"]) {
  test(`${path} is accessible`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expectAccessible(page);
  });
}

test("private pages send signed-out visitors to log in and back", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
});

test("captain mode is hidden from signed-out visitors", async ({ page }) => {
  const res = await page.goto("/admin/captain");
  expect(res?.status()).toBe(404);
});

test("login refuses other sites as the next page", async ({ page }) => {
  await page.goto("/login?next=//evil.example");
  await expect(page.locator('input[name="next"]')).toHaveValue("/");
});
