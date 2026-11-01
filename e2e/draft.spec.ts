import { expect, test } from "@playwright/test";
import { SNAPSHOT_URL } from "../src/lib/engine/snapshot";
import { expectAccessible, signUp, uniqueEmail } from "./helpers";

test("the draft screen suggests heroes as both teams fill in", async ({ page }) => {
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await expect(ally).toBeVisible();

  await page.getByLabel("Bans, several at once: pa sf am").fill("pa sf am");
  await page.keyboard.press("Enter");
  await ally.fill("cm5");
  await ally.press("Enter");
  await page.getByLabel("Enemy pick").fill("pudge");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible();
  await expect(page.getByRole("button", { name: /Crystal Maiden position: 5/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Pudge")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unban Anti-Mage" })).toBeVisible();

  const picks = page.getByRole("list", { name: "Suggested heroes" }).locator(":scope > li");
  await expect(picks).toHaveCount(8);
  await expectAccessible(page);

  // Taking a suggestion puts it on your team and ends the list.
  await page.getByRole("button", { name: "Picked" }).first().click();
  await expect(page.getByText(/Good luck!/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(picks).toHaveCount(8);
});

test("the draft screen shows the win chance once a checked model exists", async ({ page }) => {
  // The live data has no checked model yet, so add one that favours neither side.
  await page.route(SNAPSHOT_URL, async (route) => {
    const res = await route.fetch();
    const byKnown = Object.fromEntries([2, 4, 6, 8, 10].map((k) => [k, { a: 0, b: 0.05 }]));
    await route.fulfill({ response: res, json: { ...(await res.json()), winModel: { fittedAt: "2026-10-26T00:00:00Z", games: 5000, byKnown } } });
  });
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  await expect(page.getByRole("region", { name: "Win chance" })).toHaveCount(0);

  await page.getByLabel("Enemy pick").fill("pudge");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Win chance" })).toContainText(/\d+\.\d%/);
  await expect(page.getByTitle("Change in your team's win chance")).toHaveCount(8);
  await expectAccessible(page);
});

test("in a party the draft is kept for the whole party", async ({ page }) => {
  await signUp(page, uniqueEmail("party-draft"), "Earthshaker");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await expect(page.getByRole("button", { name: "Leave party" })).toBeVisible();

  await page.goto("/draft");
  await expect(page.getByRole("main").getByText("Party", { exact: true })).toBeVisible();
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  const team = page.getByRole("region", { name: "My team" });
  await expect(team.getByText("Entered by You")).toBeVisible();

  // The draft lives in the database, so a reload (or a teammate's screen) shows it too.
  await page.reload();
  await expect(team.getByText("Crystal Maiden")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(team.getByText("Crystal Maiden")).toHaveCount(0);
  await ally.fill("pudge");
  await ally.press("Enter");
  await expect(team.getByText("Pudge")).toBeVisible();
  await page.getByRole("button", { name: "New draft" }).click();
  await expect(team.getByText("Pudge")).toHaveCount(0);
});
