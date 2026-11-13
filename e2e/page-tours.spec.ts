import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { newPlayer, seedFriend, seedReport, test, uniqueEmail } from "./helpers";

const facts = JSON.parse(readFileSync("test/fixtures/report-facts-v1.json", "utf8")) as object;

/** Opens the page's ? tour and checks the first step's title. */
async function openTour(page: Page, first: string) {
  await page.getByRole("button", { name: "Page Tour" }).click();
  const tip = page.getByRole("dialog");
  await expect(tip).toContainText(/^1 of \d+/);
  await expect(tip).toHaveAccessibleName(first);
  return tip;
}

/** Walks to the last step with Next, checks its title, and ends the tour with Done. */
async function finishTour(page: Page, last: string) {
  const tip = page.getByRole("dialog");
  while ((await tip.getByRole("button", { name: "Done" }).count()) === 0) await tip.getByRole("button", { name: "Next" }).click();
  await expect(tip).toHaveAccessibleName(last);
  await tip.getByRole("button", { name: "Done" }).click();
  await expect(tip).toBeHidden();
}

test("Stacks, Friends, Profile and a Game Report each have a ? tour of their own", async ({ page }) => {
  const email = uniqueEmail("team-tours");
  await newPlayer(page, email, "Tours");
  await seedFriend(email, "Deniz", { position: 1 });

  // Stacks: the ? shows once there is a Stack, and the Stack page has its own.
  await page.goto("/stacks");
  await expect(page.getByRole("button", { name: "Page Tour" })).toHaveCount(0);
  const name = `Tour ${Date.now().toString(36)}`;
  await page.getByPlaceholder("Stack name, e.g. Friday Five").fill(name);
  await page.getByRole("button", { name: "Create Stack" }).click();
  await expect(page.getByRole("heading", { name, exact: true, level: 2 })).toBeVisible();
  await openTour(page, "Your Stacks");
  await finishTour(page, "Find a Stack");
  await page.getByRole("link", { name: "Stack Page" }).click();
  await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
  await openTour(page, "Draft for This Stack");
  await finishTour(page, "Players Who Want to Join");

  await page.goto("/friends");
  await openTour(page, "Your Friend Link");
  await page.keyboard.press("Escape");

  await page.goto("/profile");
  await page.getByRole("button", { name: "Page Tour" }).click();
  await expect(page.getByRole("dialog")).toContainText(/^1 of \d+/);
  await finishTour(page, "Edit My Heroes");

  const draftId = await seedReport(email, { status: "ready", facts });
  await page.goto(`/reports/${draftId}`);
  await openTour(page, "Your Team");
  await finishTour(page, "What Hurt You");
});
