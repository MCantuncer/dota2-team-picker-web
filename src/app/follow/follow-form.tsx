"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import { SUPABASE_URL } from "@/lib/supabase/env";

const CODE = /^[A-Za-z0-9_-]{32}$/;

/** The code from #code=..., checked; null when there is none. */
function codeFromHash(): string | null {
  const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
  return code && CODE.test(code) ? code : null;
}
const noSubscribe = () => () => {};

/** One tap signs this phone in to the PC's account and opens the draft it follows. */
export function FollowForm({ signedInAs }: { signedInAs: string | null }) {
  const code = useSyncExternalStore(noSubscribe, codeFromHash, () => null);

  if (!code)
    return (
      <>
        <p className="leading-relaxed text-muted">
          On your PC, open the Draft page, press Follow on Phone and scan the QR code with this phone&apos;s camera.
        </p>
        {signedInAs && (
          <Link href="/draft" className="btn btn-primary btn-lg self-start">
            Open the Draft
          </Link>
        )}
      </>
    );

  return (
    <form method="post" action={`${SUPABASE_URL}/functions/v1/phone-sign-in`} className="flex flex-col gap-5">
      <input type="hidden" name="code" value={code} />
      <p className="leading-relaxed text-muted">
        This phone will show the draft from your PC, live: Watch Dota reads it there and the picks and bans land here.
      </p>
      {signedInAs ? (
        <>
          <p className="leading-relaxed">
            This phone is signed in as <bdi className="font-semibold">{signedInAs}</bdi>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/draft" className="btn btn-secondary btn-lg">
              Keep This Account
            </Link>
            <button type="submit" className="btn btn-primary btn-lg">
              <Icon name="smartphone" />
              Use the PC&apos;s Account
            </button>
          </div>
        </>
      ) : (
        <button type="submit" className="btn btn-primary btn-lg self-start">
          <Icon name="smartphone" />
          Sign In on This Phone
        </button>
      )}
      <p className="text-sm text-subtle">The code works once, for one minute.</p>
    </form>
  );
}
