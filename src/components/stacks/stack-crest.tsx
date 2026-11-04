/** A Stack's mark: the first letter of its name on a raised tile, where no hero art may be shown. */
export function StackCrest({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-md bg-raised text-lg font-bold text-fg ring-1 ring-inset ring-line-strong"
    >
      {name.trim().charAt(0).toUpperCase() || "S"}
    </span>
  );
}
