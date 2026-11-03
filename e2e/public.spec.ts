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

test("the old Captain mode address opens the draft", async ({ page }) => {
  await page.goto("/admin/captain");
  await expect(page).toHaveURL(/\/draft$/);
});

test("login refuses other sites as the next page", async ({ page }) => {
  await page.goto("/login?next=//evil.example");
  await expect(page.locator('input[name="next"]')).toHaveValue("/");
});

test("a party invite link asks signed-out visitors to sign up or log in, then come back", async ({ page }) => {
  await page.goto("/invite/0123456789abcdef");
  await expect(page.getByRole("heading", { name: "Join a party" })).toBeVisible();
  // The header has its own Sign up and Log in buttons; these are the ones in the page.
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup?next=%2Finvite%2F0123456789abcdef");
  await expect(main.getByRole("link", { name: "log in" })).toHaveAttribute("href", "/login?next=%2Finvite%2F0123456789abcdef");
  await expectAccessible(page);
});
