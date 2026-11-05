import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { backdateGameStart, savedCheckIns, signUp, test, uniqueEmail } from "./helpers";

/** Fills a full board and presses Start Game. */
async function startAGame(page: Page) {
  await page.goto("/draft");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await expect(ally).toBeVisible();
  await ally.fill("cm5 lion 4 axe 3 sniper 1 lina 2");
  await ally.press("Enter");
  await page.getByLabel("Enemy pick").fill("pudge sf pa medusa tiny");
  await page.keyboard.press("Enter");
  const start = page.getByRole("button", { name: "Start Game" });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByText("In Game")).toBeVisible();
}

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

test("Game Over asks how it went, and the answers are saved", async ({ page }) => {
  const email = uniqueEmail("over");
  await signUp(page, email, "Ender");
  await startAGame(page);

  await page.getByRole("button", { name: "Game Over" }).click();
  const card = page.getByRole("region", { name: "Game Over" });
  await expect(card).toBeVisible();
  // No result on OpenDota yet: the player says who won first.
  await card.getByRole("button", { name: "Send" }).click();
  await expect(card.getByText("Tell us if you won or lost.")).toBeVisible();

  await card.getByRole("button", { name: "Victory" }).click();
  await card.getByRole("region", { name: "The Picks" }).getByRole("button", { name: "Good" }).click();
  const decided = card.getByRole("region", { name: "What Decided It" });
  for (const tag of ["Laning", "Late Game", "Items", "Teammates"]) await decided.getByRole("button", { name: tag }).click();
  // At most three.
  await expect(decided.getByRole("button", { name: "Teammates" })).toHaveAttribute("aria-pressed", "false");
  await card.getByLabel("Note").fill("  their Pudge roamed  ");
  await card.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Thanks. Your answers tune the picks and the Game Story.")).toBeVisible();
  await expect(card).toHaveCount(0);
  await expect(page.getByText("In Game")).toHaveCount(0);
  expect(await savedCheckIns(email)).toEqual([
    expect.objectContaining({
      played: true,
      player_won: true,
      picks_feel: "good",
      tags: ["items", "laning", "late_game"],
      note: "their Pudge roamed",
    }),
  ]);
});

test("a new board offers the last game's check-in, and Skip closes it", async ({ page }) => {
  const email = uniqueEmail("last");
  await signUp(page, email, "Later");
  await startAGame(page);
  await backdateGameStart(email, 30);

  // Back on the page after the game: the check-in shows on its own.
  await page.reload();
  await expect(page.getByRole("region", { name: "Game Over" })).toBeVisible();

  await page.getByRole("button", { name: "New Draft" }).click();
  const line = page.getByText("Last game with Sniper: how did it go?");
  await expect(line).toBeVisible();
  await page.getByRole("button", { name: "Answer Now" }).click();
  const card = page.getByRole("region", { name: "Game Over" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Skip" }).click();
  await expect(card).toHaveCount(0);
  await expect(line).toHaveCount(0);
  expect(await savedCheckIns(email)).toEqual([expect.objectContaining({ answered_at: null, skipped_at: expect.any(String) })]);
});

test("away from the Draft page, a player without Steam is asked an hour after the start", async ({ page }) => {
  const email = uniqueEmail("site");
  await signUp(page, email, "Elsewhere");
  await startAGame(page);
  await backdateGameStart(email, 70);

  await page.goto("/my-heroes");
  const card = page.getByRole("region", { name: "How Did It Go?" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Victory" }).click();
  await card.getByRole("button", { name: "Okay" }).click();
  await expect(card.getByText("Thanks. Your answer tunes the picks.")).toBeVisible();
  expect(await savedCheckIns(email)).toEqual([expect.objectContaining({ played: true, player_won: true, picks_feel: "okay" })]);

  // Answered: not asked again.
  await page.reload();
  await expect(page.getByRole("heading", { name: "My Heroes" })).toBeVisible();
  await expect(card).toHaveCount(0);
});
