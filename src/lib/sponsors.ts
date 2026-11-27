/** The reading pages that carry the one sponsor slot. Never Draft, a live game, sign in, Stacks or Home. */
export type SponsorPage = "meta" | "proof";

/** One booked sponsor: a still picture in the two standard banner sizes, and where it leads. */
export interface Sponsor {
  /** The sponsor's name, read out with the link. */
  name: string;
  /** Where the picture leads. https only. */
  href: string;
  /** The 728 by 90 picture for tablets and wider, a file under /public/sponsors. */
  wide: string;
  /** The 320 by 100 picture for phones, a file under /public/sponsors. */
  phone: string;
}

/**
 * The sponsor booked for each page. A page with no entry draws no slot, so there is never an empty box.
 * To book one, add its two pictures under /public/sponsors and its entry here.
 */
const BOOKED: Partial<Record<SponsorPage, Sponsor>> = {};

const isFile = (path: string) => /^\/sponsors\/[\w.-]+\.(png|jpe?g|webp|avif)$/.test(path);

/** A booking the slot can draw: a name, an https link and two picture files of ours. */
export function isSponsor(sponsor: Sponsor | undefined): sponsor is Sponsor {
  return Boolean(sponsor && sponsor.name.trim() && /^https:\/\/[^\s/]+\.[^\s/]+/.test(sponsor.href) && isFile(sponsor.wide) && isFile(sponsor.phone));
}

/** The page's sponsor, or null when none is booked or the booking is not one the slot can draw. */
export function sponsorFor(page: SponsorPage, booked: Partial<Record<SponsorPage, Sponsor>> = BOOKED): Sponsor | null {
  const sponsor = booked[page];
  return isSponsor(sponsor) ? sponsor : null;
}
