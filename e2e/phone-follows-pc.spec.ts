import { devices, expect, type Browser, type Page } from "@playwright/test";
import { SNAPSHOT_URL } from "../src/lib/engine/snapshot";
import { expectAccessible, heroData, newPlayer, signInAs, test, uniqueEmail } from "./helpers";

/** The same player on a phone: a touch screen with no mouse, signed in to the same account. */
async function openPhone(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const phone = await context.newPage();
  await phone.route(SNAPSHOT_URL, async (route) => route.fulfill({ json: await heroData() }));
  await signInAs(phone, email, "/draft");
  return phone;
}

test("a phone follows the draft entered on the PC, and the PC sees the phone's changes", async ({ page, browser }) => {
  test.skip(test.info().project.name !== "chromium", "Opens its own phone next to the desktop page");
  const email = uniqueEmail("follow");
  await newPlayer(page, email, "Follower");
  await page.goto("/draft");
  // The PC never shows the phone's card.
  await expect(page.getByLabel("My team pick, e.g. cm5")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fill Picks from Your PC" })).toHaveCount(0);

  const phone = await openPhone(browser, email);
  // An empty board on the phone says how to fill it from the PC.
  await expect(phone.getByRole("heading", { name: "Fill Picks from Your PC" })).toBeVisible();
  await expect(phone.getByText("Waiting for your PC")).toBeVisible();
  await expectAccessible(phone);

  // The PC enters the draft.
  await page.getByLabel("Bans, several at once: pa sf am").fill("am");
  await page.keyboard.press("Enter");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible();

  // Live updates are off in the test stack, so the phone loads the draft again, as it does when it comes back
  // into view.
  await expect(async () => {
    await phone.reload();
    await expect(phone.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible({ timeout: 2000 });
  }).toPass();
  await expect(phone.getByRole("button", { name: "Unban Anti-Mage" })).toBeVisible();
  await expect(phone.getByRole("heading", { name: "Fill Picks from Your PC" })).toHaveCount(0);
  // The PC filled the board, so the phone shows the picks before it. The PC keeps the board on top.
  const tops = async (on: Page) => ({
    picks: (await on.locator("#picks-title").boundingBox())!.y,
    board: (await on.getByRole("region", { name: "Picks and Bans" }).boundingBox())!.y,
  });
  const onPhone = await tops(phone);
  expect(onPhone.picks).toBeLessThan(onPhone.board);
  const onPc = await tops(page);
  expect(onPc.board).toBeLessThan(onPc.picks);

  // The phone takes the ban back; the PC sees it.
  await phone.getByRole("button", { name: "Unban Anti-Mage" }).click();
  await expect(phone.getByRole("button", { name: "Unban Anti-Mage" })).toHaveCount(0);
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole("button", { name: "Unban Anti-Mage" })).toHaveCount(0);
  }).toPass();

  // Undo on the PC takes back its own last entry, through the server.
  const enemy = page.getByLabel("Enemy pick, e.g. sf2");
  await enemy.fill("pudge");
  await enemy.press("Enter");
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Pudge")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Pudge")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible();
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Pudge")).toHaveCount(0);

  // A new draft on the PC empties the phone too.
  await page.getByRole("main").getByRole("button", { name: "New Draft" }).click();
  await expect(async () => {
    await phone.reload();
    await expect(phone.getByRole("heading", { name: "Fill Picks from Your PC" })).toBeVisible({ timeout: 2000 });
  }).toPass();
  await phone.context().close();
});
