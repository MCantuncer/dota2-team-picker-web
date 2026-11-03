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

  // The owner starts a party for the Stack and invites from it in one click.
  await page.goto("/party");
  await page.getByLabel("Stack", { exact: true }).selectOption({ label: "Night Owls" });
  await page.getByRole("button", { name: "Start a Party" }).click();
  const fromStack = page.getByRole("region", { name: "Invite from Stack" });
  await fromStack.getByRole("checkbox", { name: "Tusk" }).check();
  await fromStack.getByRole("button", { name: "Invite" }).click();
  await expect(fromStack.getByText("Invite sent.")).toBeVisible();
  await expectAccessible(page);
  await palContext.close();
});

test("a player finds an open Stack by name and asks to join", async ({ page, browser }) => {
  const name = `Lane ${Date.now().toString(36)}`;
  await signUp(page, uniqueEmail("open-owner"), "Lina");
  await page.goto("/stacks");
  await page.getByPlaceholder("Stack name, e.g. Friday Five").fill(name);
  await page.getByRole("button", { name: "Create Stack" }).click();
  await expect(page.getByLabel("Stack Name")).toHaveValue(name);

  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();
  await signUp(stranger, uniqueEmail("open-stranger"), "Axe");
  await stranger.goto("/stacks");
  const all = stranger.getByRole("region", { name: "All Stacks" });
  await all.getByLabel("Search Stacks by name").fill(name);
  await all.getByRole("button", { name: "Search" }).click();
  const row = all.getByRole("listitem").filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Ask to Join" }).click();
  await expect(row.getByText("Asked")).toBeVisible();
  await expectAccessible(stranger);

  // The request survives a reload, and the asker can take it back.
  await stranger.reload();
  await all.getByLabel("Search Stacks by name").fill(name);
  await all.getByRole("button", { name: "Search" }).click();
  await row.getByRole("button", { name: "Cancel" }).click();
  await expect(row.getByRole("button", { name: "Ask to Join" })).toBeVisible();
  await strangerContext.close();
});
