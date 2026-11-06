import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

test("the landing page shows the pitch and a way to start", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in with steam/i }).first()).toBeVisible();
  await expectAccessible(page);
});

test("sign in is Steam only and accessible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign In", level: 1 })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Sign In with Steam" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await expect(page.getByLabel("Password")).toHaveCount(0);
  await expectAccessible(page);
});

test("the old sign up address opens sign in and keeps the next page", async ({ page }) => {
  await page.goto("/signup?next=/stacks");
  await expect(page).toHaveURL(/\/login\?next=%2Fstacks$/);
});

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
  const steam = page.getByRole("main").getByRole("link", { name: "Sign In with Steam" });
  await expect(steam).toHaveAttribute("href", /\/functions\/v1\/steam-login\?next=%2F$/);
});

test("a party invite link asks signed-out visitors to sign in with Steam, then come back", async ({ page }) => {
  await page.goto("/invite/0123456789abcdef");
  await expect(page.getByRole("heading", { name: "Join a party" })).toBeVisible();
  const steam = page.getByRole("main").getByRole("link", { name: "Sign In with Steam" });
  await expect(steam).toHaveAttribute("href", /\/functions\/v1\/steam-login\?next=%2Finvite%2F0123456789abcdef$/);
  await expectAccessible(page);
});

test("an old email invite link opens Stacks", async ({ page }) => {
  await page.goto("/join/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL((url) => url.pathname === "/stacks");
});
