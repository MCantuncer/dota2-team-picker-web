/** Centered card layout for the login and sign up pages. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="card flex flex-col gap-4 p-6 sm:p-8">
        <h1 className="page-title">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase text-subtle">
      <span className="h-px flex-1 bg-hover" />
      or
      <span className="h-px flex-1 bg-hover" />
    </div>
  );
}
