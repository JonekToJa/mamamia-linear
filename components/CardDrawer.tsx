"use client";

import { useCallback, useEffect, useState } from "react";
import { Dropdown, DropdownItem } from "./Dropdown";
import { RichTextEditor } from "./RichTextEditor";
import type { BoardSummary } from "./types";

type CardDetail = {
  id: string;
  title: string;
  descriptionHtml: string | null;
  dueDate: string | null;
  columnId: string;
  column: {
    boardId: string;
    name: string;
    board: { id: string; name: string; tags: { id: string; name: string }[] };
  };
  owners: { userId: string; user: { id: string; name: string } }[];
  tags: { tagId: string; tag: { id: string; name: string } }[];
  checklists: {
    id: string;
    title: string;
    items: {
      id: string;
      title: string;
      description: string | null;
      dueDate: string | null;
      completed: boolean;
      owners: { userId: string; user: { id: string; name: string } }[];
      tags: { tagId: string; tag: { id: string; name: string } }[];
    }[];
  }[];
  comments: { id: string; body: string; createdAt: string; author: { id: string; name: string } }[];
  activities: { id: string; type: string; payload: Record<string, unknown>; createdAt: string; actor: { id: string; name: string } }[];
};

export function CardDrawer({
  cardId,
  allBoards,
  onClose,
  onChanged,
}: {
  cardId: string;
  allBoards: BoardSummary[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [comment, setComment] = useState("");
  const [titleDraft, setTitleDraft] = useState("");

  const reload = useCallback(async () => {
    const c = await fetch(`/api/cards/${cardId}`).then((r) => r.json());
    setCard(c);
    setTitleDraft(c.title);
    onChanged();
  }, [cardId, onChanged]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setAllUsers);
  }, []);

  if (!card) {
    return (
      <aside className="fixed top-0 right-0 h-screen w-[640px] max-w-[95vw] bg-panel border-l border-border z-30 grid place-items-center">
        <span className="text-muted text-sm">Loading…</span>
      </aside>
    );
  }

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    reload();
  }

  async function deleteCard() {
    if (!confirm("Delete this card?")) return;
    await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    onClose();
    onChanged();
  }

  async function moveTo(boardId: string) {
    await fetch(`/api/cards/${cardId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetBoardId: boardId }),
    });
    onClose();
    onChanged();
  }

  const ownerIds = new Set(card.owners.map((o) => o.userId));
  const cardTagIds = new Set(card.tags.map((t) => t.tagId));
  const boardTags = card.column.board.tags;

  async function toggleOwner(userId: string) {
    if (ownerIds.has(userId)) {
      await fetch(`/api/cards/${cardId}/owners?userId=${userId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/cards/${cardId}/owners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    }
    reload();
  }

  async function toggleTag(tagId: string) {
    if (cardTagIds.has(tagId)) {
      await fetch(`/api/cards/${cardId}/tags?tagId=${tagId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/cards/${cardId}/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
    }
    reload();
  }

  async function createTag() {
    if (!card) return;
    const name = prompt("New tag name:");
    if (!name?.trim()) return;
    const tag = await fetch(`/api/boards/${card.column.boardId}/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => r.json());
    await fetch(`/api/cards/${cardId}/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tagId: tag.id }),
    });
    reload();
  }

  async function setDate() {
    if (!card) return;
    const cur = card.dueDate ? card.dueDate.slice(0, 10) : "";
    const next = prompt("Due date (YYYY-MM-DD), leave blank to clear:", cur);
    if (next === null) return;
    const trimmed = next.trim();
    const iso = trimmed ? new Date(trimmed + "T12:00:00Z").toISOString() : null;
    await patch({ dueDate: iso });
  }

  async function addChecklist() {
    const title = prompt("Checklist title:");
    if (!title?.trim()) return;
    await fetch(`/api/cards/${cardId}/checklists`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    reload();
  }

  async function postComment() {
    const body = comment.trim();
    if (!body) return;
    await fetch(`/api/cards/${cardId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setComment("");
    reload();
  }

  return (
    <aside className="fixed top-0 right-0 h-screen w-[720px] max-w-[95vw] bg-panel border-l border-border z-30 flex flex-col">
      <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-border">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => {
            if (titleDraft.trim() && titleDraft !== card.title) patch({ title: titleDraft.trim() });
          }}
          className="bg-transparent text-base font-medium outline-none flex-1 min-w-0"
        />
        <div className="flex items-center gap-1">
          <Dropdown
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="h-8 w-8 grid place-items-center rounded hover:bg-panel2 text-muted hover:text-text"
                aria-label="Card menu"
              >
                ⋯
              </button>
            )}
          >
            {(close) => (
              <>
                <div className="px-3 py-1 text-xs uppercase tracking-wide text-muted">
                  Move to board
                </div>
                {allBoards
                  .filter((b) => b.id !== card.column.board.id)
                  .map((b) => (
                    <DropdownItem
                      key={b.id}
                      onClick={() => {
                        close();
                        moveTo(b.id);
                      }}
                    >
                      {b.name}
                    </DropdownItem>
                  ))}
                <div className="border-t border-border my-1" />
                <DropdownItem
                  danger
                  onClick={() => {
                    close();
                    deleteCard();
                  }}
                >
                  Delete card
                </DropdownItem>
              </>
            )}
          </Dropdown>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded hover:bg-panel2 text-muted hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_320px]">
        <section className="overflow-y-auto p-5 space-y-5">
          <Pills>
            <Dropdown
              trigger={({ toggle }) => (
                <Pill onClick={toggle}>
                  Owners ({card.owners.length})
                </Pill>
              )}
            >
              {() => (
                <div className="max-h-64 overflow-y-auto">
                  {allUsers.map((u) => (
                    <DropdownItem key={u.id} onClick={() => toggleOwner(u.id)}>
                      {ownerIds.has(u.id) ? "✓ " : "  "}
                      {u.name}
                    </DropdownItem>
                  ))}
                </div>
              )}
            </Dropdown>

            <Pill onClick={setDate}>
              {card.dueDate ? new Date(card.dueDate).toLocaleDateString() : "Set date"}
            </Pill>

            <Dropdown
              trigger={({ toggle }) => (
                <Pill onClick={toggle}>Tags ({card.tags.length})</Pill>
              )}
            >
              {(close) => (
                <div className="max-h-64 overflow-y-auto">
                  {boardTags.map((t) => (
                    <DropdownItem key={t.id} onClick={() => toggleTag(t.id)}>
                      {cardTagIds.has(t.id) ? "✓ " : "  "}
                      {t.name}
                    </DropdownItem>
                  ))}
                  <div className="border-t border-border my-1" />
                  <DropdownItem
                    onClick={() => {
                      close();
                      createTag();
                    }}
                  >
                    + New tag…
                  </DropdownItem>
                </div>
              )}
            </Dropdown>
          </Pills>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Description</div>
            <RichTextEditor
              value={card.descriptionHtml}
              onBlurSave={(html) => {
                if (html !== (card.descriptionHtml ?? "")) patch({ descriptionHtml: html });
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wide text-muted">Checklists</div>
              <button
                onClick={addChecklist}
                className="text-xs text-muted hover:text-text"
              >
                + New checklist
              </button>
            </div>
            <div className="space-y-4">
              {card.checklists.map((cl) => (
                <ChecklistView
                  key={cl.id}
                  checklist={cl}
                  allUsers={allUsers}
                  onChanged={reload}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-l border-border flex flex-col overflow-hidden">
          <div className="px-4 py-2 text-xs uppercase tracking-wide text-muted border-b border-border">
            Activity
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            <Feed comments={card.comments} activities={card.activities} />
          </div>
          <div className="border-t border-border p-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment…"
              rows={2}
              className="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent resize-none"
            />
            <button
              onClick={postComment}
              disabled={!comment.trim()}
              className="mt-2 px-3 py-1 text-sm rounded bg-accent text-white disabled:opacity-40"
            >
              Comment
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}

function Pills({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Pill({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded-full border border-border bg-panel2 text-muted hover:text-text"
    >
      {children}
    </button>
  );
}

function ChecklistView({
  checklist,
  allUsers,
  onChanged,
}: {
  checklist: CardDetail["checklists"][number];
  allUsers: { id: string; name: string }[];
  onChanged: () => void;
}) {
  async function addItem() {
    const title = prompt("Item title:");
    if (!title?.trim()) return;
    await fetch(`/api/checklists/${checklist.id}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    onChanged();
  }

  async function removeChecklist() {
    if (!confirm(`Delete checklist "${checklist.title}"?`)) return;
    await fetch(`/api/checklists/${checklist.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="rounded border border-border bg-panel2 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{checklist.title}</div>
        <div className="flex gap-1">
          <button onClick={addItem} className="text-xs text-muted hover:text-text">
            + Item
          </button>
          <button onClick={removeChecklist} className="text-xs text-danger ml-2">
            Delete
          </button>
        </div>
      </div>
      <ul className="space-y-1">
        {checklist.items.map((it) => (
          <ChecklistItemView key={it.id} item={it} allUsers={allUsers} onChanged={onChanged} />
        ))}
      </ul>
    </div>
  );
}

function ChecklistItemView({
  item,
  allUsers,
  onChanged,
}: {
  item: CardDetail["checklists"][number]["items"][number];
  allUsers: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const ownerIds = new Set(item.owners.map((o) => o.userId));

  async function toggleCompleted() {
    await fetch(`/api/checklist-items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    onChanged();
  }
  async function remove() {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/checklist-items/${item.id}`, { method: "DELETE" });
    onChanged();
  }
  async function setDate() {
    const cur = item.dueDate ? item.dueDate.slice(0, 10) : "";
    const next = prompt("Due date (YYYY-MM-DD), blank to clear:", cur);
    if (next === null) return;
    const iso = next.trim() ? new Date(next.trim() + "T12:00:00Z").toISOString() : null;
    await fetch(`/api/checklist-items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dueDate: iso }),
    });
    onChanged();
  }
  async function toggleOwner(userId: string) {
    if (ownerIds.has(userId)) {
      await fetch(`/api/checklist-items/${item.id}/owners?userId=${userId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/checklist-items/${item.id}/owners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    }
    onChanged();
  }

  return (
    <li className="flex items-start gap-2 group">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={toggleCompleted}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className={item.completed ? "line-through text-muted text-sm" : "text-sm"}>
          {item.title}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Dropdown
            trigger={({ toggle }) => (
              <button onClick={toggle} className="text-xs text-muted hover:text-text">
                owners ({item.owners.length})
              </button>
            )}
          >
            {() => (
              <div className="max-h-56 overflow-y-auto">
                {allUsers.map((u) => (
                  <DropdownItem key={u.id} onClick={() => toggleOwner(u.id)}>
                    {ownerIds.has(u.id) ? "✓ " : "  "}
                    {u.name}
                  </DropdownItem>
                ))}
              </div>
            )}
          </Dropdown>
          <button onClick={setDate} className="text-xs text-muted hover:text-text">
            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "date"}
          </button>
        </div>
      </div>
      <button
        onClick={remove}
        className="opacity-0 group-hover:opacity-100 text-xs text-danger"
      >
        ✕
      </button>
    </li>
  );
}

function Feed({
  comments,
  activities,
}: {
  comments: CardDetail["comments"];
  activities: CardDetail["activities"];
}) {
  const merged: Array<
    | { kind: "comment"; t: number; c: CardDetail["comments"][number] }
    | { kind: "activity"; t: number; a: CardDetail["activities"][number] }
  > = [
    ...comments.map((c) => ({ kind: "comment" as const, t: Date.parse(c.createdAt), c })),
    ...activities.map((a) => ({ kind: "activity" as const, t: Date.parse(a.createdAt), a })),
  ].sort((x, y) => x.t - y.t);

  if (merged.length === 0) {
    return <div className="text-muted text-sm">No activity yet.</div>;
  }

  return (
    <>
      {merged.map((m) =>
        m.kind === "comment" ? (
          <div key={m.c.id} className="text-sm">
            <div className="text-xs text-muted">
              {m.c.author.name} · {new Date(m.c.createdAt).toLocaleString()}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap">{m.c.body}</div>
          </div>
        ) : (
          <div key={m.a.id} className="text-xs text-muted">
            {m.a.actor.name} · {describeActivity(m.a)} ·{" "}
            {new Date(m.a.createdAt).toLocaleString()}
          </div>
        ),
      )}
    </>
  );
}

function describeActivity(a: CardDetail["activities"][number]): string {
  const p = a.payload ?? {};
  switch (a.type) {
    case "CARD_MOVED":
      return "moved card";
    case "CARD_MOVED_BOARD":
      return "moved card to another board";
    case "OWNER_ADDED":
      return "added an owner";
    case "OWNER_REMOVED":
      return "removed an owner";
    case "DATE_SET":
      return `set due date${p.dueDate ? ` to ${new Date(String(p.dueDate)).toLocaleDateString()}` : ""}`;
    case "DATE_CLEARED":
      return "cleared due date";
    case "TAG_ADDED":
      return `added tag${p.name ? ` "${String(p.name)}"` : ""}`;
    case "TAG_REMOVED":
      return "removed a tag";
    case "CHECKLIST_CREATED":
      return `created checklist${p.title ? ` "${String(p.title)}"` : ""}`;
    case "CHECKLIST_DELETED":
      return "deleted a checklist";
    case "CHECKLIST_ITEM_ADDED":
      return `added item${p.title ? ` "${String(p.title)}"` : ""}`;
    case "CHECKLIST_ITEM_REMOVED":
      return "removed an item";
    case "CHECKLIST_ITEM_TOGGLED":
      return p.completed ? "checked an item" : "unchecked an item";
    case "CHECKLIST_ITEM_OWNER_ADDED":
      return "added item owner";
    case "CHECKLIST_ITEM_OWNER_REMOVED":
      return "removed item owner";
    case "CHECKLIST_ITEM_DATE_SET":
      return "set item due date";
    case "CHECKLIST_ITEM_DATE_CLEARED":
      return "cleared item due date";
    default:
      return a.type;
  }
}
