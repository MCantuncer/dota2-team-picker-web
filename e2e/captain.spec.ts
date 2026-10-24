import { expect, test } from "@playwright/test";
import { expectAccessible, logIn, setUserType, signUp, uniqueEmail } from "./helpers";

test("plain users can't open captain mode", async ({ page }) => {
  await signUp(page, uniqueEmail("plain"), "Axe");
  const res = await page.goto("/admin/captain");
  expect(res?.status()).toBe(404);
});

test("a captain gets a first team on their first visit", async ({ page }) => {
  const email = uniqueEmail("captain");
  await signUp(page, email, "Kunkka");
  await setUserType(email, "captain");
  await page.context().clearCookies();
  await logIn(page, email, "/admin/captain");

  await expect(page.getByRole("heading", { name: /captain mode/i })).toBeVisible();
  await expect(page.getByLabel("Team name")).toHaveValue("My team");
  await expectAccessible(page);
});
