import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Starts the Steam sign-in, handled by the backend's steam-login function. Large on sign-in pages; `small` for
 * a hint line inside a page ("Sign in to add Stack mates and friends").
 */
export function SteamButton({ next, primary, small }: { next: string; primary?: boolean; small?: boolean }) {
  const href = `${SUPABASE_URL}/functions/v1/steam-login?${new URLSearchParams({ next })}`;
  return (
    <a
      href={href}
      className={`btn ${small ? "btn-sm" : "btn-lg"} ${primary ? "btn-primary" : "bg-steam text-on-strong ring-1 ring-line-hover hover:bg-steam-hover"}`}
    >
      <SteamLogo className={small ? "h-4 w-4" : "h-5 w-5"} />
      Sign In with Steam
    </a>
  );
}

/** The Steam logo, in the current text color. */
export function SteamLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`fill-current ${className ?? ""}`}>
      <path d="M12 2a10 10 0 0 0-9.96 9.04l5.35 2.21a2.83 2.83 0 0 1 1.6-.49h.16l2.38-3.45v-.05a3.77 3.77 0 1 1 3.77 3.77h-.09l-3.4 2.42v.13a2.83 2.83 0 0 1-5.6.56L2.4 14.5A10 10 0 1 0 12 2Zm-4.72 15.17-1.22-.5a2.12 2.12 0 1 0 1.16-2.9l1.27.52a1.56 1.56 0 1 1-1.2 2.88Zm9.13-7.62a2.51 2.51 0 1 0-2.51 2.51 2.51 2.51 0 0 0 2.51-2.51Zm-4.39 0a1.88 1.88 0 1 1 1.88 1.88 1.88 1.88 0 0 1-1.88-1.88Z" />
    </svg>
  );
}
