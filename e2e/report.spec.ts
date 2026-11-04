import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectAccessible, seedReport, seedReportFeedback, signUp, test, uniqueEmail } from "./helpers";

const facts = JSON.parse(readFileSync("test/fixtures/report-facts-v1.json", "utf8")) as object;

test("a player reads the report of a game they played", async ({ page }) => {
  const email = uniqueEmail("report");
  await signUp(page, email, "Kez");
  const draftId = await seedReport(email, { status: "ready", facts });

  await page.goto(`/reports/${draftId}`);
  await expect(page.getByRole("heading", { name: "Game report" })).toBeVisible();
  await expect(page.getByText("Won in 34:26, 57 to 32 in kills.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Your team" }).getByText("You", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lanes at 10 minutes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Your records" })).toHaveText(
    /No suggestions saved for the pick: 1 game, too few for a win rate\./,
  );
  await expectAccessible(page);
});

test("a report links to the player's own feedback on the game", async ({ page }) => {
  const email = uniqueEmail("report-feedback");
  await signUp(page, email, "Kez");
  const draftId = await seedReport(email, { status: "ready", facts });

  await page.goto(`/reports/${draftId}`);
  await expect(page.getByText("Won in 34:26, 57 to 32 in kills.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Your Feedback" })).toHaveCount(0);

  await seedReportFeedback(email, draftId);
  await page.reload();
  await page.getByRole("link", { name: "Your Feedback" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/my-heroes/games/9072422905");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("a report still being built says so", async ({ page }) => {
  const email = uniqueEmail("report-wait");
  await signUp(page, email, "Lina");
  const draftId = await seedReport(email, { status: "waiting_parse", facts: null });

  await page.goto(`/reports/${draftId}`);
  await expect(page.getByRole("status")).toHaveText(/The report is on its way/);
  await expectAccessible(page);
});

test("another player's report is not found", async ({ page, browser }) => {
  const owner = uniqueEmail("report-owner");
  const ownerPage = await browser.newPage();
  await signUp(ownerPage, owner, "Ursa");
  const draftId = await seedReport(owner, { status: "ready", facts });
  await ownerPage.close();

  await signUp(page, uniqueEmail("report-other"), "Lion");
  const res = await page.goto(`/reports/${draftId}`);
  expect(res?.status()).toBe(404);
});

test("the Party page shows records once a game is reported", async ({ page }) => {
  const email = uniqueEmail("records");
  await signUp(page, email, "Mars");
  await page.goto("/party");
  const records = page.getByRole("region", { name: "Your records" });
  await expect(records).toContainText("Records start after your first reported party game");

  await seedReport(email, { status: "ready", facts });
  await page.reload();
  await expect(records).toContainText("No suggestions saved for the pick: 1 game, too few for a win rate.");
  await expectAccessible(page);
});
