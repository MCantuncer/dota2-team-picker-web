import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { newPlayer, startPartyOnDraft, test, uniqueEmail } from "./helpers";

/** Enters a ban, an ally and an enemy, and picks Dire. */
async function fillSome(page: Page) {
  await page.getByLabel("Bans, several at once: pa sf am").fill("am");
  await page.keyboard.press("Enter");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  await page.getByLabel("Enemy pick").fill("pudge");
  await page.keyboard.press("Enter");
  await page.getByRole("group", { name: "My Side" }).getByRole("button", { name: "Dire", exact: true }).click();
  await expectFilled(page);
}

async function expectFilled(page: Page) {
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible();
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Pudge")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unban Anti-Mage" })).toBeVisible();
}

async function expectClean(page: Page) {
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Pudge")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Unban Anti-Mage" })).toHaveCount(0);
}

const header = (page: Page) => page.getByRole("banner");

test("Draft in the header keeps the board, New Draft in the header clears it", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "The header's New Draft shows on wide screens");
  await newPlayer(page, uniqueEmail("newdraft"), "Fresh");
  await page.goto("/draft");
  await fillSome(page);

  // Away and back through Draft: the board is as it was.
  await page.goto("/my-heroes");
  await header(page).getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Draft" }).click();
  await expect(page).toHaveURL(/\/draft$/);
  await expectFilled(page);

  // New Draft: an empty board, no side, and the address back to /draft so a reload keeps it empty.
  await header(page).getByRole("link", { name: "New Draft" }).click();
  await expectClean(page);
  await expect(page).toHaveURL(/\/draft$/);
  await expect(page.getByRole("heading", { name: /^My Team .*Dire$/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("My team pick, e.g. cm5")).toBeVisible();
  await expectClean(page);

  // From another page too.
  await fillSome(page);
  await page.goto("/meta");
  await header(page).getByRole("link", { name: "New Draft" }).click();
  await expect(page.getByLabel("My team pick, e.g. cm5")).toBeVisible();
  await expectClean(page);
});

test("in a party, New Draft in the header starts the party's next draft", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "The header's New Draft shows on wide screens");
  await newPlayer(page, uniqueEmail("newparty"), "Leader");
  await startPartyOnDraft(page);
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible();

  await header(page).getByRole("link", { name: "New Draft" }).click();
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toHaveCount(0);
  await expect(page).toHaveURL(/\/draft$/);
  // Still in the party.
  await expect(page.getByRole("list", { name: "Seats", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("My team pick, e.g. cm5")).toBeVisible();
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toHaveCount(0);
});
