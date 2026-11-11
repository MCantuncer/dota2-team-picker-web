import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { test } from "./helpers";

// A real hero select screenshot (21:9, scaled to half size; names and chat blanked out). Radiant has
// Crystal Maiden, Warlock, Juggernaut and Omniknight; Dire has Lion, Death Prophet, Bloodseeker and Tiny.
const SCREENSHOT = readFileSync(join(__dirname, "fixtures", "draft-nine-picked.png")).toString("base64");

test("pasting a Dota screenshot fills both teams and the bans", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/draft");
  await expect(page.getByLabel("My team pick, e.g. cm5")).toBeVisible();
  await page.getByRole("group", { name: "My Side" }).getByRole("button", { name: "Radiant", exact: true }).click();

  await page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const data = new DataTransfer();
    data.items.add(new File([blob], "draft.png", { type: "image/png" }));
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, SCREENSHOT);

  await expect(page.getByText("Read 8 picks and 16 bans.")).toBeVisible({
    timeout: 45_000,
  });
  const mine = page.getByRole("region", { name: "My team" });
  const enemy = page.getByRole("region", { name: "Enemy" });
  for (const name of ["Crystal Maiden", "Warlock", "Juggernaut", "Omniknight"])
    await expect(mine.getByText(name)).toBeVisible();
  for (const name of ["Lion", "Death Prophet", "Bloodseeker", "Tiny"])
    await expect(enemy.getByText(name)).toBeVisible();
  // Every slashed hero, including bans on bright art (Dawnbreaker) that an earlier reader missed.
  for (const name of ["Pudge", "Dawnbreaker", "Void Spirit", "Sniper", "Lina"])
    await expect(page.getByRole("button", { name: `Unban ${name}` })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unban Anti-Mage" })).toHaveCount(0);
});
