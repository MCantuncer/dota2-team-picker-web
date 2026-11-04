import Image from "next/image";
import type { CSSProperties } from "react";

/** The hero's large transparent render on the Steam CDN, from its portrait URL. */
export const renderOf = (portrait?: string) =>
  portrait?.replace("/images/dota_react/heroes/", "/videos/dota_react/heroes/renders/");

/** Graded down and faded at the edges, so the copy in front of it stays readable. One per page. */
const RENDER_STYLE: CSSProperties = {
  filter: "grayscale(.55) sepia(.25) brightness(.6)",
  maskImage: "radial-gradient(closest-side at 50% 45%, #000 45%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(closest-side at 50% 45%, #000 45%, transparent 100%)",
};

/** A page head's hero render, placed by `className`. Decorative: the heading names the hero. */
export function HeroRender({ portrait, className }: { portrait?: string; className: string }) {
  const src = renderOf(portrait);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={640}
      height={640}
      style={RENDER_STYLE}
      className={`pointer-events-none ${className}`}
    />
  );
}
