import { expect, test } from "@playwright/test";
import { expectAccessible, linkSteam, newPlayer, signInAs, uniqueEmail } from "./helpers";

test("the profile shows the linked Steam account, and signing out and back in keeps it", async ({ page }) => {
  const email = uniqueEmail("account");
  await newPlayer(page, email, "Invoker");
  const steamId = await linkSteam(email, "ct'x");
  await page.reload();

  const steamProfile = page.getByRole("link", { name: /ct'x/ });
  await expect(steamProfile).toHaveAttribute("href", `https://steamcommunity.com/profiles/${steamId}`);
  await expect(page.getByText("Steam Account Linked")).toBeVisible();
  await expect(page.getByLabel("Display name")).toHaveCount(0);
  await expectAccessible(page);

  await page.context().clearCookies();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);

  await signInAs(page, email);
  await expect(page.getByText("Steam Account Linked")).toBeVisible();
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
