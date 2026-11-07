import { expect } from "@playwright/test";
import { expectAccessible, newPlayer, savedMidTop, seedMidHeroes, test, uniqueEmail } from "./helpers";

// Invoker 74, Outworld Devourer 76, Pudge 14, Puck 13, Storm Spirit 17.
/** A chip by its name: the list number, the hero, then ", in your Top 3" when starred. */
const chip = (name: string, top = false) => new RegExp(`^\\d+\\s*${name}${top ? "\\s*, in your Top 3" : ""}`);

test("a player stars heroes into their Top 3 and swaps one when it is full", async ({ page }) => {
  const email = uniqueEmail("top3");
  await newPlayer(page, email, "Top Three");
  await seedMidHeroes(email, [74, 76, 14, 13, 17], [76, 14]);
  await page.goto("/my-heroes");
  const mid = page.getByRole("region", { name: "Mid heroes" });

  // Starred heroes come first, in slot order.
  await expect(mid.getByRole("button", { name: chip("Outworld Devourer", true) })).toHaveText(/^1/);
  await expect(mid.getByRole("button", { name: chip("Pudge", true) })).toHaveText(/^2/);

  // Add a third.
  await mid.getByRole("button", { name: chip("Puck") }).click();
  const puck = page.getByRole("dialog", { name: "Puck" });
  await expect(puck.getByRole("button", { name: "Remove from Mid" })).toBeVisible();
  await expectAccessible(page);
  await puck.getByRole("button", { name: "Add to Top 3" }).click();
  await expect(puck.getByRole("button", { name: "Remove from Top 3" })).toBeVisible();
  await expect(mid.getByRole("button", { name: chip("Puck", true) })).toHaveText(/^3/);
  await expect.poll(() => savedMidTop(email)).toEqual([76, 14, 13]);

  // The Top 3 is full: pick who Invoker replaces.
  await page.keyboard.press("Escape");
  await mid.getByRole("button", { name: chip("Invoker") }).click();
  await page.getByRole("dialog", { name: "Invoker" }).getByRole("button", { name: "Add to Top 3" }).click();
  const replace = page.getByRole("dialog", { name: "Add Invoker to Your Top 3" });
  await expect(replace).toContainText("Your Top 3 is full. Pick the hero Invoker replaces.");
  await expectAccessible(page);
  await replace.getByRole("button", { name: "Replace Pudge with Invoker" }).click();
  await expect(replace).toHaveCount(0);
  await expect(mid.getByRole("button", { name: chip("Invoker", true) })).toHaveText(/^2/);
  await expect.poll(() => savedMidTop(email)).toEqual([76, 74, 13]);

  // It stays after a reload, and a star comes off from the card.
  await page.reload();
  await mid.getByRole("button", { name: chip("Outworld Devourer", true) }).click();
  await page.getByRole("dialog", { name: "Outworld Devourer" }).getByRole("button", { name: "Remove from Top 3" }).click();
  await expect(mid.getByRole("button", { name: chip("Outworld Devourer\\s*$") })).toBeVisible();
  await expect.poll(() => savedMidTop(email)).toEqual([74, 13]);
});

test("removing a starred hero from the position from its card", async ({ page }) => {
  const email = uniqueEmail("top3-remove");
  await newPlayer(page, email, "Top Remove");
  await seedMidHeroes(email, [74, 76], [76]);
  await page.goto("/my-heroes");
  const mid = page.getByRole("region", { name: "Mid heroes" });
  await mid.getByRole("button", { name: chip("Outworld Devourer", true) }).click();
  await page.getByRole("dialog", { name: "Outworld Devourer" }).getByRole("button", { name: "Remove from Mid" }).click();
  await expect(mid.getByRole("button", { name: chip("Outworld Devourer") })).toHaveCount(0);
  await expect(mid.getByRole("button", { name: chip("Invoker") })).toHaveText(/^1/);
  await expect.poll(() => savedMidTop(email)).toEqual([]);
});
