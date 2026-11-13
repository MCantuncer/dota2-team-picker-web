import { expect } from "@playwright/test";
import { befriend, expectAccessible, newPlayer, seedFriend, test, uniqueEmail } from "./helpers";

test("a party player can become draft captain and step down", async ({ page }) => {
  await newPlayer(page, uniqueEmail("party-captain"), "Lion");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();

  const captain = page.getByRole("region", { name: "Draft captain" });
  await expect(captain.getByText("None yet. Anyone can enter the draft.")).toBeVisible();
  await expectAccessible(page);

  await captain.getByRole("button", { name: "Become captain" }).click();
  await expect(captain.getByText("You enter the draft for the party.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Players" }).getByText("Draft Captain", { exact: true })).toBeVisible();

  await captain.getByRole("button", { name: "Step down" }).click();
  await expect(captain.getByText("None yet. Anyone can enter the draft.")).toBeVisible();
  await expect(captain.getByRole("button", { name: "Become captain" })).toBeVisible();
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

  // Can starts a party, invites Ali, and becomes draft captain.
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  await ali.goto("/party");
  await ali.getByRole("alertdialog").getByRole("button", { name: "Join" }).click();
  await expect(ali.getByRole("region", { name: "Players" }).getByText("Can")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Players" }).getByText("Ali")).toBeVisible();
  await page.getByRole("region", { name: "Draft captain" }).getByRole("button", { name: "Become captain" }).click();

  // Ali asks; Can gets the prompt and says Yes.
  await expect(page.getByRole("region", { name: "Draft captain" }).getByText("You enter the draft for the party.")).toBeVisible();
  await ali.reload();
  const aliBar = ali.getByRole("region", { name: "Draft captain" });
  await aliBar.getByRole("button", { name: "Ask Can for captain" }).click();
  await expect(aliBar.getByText(/Asked Can/)).toBeVisible();
  await page.reload();
  const prompt = page.getByRole("region", { name: "Draft captain request" });
  await expect(prompt).toBeVisible();
  await expectAccessible(page);
  await prompt.getByRole("button", { name: "Give captain" }).click();
  await expect(prompt).toBeHidden();

  await ali.reload();
  await expect(aliBar.getByText("You enter the draft for the party.")).toBeVisible();

  // Can now watches the draft that Ali enters, without the boxes to type heroes in.
  await page.goto("/draft");
  await expect(page.getByText("Ali enters every hero. Tell them which of your picks you want.")).toBeVisible();
  // Can's own picks come first, then Ali's Team Plan, read only: no Picked or Banned buttons, and Ali sets the rank.
  await expect(page.getByRole("status").getByText("Watching Ali's Draft")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team Plan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Picked" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "My Picks" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /^Rank/ })).toBeDisabled();
  await expect(page.getByRole("list", { name: "Seats" }).getByRole("listitem").filter({ hasText: "Ali" })).toContainText("Draft Captain");
  await expect(page.getByPlaceholder("My team pick, e.g. cm5")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New draft" })).toBeHidden();
  await expectAccessible(page);
  await aliContext.close();
});

test("the party planner sees suggestions per player", async ({ page }) => {
  await newPlayer(page, uniqueEmail("per-player"), "Lion");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await expect(page.getByRole("region", { name: "Draft captain" })).toBeVisible();

  await page.goto("/draft");
  await page.getByRole("button", { name: "Per Player" }).click();
  await expect(page.getByRole("heading", { name: "Per Player" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Suggested heroes for Lion" })).toBeVisible();
  await expectAccessible(page);
});

test("Draft shows the party in Team Seats, and Leave Party goes back to your own draft", async ({ page }) => {
  await newPlayer(page, uniqueEmail("party-seats"), "Lion");
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await expect(page.getByRole("button", { name: "Leave party" })).toBeVisible();

  await page.goto("/draft");
  const seats = page.getByRole("region", { name: "Team Seats" });
  await expect(seats).toContainText("Lion's Party");
  await expect(seats).toContainText("1 in Party");
  await expect(seats.getByRole("listitem").filter({ hasText: "You" })).toContainText("In Party");
  await expect(seats.getByRole("button", { name: "Become Captain" })).toBeVisible();
  await expectAccessible(page);

  await seats.getByRole("button", { name: "Leave Party" }).click();
  await expect(page.getByRole("group", { name: "Plan For" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Seats" })).toHaveCount(0);
});

test("in a party Role moves your seat, a waiting seat can't be taken, and Plan For stays on Team", async ({ page }) => {
  const email = uniqueEmail("party-role");
  await newPlayer(page, email, "Lion");
  await seedFriend(email, "Mert", { position: 3 });
  await page.goto("/party");
  await page.getByRole("button", { name: "Start a party" }).click();
  await page.getByRole("button", { name: "Invite", exact: true }).click();

  await page.goto("/draft");
  const role = page.getByRole("group", { name: "Role" });
  await expect(role.getByRole("button", { name: "Carry" })).toHaveAttribute("aria-pressed", "true");
  // Mert hasn't joined, so his Offlane seat waits for him.
  await expect(role.getByRole("button", { name: "Offlane" })).toBeDisabled();
  await expect(role.getByRole("button", { name: "Offlane" })).toHaveAttribute("title", "Seat Waiting for Mert");
  await expect(page.getByRole("group", { name: "Plan For" }).getByRole("button", { name: "Just Me" })).toBeDisabled();

  await role.getByRole("button", { name: "Mid" }).click();
  await expect(role.getByRole("button", { name: "Mid" })).toHaveAttribute("aria-pressed", "true");
  const seats = page.getByRole("list", { name: "Seats" });
  await page.reload();
  await expect(role.getByRole("button", { name: "Mid" })).toHaveAttribute("aria-pressed", "true");
  await expect(seats.getByRole("listitem").filter({ hasText: "You" })).toContainText("Mid");
});
