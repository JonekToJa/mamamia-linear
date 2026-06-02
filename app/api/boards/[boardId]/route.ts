import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { boardId } = await params;
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      tags: { orderBy: { name: "asc" } },
      columns: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            include: {
              owners: { include: { user: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      },
    },
  });
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(board);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { boardId } = await params;
  await prisma.board.delete({ where: { id: boardId } });
  return NextResponse.json({ ok: true });
}
