import { expect } from "@playwright/test";
import { expectAccessible, newPlayer, seedPoolCard, test, uniqueEmail } from "./helpers";

test("a hero pool card adds the hero to the player's position", async ({ page }) => {
  const email = uniqueEmail("pool-card");
  await newPlayer(page, email, "Pool Card");
  await seedPoolCard(email);

  await page.goto("/my-heroes");
  const card = page.getByRole("region", { name: "Add Monkey King to your carry heroes?" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("You won 86% of your last 7 Monkey King games");
  await expectAccessible(page);

  // Not on the draft page, where it would get in the way.
  await page.goto("/draft");
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);

  await page.goto("/party");
  await card.getByRole("button", { name: "Add Hero" }).click();
  await expect(page.getByRole("heading", { name: "Monkey King is in your carry heroes" })).toBeVisible();

  // Answered cards don't come back.
  await page.reload();
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);
});

test("closing a hero pool card asks again later, not never", async ({ page }) => {
  const email = uniqueEmail("pool-later");
  await newPlayer(page, email, "Pool Later");
  await seedPoolCard(email);

  await page.goto("/party");
  await page.getByRole("button", { name: "Ask me later" }).click();
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: /Add Monkey King/ })).toHaveCount(0);
});

test("My Heroes lists suggestions on their position and can turn them off", async ({ page }) => {
  const email = uniqueEmail("pool-row");
  await newPlayer(page, email, "Pool Row");
  await seedPoolCard(email);

  await page.goto("/my-heroes");
  const row = page.getByRole("group", { name: "From Your Games" });
  await expect(row).toContainText("Add Monkey King to your carry heroes?");
  await row.getByRole("button", { name: "Add Hero" }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByTitle("Remove Monkey King")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Use in drafts" })).toBeChecked();

  await page.getByRole("checkbox", { name: "Suggest heroes from my recent games" }).uncheck();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Suggest heroes from my recent games" })).not.toBeChecked();
});
