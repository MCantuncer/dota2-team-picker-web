import Image from "next/image";
import { Icon } from "@/components/icon";
import { SteamLogo } from "@/components/steam-button";

/** The player's Steam picture and name, a link to their Steam profile, and that the account is linked. */
export function SteamIdentity({ name, avatarUrl, steamId }: { name: string; avatarUrl: string | null; steamId: string }) {
  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={64}
          height={64}
          className="size-15 shrink-0 rounded-md ring-1 ring-line-strong sm:size-16"
        />
      ) : (
        <span aria-hidden className="size-15 shrink-0 rounded-md bg-hover ring-1 ring-line-strong sm:size-16" />
      )}
      <div className="flex min-w-0 flex-col items-start gap-2">
        <a
          href={`https://steamcommunity.com/profiles/${steamId}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open your Steam profile"
          className="group flex min-w-0 max-w-full items-center gap-2 text-xl font-semibold tracking-[-0.01em] text-fg sm:text-[1.375rem]"
        >
          <span className="truncate">{name}</span>
          <span className="text-subtle group-hover:text-fg">
            <Icon name="external" />
          </span>
          <span className="sr-only">(Steam profile, opens in a new tab)</span>
        </a>
        <span className="inline-flex h-6.5 items-center gap-1.5 rounded-full bg-radiant-tint pl-2 pr-2.5 text-sm font-medium text-radiant ring-1 ring-radiant/35 ring-inset">
          <SteamLogo className="size-3.75" />
          Steam Account Linked
          <Icon name="check" />
        </span>
      </div>
    </div>
  );
}
