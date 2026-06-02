"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { User } from "@prisma/client";

export function Sidebar({
  boards,
  activeBoardId,
  currentUser,
}: {
  boards: { id: string; name: string }[];
  activeBoardId: string | null;
  currentUser: User;
}) {
  const router = useRouter();

  async function createBoard() {
    const res = await fetch("/api/boards", { method: "POST", body: "{}" });
    if (!res.ok) return;
    const b = await res.json();
    router.push(`/boards/${b.id}`);
    router.refresh();
  }

  const initial = currentUser.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-panel flex flex-col">
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className="text-xs uppercase tracking-wider text-muted">Boards</span>
        <button
          onClick={createBoard}
          className="text-muted hover:text-text rounded h-6 w-6 grid place-items-center hover:bg-panel2"
          title="New board"
          aria-label="Create new board"
        >
          +
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {boards.length === 0 && (
          <div className="px-2 py-3 text-sm text-muted">No boards yet.</div>
        )}
        {boards.map((b) => (
          <Link
            key={b.id}
            href={`/boards/${b.id}`}
            className={clsx(
              "block px-2 py-1.5 rounded text-sm truncate",
              b.id === activeBoardId
                ? "bg-panel2 text-text"
                : "text-muted hover:bg-panel2 hover:text-text",
            )}
          >
            {b.name}
          </Link>
        ))}
      </nav>

      <button
        className="m-3 flex items-center gap-2 rounded px-2 py-2 hover:bg-panel2"
        onClick={() => {
          /* settings — not implemented */
        }}
        title="Settings"
      >
        <span className="h-7 w-7 rounded-full bg-accent grid place-items-center text-sm font-medium">
          {initial}
        </span>
        <span className="text-sm truncate">{currentUser.name}</span>
      </button>
    </aside>
  );
}
