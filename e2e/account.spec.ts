import { expect, test } from "@playwright/test";
import { expectAccessible, newPlayer, signInAs, uniqueEmail } from "./helpers";

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

test("a player deletes their account", async ({ page }) => {
  await newPlayer(page, uniqueEmail("delete"), "Techies");
  await page.getByRole("button", { name: "Delete Account" }).click();
  const confirm = page.getByRole("button", { name: "Delete My Account" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel(/to confirm/).fill("delete");
  await expectAccessible(page);
  await confirm.click();

  await expect(page).toHaveURL(/\/login\?deleted=1/);
  await expect(page.getByRole("status")).toHaveText(/Your account is deleted/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
