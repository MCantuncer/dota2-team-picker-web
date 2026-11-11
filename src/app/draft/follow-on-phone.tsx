"use client";

import { create } from "qrcode";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";

const CODE_MS = 60_000;

/** The QR code's dark squares as one SVG path, drawn in React (no markup from a library). */
function qrPath(text: string): { size: number; d: string } {
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  let d = "";
  for (let y = 0; y < modules.size; y++)
    for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return { size: modules.size, d };
}

/**
 * On the PC: Follow on Phone opens a QR code that signs the player's phone in to this account and opens the draft
 * there. The code shows only after a press (never on a streamed screen by accident), works once, for one minute.
 */
export function FollowOnPhone() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<{ qr: { size: number; d: string }; until: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const make = async () => {
    setError(null);
    const { data, error } = await createClient().rpc("create_phone_sign_in");
    if (error) return setError(`No code made: ${error.message}`);
    setCode({ qr: qrPath(`${window.location.origin}/follow#code=${data}`), until: Date.now() + CODE_MS });
    setNow(Date.now());
  };

  useEffect(() => {
    if (!code) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [code]);

  const left = code ? Math.max(0, Math.ceil((code.until - now) / 1000)) : 0;
  const close = () => {
    setOpen(false);
    setCode(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="Follow on Phone"
        title="Follow on Phone"
        className="btn btn-secondary btn-sm"
      >
        <span className="flex text-muted">
          <Icon name="smartphone" />
        </span>
        <span className="max-md:hidden">Follow on Phone</span>
      </button>
      {open && (
        <section
          aria-labelledby="follow-phone-title"
          className="absolute right-0 top-full z-30 mt-2 flex w-80 flex-col gap-5 rounded-xl border border-accent-deep bg-surface p-6 shadow-xl"
        >
          <div className="flex flex-col gap-2">
            <h2 id="follow-phone-title" className="text-lg font-semibold">
              Follow on Your Phone
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              Scan with the phone camera. It opens this draft, signed in, no Steam login on the phone.
            </p>
          </div>
          {code && left > 0 ? (
            <>
              <svg
                role="img"
                aria-label="QR code that signs your phone in"
                viewBox={`-2 -2 ${code.qr.size + 4} ${code.qr.size + 4}`}
                className="mx-auto size-52 rounded-xl bg-fg"
                shapeRendering="crispEdges"
              >
                <path d={code.qr.d} className="fill-bg" />
              </svg>
              <p className="flex items-center gap-3 rounded-lg bg-raised px-4 py-3 text-sm text-muted">
                <Icon name="clock" />
                Works once, for {left} more seconds.
              </p>
            </>
          ) : (
            <button onClick={() => void make()} className="btn btn-primary">
              {code ? "New Code" : "Show QR Code"}
            </button>
          )}
          {error && <p className="notice notice-error">{error}</p>}
        </section>
      )}
    </div>
  );
}
