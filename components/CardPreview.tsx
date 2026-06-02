"use client";

import { Dropdown, DropdownItem } from "./Dropdown";
import type { BoardSummary, CardWithRels } from "./types";

export function CardPreview({
  card,
  allBoards,
  onOpen,
  onMutated,
}: {
  card: CardWithRels;
  allBoards: BoardSummary[];
  onOpen: () => void;
  onMutated: () => void;
}) {
  async function deleteCard() {
    if (!confirm(`Delete card "${card.title}"?`)) return;
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    onMutated();
  }

  async function moveTo(boardId: string) {
    await fetch(`/api/cards/${card.id}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetBoardId: boardId }),
    });
    onMutated();
  }

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-md border border-border bg-panel2 px-3 py-2 hover:border-muted"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm leading-snug">{card.title}</div>
        <div
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Dropdown
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="h-6 w-6 grid place-items-center rounded hover:bg-panel text-muted hover:text-text"
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
                {allBoards.length === 0 && (
                  <div className="px-3 py-1.5 text-sm text-muted">No other boards</div>
                )}
                {allBoards.map((b) => (
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
        </div>
      </div>

      {(card.tags.length > 0 || card.dueDate || card.owners.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {card.tags.map((t) => (
            <span
              key={t.tagId}
              className="text-xs px-1.5 py-0.5 rounded bg-panel border border-border text-muted"
            >
              {t.tag.name}
            </span>
          ))}
          {card.dueDate && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-panel border border-border text-muted">
              {new Date(card.dueDate).toLocaleDateString()}
            </span>
          )}
          {card.owners.length > 0 && (
            <div className="flex -space-x-1 ml-auto">
              {card.owners.slice(0, 3).map((o) => (
                <span
                  key={o.userId}
                  title={o.user.name}
                  className="h-5 w-5 rounded-full bg-accent grid place-items-center text-[10px] border border-panel2"
                >
                  {o.user.name.charAt(0).toUpperCase()}
                </span>
              ))}
              {card.owners.length > 3 && (
                <span className="h-5 w-5 rounded-full bg-panel grid place-items-center text-[10px] border border-panel2 text-muted">
                  +{card.owners.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
