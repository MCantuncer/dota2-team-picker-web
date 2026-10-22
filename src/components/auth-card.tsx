/** Centered card layout for the login and sign up pages. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </main>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase text-zinc-500">
      <span className="h-px flex-1 bg-zinc-700" />
      or
      <span className="h-px flex-1 bg-zinc-700" />
    </div>
  );
}
