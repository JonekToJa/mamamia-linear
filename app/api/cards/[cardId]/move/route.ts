import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";
import { topPosition } from "@/lib/position";

type Params = { params: Promise<{ cardId: string }> };

const Schema = z.object({ targetBoardId: z.string().uuid() });

export async function POST(req: Request, { params }: Params) {
  const { cardId } = await params;
  const { targetBoardId } = Schema.parse(await req.json());
  const me = await getCurrentUser();

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const targetCol = await prisma.column.findFirst({
    where: { boardId: targetBoardId },
    orderBy: { position: "asc" },
    include: { cards: { select: { position: true } } },
  });
  if (!targetCol) return NextResponse.json({ error: "target board has no columns" }, { status: 400 });

  if (card.column.boardId === targetBoardId && card.columnId === targetCol.id) {
    const updated = await prisma.card.update({
      where: { id: cardId },
      data: { position: topPosition(targetCol.cards) },
    });
    return NextResponse.json(updated);
  }

  const fromBoardId = card.column.boardId;
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.card.update({
      where: { id: cardId },
      data: { columnId: targetCol.id, position: topPosition(targetCol.cards) },
    });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "CARD_MOVED_BOARD",
      payload: { from_board_id: fromBoardId, to_board_id: targetBoardId },
    });
    return u;
  });

  return NextResponse.json(updated);
}
