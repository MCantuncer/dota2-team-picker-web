import { expect } from "@playwright/test";
import { befriend, expectAccessible, signUp, test, uniqueEmail } from "./helpers";

test("any player creates a Stack, invites a friend, and the friend joins", async ({ page, browser }) => {
  const ownerEmail = uniqueEmail("stack-owner");
  const palEmail = uniqueEmail("stack-pal");
  await signUp(page, ownerEmail, "Mirana");
  const palContext = await browser.newContext();
  const pal = await palContext.newPage();
  await signUp(pal, palEmail, "Tusk");
  await befriend(ownerEmail, palEmail);

  // A plain user sees what a Stack is for and creates one.
  await page.goto("/stacks");
  await expect(page.getByText(/Everyone you play with, saved in one place\./)).toBeVisible();
  await expectAccessible(page);
  await page.getByPlaceholder("Stack name, e.g. Friday Five").fill("Night Owls");
  await page.getByRole("button", { name: "Create Stack" }).click();
  await expect(page.getByLabel("Stack Name")).toHaveValue("Night Owls");

  // Inviting a friend waits for their answer.
  const invites = page.getByRole("region", { name: "Invite Friends" });
  await invites.getByRole("button", { name: "Invite" }).click();
  await expect(invites.getByText("Waiting")).toBeVisible();
  await expectAccessible(page);

  // The e2e stack runs without Realtime, so the friend loads the page to see the invite.
  await pal.goto("/stacks");
  const toPal = pal.getByRole("region", { name: "Invites" });
  await expect(toPal.getByText("Night Owls")).toBeVisible();
  await toPal.getByRole("button", { name: "Join" }).click();
  await expect(pal.getByRole("region", { name: "Stacks You Play In" }).getByText("Night Owls")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: /^Members/ }).getByText("Tusk")).toBeVisible();
  await palContext.close();
});
