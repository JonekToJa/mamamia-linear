import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";

const DEFAULT_COLUMNS = ["Backlog", "In progress", "Done"];

export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, createdAt: true },
  });
  return NextResponse.json(boards);
}

const CreateSchema = z.object({ name: z.string().trim().min(1).max(120).optional() });

export async function POST(req: Request) {
  const me = await getCurrentUser();
  const body = CreateSchema.parse(await req.json().catch(() => ({})));
  const name = body.name && body.name.length > 0 ? body.name : "Untitled board";

  const board = await prisma.$transaction(async (tx) => {
    const b = await tx.board.create({ data: { name } });
    await tx.boardMember.create({ data: { boardId: b.id, userId: me.id } });
    await tx.column.createMany({
      data: DEFAULT_COLUMNS.map((n, i) => ({
        boardId: b.id,
        name: n,
        position: i + 1,
      })),
    });
    return b;
  });

  return NextResponse.json(board, { status: 201 });
}
