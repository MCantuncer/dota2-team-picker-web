import { expect, test } from "@playwright/test";
import { expectAccessible, newPlayer, PASSWORD, signInAs, uniqueEmail } from "./helpers";

test("sign in, rename, sign out and sign back in", async ({ page }) => {
  const email = uniqueEmail("account");
  await newPlayer(page, email, "Invoker");
  await expect(page.getByLabel("Display name")).toHaveValue("Invoker");
  await expectAccessible(page);

  await page.getByLabel("Display name").fill("Carl");
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Carl");

  await page.context().clearCookies();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);

  await signInAs(page, email);
  await expect(page.getByLabel("Display name")).toHaveValue("Carl");
});

test("a wrong password shows an error and stays on login", async ({ page }) => {
  const email = uniqueEmail("wrong");
  await page.goto("/signup?next=/profile");
  await page.getByLabel("Name").fill("Pudge");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up with email" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/profile");
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(`${PASSWORD}-nope`);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("my heroes opens for a signed-in user", async ({ page }) => {
  await newPlayer(page, uniqueEmail("heroes"), "Lina");
  await page.goto("/my-heroes");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page);
});

test("friends sharing is on by default and stays off once turned off", async ({ page }) => {
  await newPlayer(page, uniqueEmail("share"), "Rubick");
  const share = page.getByRole("checkbox", { name: "Share My Heroes With Friends" });
  await expect(share).toBeChecked();
  await expectAccessible(page);

  await share.click();
  await expect(share).not.toBeChecked();
  await expect(page.getByText(/planned as if you can play any hero/)).toBeVisible();
  await expect(share).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Share My Heroes With Friends" })).not.toBeChecked();
});
