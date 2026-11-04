import Image from "next/image";

const MAX_FACES = 3;

/**
 * Up to three 40x22 hero portraits, overlapping, then a +N badge, so a line that names five heroes keeps its
 * width (the Why rows on Per Player use the same stack). The names are written beside it, so the art is decorative.
 */
export function FaceStack({ icons, ring = "ring-bg" }: { icons: string[]; ring?: string }) {
  if (!icons.length) return null;
  const more = icons.length - MAX_FACES;
  return (
    <span className="relative flex flex-none pt-px" aria-hidden>
      {icons.slice(0, MAX_FACES).map((icon, i) => (
        <Image
          key={icon}
          src={icon}
          alt=""
          width={40}
          height={22}
          className={`h-5.5 w-10 rounded-xs object-cover ${i ? `-ml-4 ring-2 ${ring}` : ""}`}
        />
      ))}
      {more > 0 && (
        <span className="micro absolute -bottom-1 -right-1 rounded-xs bg-hover-strong px-1 text-fg">+{more}</span>
      )}
    </span>
  );
}
