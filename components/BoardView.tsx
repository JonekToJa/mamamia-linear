"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown, DropdownItem } from "./Dropdown";
import { MembersModal } from "./MembersModal";
import { CardPreview } from "./CardPreview";
import { CardDrawer } from "./CardDrawer";
import type { BoardSummary, BoardWithEverything } from "./types";

export function BoardView({
  board,
  allBoards,
}: {
  board: BoardWithEverything;
  allBoards: BoardSummary[];
}) {
  const router = useRouter();
  const [membersOpen, setMembersOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  async function deleteBoard() {
    if (!confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
    await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  async function addColumn() {
    const name = prompt("Column name:");
    if (!name?.trim()) return;
    await fetch(`/api/boards/${board.id}/columns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-border">
        <h1 className="text-base font-medium truncate">{board.name}</h1>
        <div className="flex items-center gap-2">
          <Dropdown
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="h-8 w-8 grid place-items-center rounded hover:bg-panel2 text-muted hover:text-text"
                aria-label="Board menu"
              >
                ⋯
              </button>
            )}
          >
            {(close) => (
              <>
                <DropdownItem
                  onClick={() => {
                    close();
                    setMembersOpen(true);
                  }}
                >
                  Members…
                </DropdownItem>
                <DropdownItem
                  danger
                  onClick={() => {
                    close();
                    deleteBoard();
                  }}
                >
                  Delete board
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div className="flex gap-4 p-5 h-full min-w-max">
          {board.columns.map((col) => (
            <ColumnView
              key={col.id}
              col={col}
              onOpenCard={setActiveCardId}
              allBoards={allBoards}
              onMutated={() => router.refresh()}
            />
          ))}
          <button
            onClick={addColumn}
            className="h-10 px-3 rounded border border-dashed border-border text-muted hover:text-text hover:border-text self-start"
            title="Add column"
          >
            + Column
          </button>
        </div>
      </div>

      {membersOpen && (
        <MembersModal boardId={board.id} onClose={() => setMembersOpen(false)} />
      )}

      {activeCardId && (
        <CardDrawer
          cardId={activeCardId}
          allBoards={allBoards}
          onClose={() => setActiveCardId(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </main>
  );
}

function ColumnView({
  col,
  onOpenCard,
  allBoards,
  onMutated,
}: {
  col: BoardWithEverything["columns"][number];
  onOpenCard: (id: string) => void;
  allBoards: BoardSummary[];
  onMutated: () => void;
}) {
  async function addCard() {
    const title = prompt("Card title:");
    if (!title?.trim()) return;
    await fetch(`/api/columns/${col.id}/cards`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    onMutated();
  }

  async function rename() {
    const name = prompt("Rename column:", col.name);
    if (!name?.trim() || name === col.name) return;
    await fetch(`/api/columns/${col.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    onMutated();
  }

  async function remove() {
    if (!confirm(`Delete column "${col.name}" and all its cards?`)) return;
    await fetch(`/api/columns/${col.id}`, { method: "DELETE" });
    onMutated();
  }

  return (
    <section className="w-72 shrink-0 flex flex-col bg-panel rounded-lg border border-border max-h-full">
      <header className="h-10 shrink-0 flex items-center justify-between px-3">
        <span className="text-sm font-medium truncate">{col.name}</span>
        <div className="flex items-center gap-1">
          <Dropdown
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="h-7 w-7 grid place-items-center rounded hover:bg-panel2 text-muted hover:text-text"
                aria-label="Column menu"
              >
                ⋯
              </button>
            )}
          >
            {(close) => (
              <>
                <DropdownItem onClick={() => { close(); rename(); }}>Rename</DropdownItem>
                <DropdownItem danger onClick={() => { close(); remove(); }}>
                  Delete column
                </DropdownItem>
              </>
            )}
          </Dropdown>
          <button
            onClick={addCard}
            className="h-7 w-7 grid place-items-center rounded hover:bg-panel2 text-muted hover:text-text"
            title="Add card"
          >
            +
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 scrollbar-thin">
        {col.cards.map((card) => (
          <CardPreview
            key={card.id}
            card={card}
            allBoards={allBoards}
            onOpen={() => onOpenCard(card.id)}
            onMutated={onMutated}
          />
        ))}
      </div>
    </section>
  );
}
