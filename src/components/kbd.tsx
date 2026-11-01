/** A key hint, such as Enter or Tab, shown next to a keyboard action. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd mx-0.5">{children}</kbd>;
}
