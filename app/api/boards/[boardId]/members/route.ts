import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { boardId } = await params;
  const members = await prisma.boardMember.findMany({
    where: { boardId },
    include: { user: true },
  });
  return NextResponse.json(members.map((m) => m.user));
}

const AddSchema = z.object({ userId: z.string().uuid() });

export async function POST(req: Request, { params }: Params) {
  const { boardId } = await params;
  const { userId } = AddSchema.parse(await req.json());
  await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId } },
    update: {},
    create: { boardId, userId },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
