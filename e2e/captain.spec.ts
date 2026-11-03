import { expect } from "@playwright/test";
import { expectAccessible, fakeDotaWindow, logIn, setUserType, signUp, test, uniqueEmail } from "./helpers";

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

  const plan = page.getByRole("region", { name: "Game Story" });
  await expect(plan).toBeVisible();
  await expect(plan.getByRole("heading", { name: "The Team" })).toBeVisible();
  await expect(plan.getByRole("tab", { name: /Pos [1-5]/ })).toHaveCount(5);
  await expect(page.getByRole("region", { name: "Suggestions" })).toBeHidden();
  await expectAccessible(page);

  // Sent to the team, the plan shows on the Party page of everyone in it, the captain included.
  await plan.getByRole("button", { name: "Send to team" }).click();
  await expect(plan.getByRole("button", { name: "Sent to team" })).toBeDisabled();
  await page.goto("/party");
  const sent = page.getByRole("region", { name: "Game Story" });
  await expect(sent.getByText("From My team at")).toBeVisible();
  await expect(sent.getByRole("tab", { name: /Pos [1-5]/ })).toHaveCount(5);
  await expectAccessible(page);
});

test("Watch Dota fills the captain's draft, our heroes in their usual positions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Phones can't share a window");
  test.setTimeout(90_000);
  const email = uniqueEmail("watch");
  await signUp(page, email, "Rubick");
  await setUserType(email, "captain");
  await page.context().clearCookies();
  await fakeDotaWindow(page);
  await logIn(page, email, "/admin/captain");
  await page.getByRole("tab", { name: "Draft" }).click();

  await page.getByRole("button", { name: "Watch as Radiant" }).click();
  const ours = page.getByRole("region", { name: "Our team" });
  const enemy = page.getByRole("region", { name: "Enemy team" });
  for (const name of ["Crystal Maiden", "Warlock", "Juggernaut", "Omniknight"])
    await expect(ours.getByText(name)).toBeVisible({ timeout: 45_000 });
  // Juggernaut is a carry, so pos 1 is filled; one position stays open for the last pick.
  await expect(ours.getByPlaceholder("Pos 1 pick")).toHaveCount(0);
  await expect(ours.getByRole("textbox")).toHaveCount(1);
  for (const name of ["Lion", "Death Prophet", "Bloodseeker", "Tiny"]) await expect(enemy.getByText(name)).toBeVisible();
  await expect(enemy.getByRole("button", { name: "Remove Pudge" })).toBeVisible();

  await page.getByRole("button", { name: "Stop" }).click();
  await expectAccessible(page);
});
