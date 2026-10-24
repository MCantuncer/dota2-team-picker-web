import { expect, test } from "@playwright/test";
import { expectAccessible, logIn, PASSWORD, signUp, uniqueEmail } from "./helpers";

test("sign up, rename, sign out and log back in", async ({ page }) => {
  const email = uniqueEmail("account");
  await signUp(page, email, "Invoker");
  await expect(page.getByLabel("Display name")).toHaveValue("Invoker");
  await expectAccessible(page);

  await page.getByLabel("Display name").fill("Carl");
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Carl");

  await page.context().clearCookies();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);

  await logIn(page, email);
  await expect(page.getByLabel("Display name")).toHaveValue("Carl");
});

test("a wrong password shows an error and stays on login", async ({ page }) => {
  const email = uniqueEmail("wrong");
  await signUp(page, email, "Pudge");
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(`${PASSWORD}-nope`);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("my heroes opens for a signed-in user", async ({ page }) => {
  await signUp(page, uniqueEmail("heroes"), "Lina");
  await page.goto("/my-heroes");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page);
});
