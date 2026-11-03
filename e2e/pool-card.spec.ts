import { expect } from "@playwright/test";
import { expectAccessible, seedPoolCard, signUp, test, uniqueEmail } from "./helpers";

test("a hero pool card adds the hero to the player's position", async ({ page }) => {
  const email = uniqueEmail("pool-card");
  await signUp(page, email, "Pool Card");
  await seedPoolCard(email);

  await page.goto("/my-heroes");
  const card = page.getByRole("region", { name: "Add Monkey King to your carry heroes?" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("You won 86% of your last 7 Monkey King games");
  await expectAccessible(page);

  // Not on the draft page, where it would get in the way.
  await page.goto("/draft");
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);

  await page.goto("/my-heroes");
  await page.getByRole("button", { name: "Add Hero" }).click();
  await expect(page.getByRole("heading", { name: "Monkey King is in your carry heroes" })).toBeVisible();

  // Answered cards don't come back.
  await page.reload();
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);
});

test("closing a hero pool card asks again later, not never", async ({ page }) => {
  const email = uniqueEmail("pool-later");
  await signUp(page, email, "Pool Later");
  await seedPoolCard(email);

  await page.goto("/party");
  await page.getByRole("button", { name: "Ask me later" }).click();
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);
});
