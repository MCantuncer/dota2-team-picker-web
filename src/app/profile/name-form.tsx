"use client";

import { useActionState } from "react";
import { saveName } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [error, action, pending] = useActionState(saveName, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="name"
        aria-label="Display name"
        defaultValue={name}
        maxLength={40}
        required
        className="field"
      />
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {pending ? "Saving…" : "Save"}
      </button>
      {error && <span className="text-sm text-dire">{error}</span>}
    </form>
  );
}
