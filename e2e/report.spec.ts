import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectAccessible, seedReport, signUp, test, uniqueEmail } from "./helpers";

const facts = JSON.parse(readFileSync("test/fixtures/report-facts-v1.json", "utf8")) as object;

test("a player reads the report of a game they played", async ({ page }) => {
  const email = uniqueEmail("report");
  await signUp(page, email, "Kez");
  const draftId = await seedReport(email, { status: "ready", facts });

  await page.goto(`/reports/${draftId}`);
  await expect(page.getByRole("heading", { name: "Game report" })).toBeVisible();
  await expect(page.getByText("Won in 34:26, 57 to 32 in kills.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Your team" }).getByText("YOU", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lanes at 10 minutes" })).toBeVisible();
  await expectAccessible(page);
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
