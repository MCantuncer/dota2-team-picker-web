/** A hero in a draft list, tinted by team, with a button to take it back out. */
export function HeroChip({ label, tone, onRemove }: { label: string; tone?: "ours" | "foe" | "ban"; onRemove: () => void }) {
  const tones = {
    ours: "bg-radiant/10 ring-radiant-strong",
    foe: "bg-dire/10 ring-dire-strong",
    ban: "text-subtle line-through ring-line-strong",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm font-medium ring-1 ${tone ? tones[tone] : "bg-raised ring-line-strong"}`}>
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="px-1.5 text-muted hover:text-fg">
        ×
      </button>
    </span>
  );
}
