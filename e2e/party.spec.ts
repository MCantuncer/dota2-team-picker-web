import { expect } from "@playwright/test";
import {
  befriend,
  expectAccessible,
  inviteOnDraft,
  newPlayer,
  seedFriend,
  seedStack,
  startPartyOnDraft,
  test,
  uniqueEmail,
} from "./helpers";

test("a party player can become draft captain and step down", async ({ page }) => {
  await newPlayer(page, uniqueEmail("party-captain"), "Lion");
  await startPartyOnDraft(page);

  const seats = page.getByRole("region", { name: "Team Seats" });
  const me = seats.getByRole("listitem").filter({ hasText: "You" });
  await expect(me).toContainText("In Party");
  await expectAccessible(page);

  await seats.getByRole("button", { name: "Become Captain" }).click();
  await expect(me).toContainText("Draft Captain");
  await seats.getByRole("button", { name: "Step Down" }).click();
  await expect(me).toContainText("In Party");
  await expect(seats.getByRole("button", { name: "Become Captain" })).toBeVisible();
});

// The e2e stack runs without Realtime, so each side reloads to see the other's change.
test("a player asks the draft captain for the role and gets it on Yes", async ({ page, browser }) => {
  const canEmail = uniqueEmail("captain-can");
  const aliEmail = uniqueEmail("captain-ali");
  await newPlayer(page, canEmail, "Can");
  const aliContext = await browser.newContext();
  const ali = await aliContext.newPage();
  await newPlayer(ali, aliEmail, "Ali");
  await befriend(canEmail, aliEmail);

  // Can starts a party on Draft, invites Ali into Mid, and becomes draft captain.
  await startPartyOnDraft(page);
  await inviteOnDraft(page, "Ali", 2);
  await ali.goto("/draft");
  const invite = ali.getByRole("alertdialog");
  await invite.getByRole("button", { name: "Join" }).click();
  await expect(invite).toBeHidden();
  const aliSeats = ali.getByRole("region", { name: "Team Seats" });
  await expect(aliSeats).toContainText("Can's Party");
  await page.reload();
  const seats = page.getByRole("region", { name: "Team Seats" });
  await expect(seats.getByRole("listitem").filter({ hasText: "Ali" })).toContainText("In Party");
  await seats.getByRole("button", { name: "Become Captain" }).click();
  await expect(seats.getByRole("listitem").filter({ hasText: "You" })).toContainText("Draft Captain");

  // Ali asks; Can gets the prompt and says Yes.
  await ali.reload();
  await aliSeats.getByRole("button", { name: "Ask Can for Captain" }).click();
  await expect(aliSeats.getByText(/Asked Can/)).toBeVisible();
  await page.reload();
  const prompt = page.getByRole("region", { name: "Draft captain request" });
  await expect(prompt).toBeVisible();
  await expectAccessible(page);
  await prompt.getByRole("button", { name: "Give Captain" }).click();
  await expect(prompt).toBeHidden();

  await ali.reload();
  await expect(aliSeats.getByRole("listitem").filter({ hasText: "You" })).toContainText("Draft Captain");

  // Can now watches the draft that Ali enters, without the boxes to type heroes in.
  await page.reload();
  await expect(page.getByText("Ali enters every hero. Tell them which of your picks you want.")).toBeVisible();
  // Can's own picks come first, then Ali's Team Plan, read only: no Picked or Banned buttons, and Ali sets the rank.
  await expect(page.getByRole("status").getByText("Watching Ali's Draft")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team Plan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Picked" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "My Picks" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /^Rank/ })).toBeDisabled();
  await expect(page.getByRole("list", { name: "Seats", exact: true }).getByRole("listitem").filter({ hasText: "Ali" })).toContainText("Draft Captain");
  await expect(page.getByPlaceholder("My team pick, e.g. cm5")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New draft" })).toBeHidden();
  await expectAccessible(page);
  await aliContext.close();
});

test("the party planner sees suggestions per player", async ({ page }) => {
  await newPlayer(page, uniqueEmail("per-player"), "Lion");
  await startPartyOnDraft(page);
  await page.getByRole("button", { name: "Per Player" }).click();
  await expect(page.getByRole("heading", { name: "Per Player" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Suggested heroes for Lion" })).toBeVisible();
  await expectAccessible(page);
});

test("Draft shows the party in Team Seats, and Leave Party goes back to your own draft", async ({ page }) => {
  await newPlayer(page, uniqueEmail("party-seats"), "Lion");
  await startPartyOnDraft(page);
  const seats = page.getByRole("region", { name: "Team Seats" });
  await expect(seats).toContainText("Lion's Party");
  await expect(seats).toContainText("1 in Party");
  await expect(seats.getByRole("listitem").filter({ hasText: "You" })).toContainText("In Party");
  await expect(seats.getByRole("button", { name: "Become Captain" })).toBeVisible();
  await expectAccessible(page);

  await seats.getByRole("button", { name: "Leave Party" }).click();
  await expect(page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Just Me" })).toBeEnabled();
  await expect(page.getByRole("list", { name: "Seats", exact: true })).toHaveCount(0);
});

test("in a party Role moves your seat, a waiting seat can't be taken, and Plan For stays on Team", async ({ page }) => {
  const email = uniqueEmail("party-role");
  await newPlayer(page, email, "Lion");
  await seedFriend(email, "Mert", { position: 3 });
  await startPartyOnDraft(page);
  await inviteOnDraft(page, "Mert", 3);

  const role = page.getByRole("group", { name: "Role" });
  await expect(role.getByRole("button", { name: "Carry" })).toHaveAttribute("aria-pressed", "true");
  // Mert hasn't joined, so his Offlane seat waits for him.
  await expect(role.getByRole("button", { name: "Offlane" })).toBeDisabled();
  await expect(role.getByRole("button", { name: "Offlane" })).toHaveAttribute("title", "Seat Waiting for Mert");
  await expect(page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Just Me" })).toBeDisabled();

  await role.getByRole("button", { name: "Mid" }).click();
  await expect(role.getByRole("button", { name: "Mid" })).toHaveAttribute("aria-pressed", "true");
  const seats = page.getByRole("list", { name: "Seats", exact: true });
  await page.reload();
  await expect(role.getByRole("button", { name: "Mid" })).toHaveAttribute("aria-pressed", "true");
  await expect(seats.getByRole("listitem").filter({ hasText: "You" })).toContainText("Mid");
});

test("Invite 2 to Party turns the planned seats into a party and keeps the board", async ({ page }) => {
  const email = uniqueEmail("party-start");
  await newPlayer(page, email, "Mirana");
  await seedStack(email, "Night Owls", [
    { name: "Tusk", position: 3 },
    { name: "Lina", position: 2 },
  ]);
  await page.goto("/draft");
  await page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Team", exact: true }).click();
  const planFor = page.getByRole("region", { name: "Plan For" });
  await planFor.getByLabel("Fill From Stack").selectOption({ label: "Night Owls" });
  await expect(planFor.getByRole("list", { name: "Team Seats" })).toContainText("Tusk");
  const ally = page.getByLabel("My team pick, e.g. cm5");
  await ally.fill("cm5");
  await ally.press("Enter");

  await planFor.getByRole("button", { name: "Invite 2 to Party" }).click();
  const seats = page.getByRole("region", { name: "Team Seats" });
  await expect(seats).toContainText("Mirana's Party");
  await expect(seats).toContainText("1 in Party, 2 Waiting");
  await expect(seats.getByRole("listitem").filter({ hasText: "Tusk" })).toContainText("Invited");
  await expect(seats.getByRole("listitem").filter({ hasText: "Lina" })).toContainText("Invited");
  // The pick typed before the party is in the party draft.
  await expect(page.getByRole("region", { name: "My team" }).getByText("Crystal Maiden")).toBeVisible();
  await expectAccessible(page);
});

test("the leader invites a friend into an open seat and frees it again", async ({ page }) => {
  const email = uniqueEmail("party-picker");
  await newPlayer(page, email, "Lion");
  await seedFriend(email, "Mert", { position: 3 });
  await startPartyOnDraft(page);

  const seats = page.getByRole("region", { name: "Team Seats" });
  await expect(seats).toContainText("Lion's Party");
  await seats.getByRole("button", { name: "Add Player to Pos 4" }).click();
  await page.getByRole("option", { name: /Mert/ }).click();
  const mert = seats.getByRole("listitem").filter({ hasText: "Mert" });
  await expect(mert).toContainText("Soft Support");
  await expect(mert).toContainText("Invited");
  await expectAccessible(page);

  await seats.getByRole("button", { name: "More for Mert" }).click();
  await page.getByRole("menuitem", { name: "Free Seat" }).click();
  await expect(mert).toHaveCount(0);
  await expect(seats).toContainText("1 in Party");
});

test("the leader copies an invite link from Draft and can make a new one", async ({ page }) => {
  await newPlayer(page, uniqueEmail("party-link-draft"), "Lion");
  await startPartyOnDraft(page);

  const seats = page.getByRole("region", { name: "Team Seats" });
  await seats.getByRole("button", { name: "Copy Invite Link" }).click();
  // Copied, or shown to copy by hand where the browser blocks the clipboard.
  await expect(seats.getByRole("status").filter({ hasText: "It works for 24 hours." })).toBeVisible();
  await seats.getByRole("button", { name: "New Link" }).click();
  await expect(seats.getByRole("alert")).toHaveCount(0);
  await expectAccessible(page);
});
