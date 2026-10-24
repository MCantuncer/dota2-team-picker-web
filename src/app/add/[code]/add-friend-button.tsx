"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Sends the friend request; if they already asked you, this accepts it. */
export function AddFriendButton({ targetId, name }: { targetId: string; name: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<"idle" | "sending" | "pending" | "accepted">("idle");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setStatus("sending");
    const { data, error } = await supabase.rpc("send_friend_request", { target: targetId });
    if (error) {
      setStatus("idle");
      return setError(error.message);
    }
    setError(null);
    setStatus(data === "accepted" ? "accepted" : "pending");
  };

  if (status === "pending" || status === "accepted") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-radiant">
          {status === "accepted" ? `You and ${name} are now friends.` : `Request sent. ${name} will see it on their Friends page.`}
        </p>
        <Link href="/friends" className="btn btn-secondary self-start">
          Go to Friends
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={send} disabled={status === "sending"} className="btn btn-primary self-start">
        {status === "sending" ? "Sending…" : "Send friend request"}
      </button>
      {error && <p className="text-sm text-dire">{error}</p>}
    </div>
  );
}
