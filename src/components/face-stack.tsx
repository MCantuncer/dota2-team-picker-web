import { HeroFace } from "./hero-frame";

const MAX_FACES = 3;

/**
 * Up to three 28px hero faces in the Lane Cut frame, then a +N badge, so a line that names five heroes keeps its
 * width and every line's text starts at the same place (the Why rows on Per Player use the same stack). The names are written beside it, so the art is decorative.
 */
export function FaceStack({ icons }: { icons: string[] }) {
  if (!icons.length) return null;
  const more = icons.length - MAX_FACES;
  return (
    <span className="relative flex w-23 flex-none gap-1 pt-px" aria-hidden>
      {icons.slice(0, MAX_FACES).map((icon) => (
        <HeroFace key={icon} portrait={icon} name="" size={28} isDecorative />
      ))}
      {more > 0 && (
        <span className="micro absolute -right-1 -bottom-1 z-10 rounded-md bg-hover-strong px-1 text-fg">+{more}</span>
      )}
    </span>
  );
}
