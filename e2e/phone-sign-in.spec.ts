import { devices, expect } from "@playwright/test";
import { SNAPSHOT_URL } from "../src/lib/engine/snapshot";
import { expectAccessible, heroData, newPlayer, test, uniqueEmail } from "./helpers";

test("the PC shows a QR code that signs the phone in with one tap", async ({ page, browser }) => {
  test.skip(test.info().project.name !== "chromium", "Opens its own phone next to the desktop page");
  await newPlayer(page, uniqueEmail("qr"), "Scanner");
  await page.goto("/draft");

  // The code shows only after two presses, so it never sits on a streamed screen by accident.
  await page.getByRole("button", { name: "Follow on Phone" }).click();
  await expect(page.getByRole("heading", { name: "Follow on Your Phone" })).toBeVisible();
  await expect(page.getByRole("img", { name: "QR code that signs your phone in" })).toHaveCount(0);
  const made = page.waitForResponse((r) => r.url().includes("/rpc/create_phone_sign_in"));
  await page.getByRole("button", { name: "Show QR Code" }).click();
  const code = (await (await made).json()) as string;
  expect(code).toMatch(/^[A-Za-z0-9_-]{32}$/);
  await expect(page.getByRole("img", { name: "QR code that signs your phone in" })).toBeVisible();
  await expect(page.getByText(/Works once, for \d+ more seconds\./)).toBeVisible();
  await expectAccessible(page);

  // The phone opens the code's page, not signed in. Edge functions don't run in the test stack, so the
  // sign-in function answers the way it does for a used code, after we check what the phone sent it.
  const phone = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  await phone.route(SNAPSHOT_URL, async (route) => route.fulfill({ json: await heroData() }));
  let sent: string | null = null;
  await phone.route("**/functions/v1/phone-sign-in", async (route) => {
    sent = new URLSearchParams(route.request().postData() ?? "").get("code");
    await route.fulfill({ status: 303, headers: { location: new URL("/login?error=phone", phone.url()).href } });
  });
  await phone.goto(`/follow#code=${code}`);
  await expect(phone.getByRole("heading", { name: "Follow Your PC" })).toBeVisible();
  await expectAccessible(phone);
  await phone.getByRole("button", { name: "Sign In on This Phone" }).click();
  await expect(phone.getByText("That QR code is used or has expired.", { exact: false })).toBeVisible();
  expect(sent).toBe(code);
});

test("the phone's page says how to get a code when it has none", async ({ page }) => {
  await page.goto("/follow");
  await expect(page.getByRole("heading", { name: "Follow Your PC" })).toBeVisible();
  await expect(page.getByText("press Follow on Phone and scan the QR code", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In on This Phone" })).toHaveCount(0);
});

test("a phone signed in to another account can keep it or switch to the PC's", async ({ page }) => {
  await newPlayer(page, uniqueEmail("qr-other"), "Other Player");
  await page.goto(`/follow#code=${"a".repeat(32)}`);
  await expect(page.getByText("This phone is signed in as Other Player.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Keep This Account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use the PC's Account" })).toBeVisible();
});
