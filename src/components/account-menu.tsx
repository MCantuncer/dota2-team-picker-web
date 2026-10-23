"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { isActive, type NavItem } from "./primary-nav";

export interface Account {
  name: string;
  /** Rank text such as "Legend 4" for Steam players, or the email for email accounts. */
  detail: string | null;
  avatarUrl: string | null;
  steamLinked: boolean;
}

/** First letters of the first two words, for the avatar of users without a Steam picture. */
function initials(name: string) {
  const letters = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase());
  return letters.join("") || "?";
}

export function Avatar({ account, size }: { account: Account; size: number }) {
  if (account.avatarUrl) {
    return (
      <Image
        src={account.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full ring-1 ring-line-strong"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-hover font-semibold text-fg ring-1 ring-line-strong"
    >
      {initials(account.name)}
    </span>
  );
}

const itemClass =
  "flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm outline-none hover:bg-hover focus-visible:bg-hover focus-visible:outline-none";

/**
 * The avatar button in the header corner and its dropdown (the WAI-ARIA menu button pattern):
 * profile, Steam, sign out, and on phones the main sections too.
 */
export function AccountMenu({ account, nav }: { account: Account; nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter((el) => el.offsetParent);
  const focusItem = (index: number) => {
    const all = items();
    all[(index + all.length) % all.length]?.focus();
  };

  // Close on any click outside the menu.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const openAndFocus = (index: number) => {
    setOpen(true);
    requestAnimationFrame(() => focusItem(index));
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAndFocus(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openAndFocus(-1);
    }
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const all = items();
    const current = all.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(-1);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${account.name}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
        className={`flex h-9 items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-raised ${open ? "bg-raised" : ""}`}
      >
        <Avatar account={account} size={28} />
        <span className="hidden max-w-36 truncate text-sm font-medium text-fg md:block">{account.name}</span>
        <svg viewBox="0 0 16 16" aria-hidden className={`h-4 w-4 text-subtle transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Account"
        hidden={!open}
        onKeyDown={onMenuKey}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-line-strong bg-surface p-1.5 shadow-xl shadow-black/40"
      >
        <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
          <Avatar account={account} size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg">{account.name}</div>
            {account.detail && <div className="truncate text-xs text-muted">{account.detail}</div>}
          </div>
        </div>

        {nav.length > 0 && (
          <div className="border-t border-line py-1 sm:hidden">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={`${itemClass} text-fg aria-[current=page]:text-accent`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="border-t border-line py-1">
          <Link href="/profile" role="menuitem" tabIndex={-1} className={`${itemClass} text-fg`}>
            Profile
          </Link>
          {account.steamLinked ? (
            <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-muted">
              Steam account linked
              <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-radiant" />
            </div>
          ) : (
            <Link href="/my-heroes#steam" role="menuitem" tabIndex={-1} className={`${itemClass} text-fg`}>
              Link Steam account
            </Link>
          )}
        </div>

        <div className="border-t border-line pt-1">
          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem" tabIndex={-1} className={`${itemClass} text-muted`}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
