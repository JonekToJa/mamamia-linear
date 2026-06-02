import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ boardId: string; userId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { boardId, userId } = await params;
  await prisma.boardMember.delete({
    where: { boardId_userId: { boardId, userId } },
  });
  return NextResponse.json({ ok: true });
}
