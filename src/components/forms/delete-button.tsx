"use client";

import { Button } from "@/components/ui/button";

/** Confirm-before-delete wrapper around a server action bound to one record. */
export function DeleteButton({ action, label }: { action: () => Promise<void>; label: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => { if (!window.confirm(`Delete ${label}? This cannot be undone.`)) e.preventDefault(); }}
    >
      <Button type="submit" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800">Delete</Button>
    </form>
  );
}
