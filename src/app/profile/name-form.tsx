"use client";

import { useActionState } from "react";
import { saveName } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [error, action, pending] = useActionState(saveName, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="name"
        defaultValue={name}
        maxLength={40}
        required
        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 outline-none focus:border-red-600"
      />
      <button type="submit" disabled={pending} className="rounded-md px-3 py-1.5 text-sm ring-1 ring-zinc-600 hover:bg-zinc-800">
        {pending ? "Saving…" : "Save"}
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </form>
  );
}
