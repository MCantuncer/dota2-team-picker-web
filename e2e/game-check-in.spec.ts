import { expect } from "@playwright/test";
import { signUp, test, uniqueEmail } from "./helpers";

test("a full board offers Start Game, remembers the start and can take it back", async ({ page }) => {
  await signUp(page, uniqueEmail("start"), "Starter");
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  const enemy = page.getByLabel("Enemy pick");
  await expect(ally).toBeVisible();

  await ally.fill("cm5 lion 4 axe 3 sniper 1 lina 2");
  await ally.press("Enter");
  await enemy.fill("pudge sf pa medusa");
  await enemy.press("Enter");
  // Nine heroes: nothing to start yet.
  await expect(page.getByRole("button", { name: "Start Game" })).toHaveCount(0);

  await enemy.fill("tiny");
  await enemy.press("Enter");
  const start = page.getByRole("button", { name: "Start Game" });
  await expect(page.getByRole("heading", { name: "All 10 Heroes Are In" })).toBeVisible();
  // Enabled once the board is saved.
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByText("In Game")).toBeVisible();
  await expect(page.getByText("Started just now")).toBeVisible();

  // The start is saved with the board.
  await page.reload();
  await expect(page.getByText("In Game")).toBeVisible();

  await page.getByRole("button", { name: "Not Playing It" }).click();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
});

test("signed out, a full board shows no Start Game", async ({ page }) => {
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await expect(ally).toBeVisible();
  await ally.fill("cm5 lion 4 axe 3 sniper 1 lina 2");
  await ally.press("Enter");
  await page.getByLabel("Enemy pick").fill("pudge sf pa medusa tiny");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Enemy" }).getByText("Tiny")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Game" })).toHaveCount(0);
});
