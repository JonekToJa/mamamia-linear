"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@prisma/client";

export function MembersModal({
  boardId,
  onClose,
}: {
  boardId: string;
  onClose: () => void;
}) {
  const [all, setAll] = useState<User[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [allRes, memRes] = await Promise.all([
      fetch(`/api/users?q=${encodeURIComponent(q)}`).then((r) => r.json()),
      fetch(`/api/boards/${boardId}/members`).then((r) => r.json()),
    ]);
    setAll(allRes);
    setMembers(memRes);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [q, boardId]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const ordered = useMemo(() => {
    const memberMatches = all.filter((u) => memberIds.has(u.id));
    const nonMemberMatches = all.filter((u) => !memberIds.has(u.id));
    return [...memberMatches, ...nonMemberMatches];
  }, [all, memberIds]);

  async function add(userId: string) {
    await fetch(`/api/boards/${boardId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    reload();
  }

  async function remove(userId: string) {
    if (!confirm("Remove this member from the board?")) return;
    await fetch(`/api/boards/${boardId}/members/${userId}`, { method: "DELETE" });
    reload();
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 grid place-items-center"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-[90vw] rounded-lg border border-border bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium">Board members</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close">
            ✕
          </button>
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Search users…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm mb-3 focus:outline-none focus:border-accent"
        />

        <ul className="max-h-72 overflow-y-auto divide-y divide-border">
          {loading && <li className="py-2 text-sm text-muted">Loading…</li>}
          {!loading && ordered.length === 0 && (
            <li className="py-2 text-sm text-muted">No users found.</li>
          )}
          {ordered.map((u) => {
            const isMember = memberIds.has(u.id);
            return (
              <li key={u.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-7 w-7 rounded-full bg-accent grid place-items-center text-sm font-medium">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{u.name}</div>
                    {u.email && <div className="text-xs text-muted truncate">{u.email}</div>}
                  </div>
                </div>
                {isMember ? (
                  <button
                    onClick={() => remove(u.id)}
                    className="text-danger hover:bg-panel2 rounded h-7 w-7 grid place-items-center"
                    title="Remove from board"
                  >
                    🗑
                  </button>
                ) : (
                  <button
                    onClick={() => add(u.id)}
                    className="text-muted hover:text-text hover:bg-panel2 rounded h-7 w-7 grid place-items-center"
                    title="Add to board"
                  >
                    +
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
