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

test("the captain sees the game plan once all ten heroes are in", async ({ page }) => {
  const email = uniqueEmail("plan");
  await signUp(page, email, "Magnus");
  await setUserType(email, "captain");
  await page.context().clearCookies();
  await logIn(page, email, "/admin/captain");
  await page.getByRole("tab", { name: "Draft" }).click();

  for (const [i, hero] of ["jugg", "puck", "mars", "lion", "cm"].entries()) {
    await page.getByPlaceholder(`Pos ${i + 1} pick`).fill(hero);
    await page.getByPlaceholder(`Pos ${i + 1} pick`).press("Enter");
  }
  const enemy = page.getByPlaceholder("Enemy pick");
  for (const hero of ["pa", "sf", "axe", "wd", "lich"]) {
    await enemy.fill(hero);
    await enemy.press("Enter");
  }

  const plan = page.getByRole("region", { name: "Game plan" });
  await expect(plan).toBeVisible();
  await expect(plan.getByText("Roadmap to win")).toBeVisible();
  await expect(plan.getByRole("listitem", { name: /position/ })).toHaveCount(5);
  await expect(page.getByRole("region", { name: "Suggestions" })).toBeHidden();
  await expectAccessible(page);
});
