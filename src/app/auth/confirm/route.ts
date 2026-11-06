import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Finishes a Steam sign-in and turns it into a session cookie: the backend's steam-login function sends the
 * browser here with ?token_hash=...&type=email&next=...
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : { error: new Error("Missing sign-in token") };

  const target = request.nextUrl.clone();
  target.search = "";
  if (error) {
    target.pathname = "/login";
    target.searchParams.set("error", "link");
  } else {
    target.pathname = next;
  }
  return NextResponse.redirect(target);
}
