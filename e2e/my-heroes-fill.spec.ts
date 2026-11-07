import { expect } from "@playwright/test";
import { expectAccessible, linkSteam, newPlayer, seedFill, test, uniqueEmail } from "./helpers";

test("a first visit fills My Heroes from the player's games", async ({ page }) => {
  const email = uniqueEmail("fill-welcome");
  await newPlayer(page, email, "Fill Welcome");
  await linkSteam(email, "Fill Welcome");
  // The local stack has no edge functions: answer as fill-heroes would after saving the fill.
  let calls = 0;
  await page.route("**/functions/v1/fill-heroes", async (route) => {
    calls += 1;
    expect(route.request().postDataJSON()).toEqual({ by: "welcome" });
    await seedFill(email, "done");
    await route.fulfill({ json: { claimed: true, state: "done", added: 1 } });
  });

  await page.goto("/my-heroes");
  await expect(page.getByRole("heading", { name: "1 Hero Added from Your Games" })).toBeVisible();
  await expect(page.getByText("From 835 games with a known position in the last 6 months.")).toBeVisible();
  const mid = page.getByRole("region", { name: "Mid heroes" });
  await expect(mid).toContainText("Outworld Devourer");
  // A finished fill rests for a day.
  await expect(mid.getByRole("button", { name: "Fill from My Games" })).toBeDisabled();
  await expect(mid.getByText(/^Again (tomorrow )?at \d\d:\d\d$/)).toBeVisible();
  expect(calls).toBe(1);
  await expectAccessible(page);

  // Hidden stays hidden on the next visit.
  await page.getByRole("button", { name: "Hide this card" }).click();
  await page.reload();
  await expect(mid).toContainText("Outworld Devourer");
  await expect(page.getByRole("heading", { name: /Added from Your Games/ })).toHaveCount(0);
});

test("a failed fill can be tried again from its card", async ({ page }) => {
  const email = uniqueEmail("fill-failed");
  await newPlayer(page, email, "Fill Failed");
  await seedFill(email, "failed");
  // Seeded just now, so the button rests 10 minutes; the card still says what happened.
  await page.goto("/my-heroes");
  const card = page.getByRole("region", { name: "Couldn't Read Your Games" });
  await expect(card).toContainText("Try again later, or pick your heroes below.");
  await expect(card.getByRole("button", { name: "Fill from My Games" })).toBeDisabled();
  await expectAccessible(page);
});
