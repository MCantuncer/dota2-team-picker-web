import Image from "next/image";
import type { Sponsor } from "@/lib/sponsors";

/**
 * A reading page's one sponsor slot (the Framed Band): between two panels in the middle of the page, in a panel
 * frame of its own, with the word Sponsor above it so it is never taken for one of our findings. One still picture,
 * 728 by 90 from `md` and 320 by 100 on a phone; its room is kept before it loads, so nothing jumps. With no sponsor
 * booked it draws nothing at all.
 */
export function SponsorBand({ sponsor }: { sponsor: Sponsor | null }) {
  if (!sponsor) return null;
  return (
    <aside aria-labelledby="sponsor-label" className="grid gap-2">
      <p id="sponsor-label" className="text-sm font-semibold text-muted">
        Sponsor
      </p>
      <div className="flex justify-center rounded-xl border border-line bg-surface p-3">
        <a href={sponsor.href} target="_blank" rel="sponsored noopener noreferrer" aria-label={`${sponsor.name}, opens in a new tab`} className="block rounded-md">
          <Image src={sponsor.phone} alt="" width={320} height={100} unoptimized className="h-auto max-w-full rounded-md md:hidden" />
          <Image src={sponsor.wide} alt="" width={728} height={90} unoptimized className="h-auto max-w-full rounded-md max-md:hidden" />
        </a>
      </div>
    </aside>
  );
}
