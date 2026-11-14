"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { fetchPartyLink, partyLinkUrl } from "@/lib/party-link";
import { createClient } from "@/lib/supabase/client";

/** After Copy Invite Link: copied, or shown in a field when the browser blocked the clipboard. */
type LinkState = { kind: "copied"; url: string } | { kind: "manual"; url: string } | null;

/**
 * The leader's invite link for Discord or Steam chat. Copying fetches it (making one when needed, and
 * keeping it working 24 hours more); New Link replaces it so the old one stops working.
 */
export function useInviteLink(onError: (message: string | null) => void) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<LinkState>(null);
  const [busy, setBusy] = useState(false);

  const copy = async (fresh: boolean) => {
    setBusy(true);
    const result = await fetchPartyLink(supabase, fresh);
    setBusy(false);
    if (result.error !== null) return onError(`Invite link not loaded: ${result.error}`);
    onError(null);
    const url = partyLinkUrl(window.location.origin, result.link.code);
    try {
      await navigator.clipboard.writeText(url);
      setState({ kind: "copied", url });
    } catch {
      // Clipboard blocked (permissions, or Safari after an await): the field can be copied by hand.
      setState({ kind: "manual", url });
    }
  };
  return { state, busy, copy: () => void copy(false), renew: () => void copy(true) };
}

/** The line under the seats once the link was copied, or the link itself when it couldn't be. */
export function InviteLinkNote({ link }: { link: ReturnType<typeof useInviteLink> }) {
  if (!link.state) return null;
  const newLink = (
    <button
      type="button"
      onClick={link.renew}
      disabled={link.busy}
      title="Make a New Link. The Old One Stops Working."
      className="btn btn-secondary btn-sm shrink-0"
    >
      <Icon name="refresh" />
      New Link
    </button>
  );
  return link.state.kind === "copied" ? (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="flex items-center gap-2 text-sm text-muted [&_svg]:size-4 [&_svg]:text-radiant">
        <Icon name="check" />
        Invite link copied. It works for 24 hours.
      </p>
      {newLink}
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-sm text-muted">
        Copy the link by hand. It works for 24 hours.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={link.state.url}
          aria-label="Party invite link"
          onFocus={(e) => e.currentTarget.select()}
          className="field min-w-0 flex-1 text-sm"
        />
        {newLink}
      </div>
    </div>
  );
}
