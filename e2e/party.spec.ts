import { expect } from "@playwright/test";
import { expectAccessible, signUp, test, uniqueEmail } from "./helpers";

test("a party player can become draft captain and step down", async ({ page }) => {
  await signUp(page, uniqueEmail("party-captain"), "Lion");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();

  const captain = page.getByRole("region", { name: "Draft captain" });
  await expect(captain.getByText("None yet. Anyone can enter the draft.")).toBeVisible();
  await expectAccessible(page);

  await captain.getByRole("button", { name: "Become captain" }).click();
  await expect(captain.getByText("You enter the draft for the party.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Players" }).getByText("Draft captain", { exact: true })).toBeVisible();

  await captain.getByRole("button", { name: "Step down" }).click();
  await expect(captain.getByText("None yet. Anyone can enter the draft.")).toBeVisible();
  await expect(captain.getByRole("button", { name: "Become captain" })).toBeVisible();
});
