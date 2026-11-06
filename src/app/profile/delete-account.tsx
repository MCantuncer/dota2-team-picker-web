"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "./actions";

/** Delete Account, behind a second step where the player types "delete". */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, action, pending] = useActionState(deleteAccount, null);

  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)} className="btn btn-danger-quiet">
          Delete Account
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <label htmlFor="delete-confirm" className="text-sm text-fg">
        Type <strong>delete</strong> to confirm. This can&apos;t be undone.
      </label>
      <input
        id="delete-confirm"
        name="confirm"
        autoComplete="off"
        autoFocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="field"
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending || typed.trim().toLowerCase() !== "delete"} className="btn btn-danger">
          {pending ? "Deleting…" : "Delete My Account"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-dire">
          {error}
        </p>
      )}
    </form>
  );
}
