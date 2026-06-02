import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bottomPosition } from "@/lib/position";

type Params = { params: Promise<{ boardId: string }> };

const Schema = z.object({ name: z.string().trim().min(1).max(120) });

export async function POST(req: Request, { params }: Params) {
  const { boardId } = await params;
  const { name } = Schema.parse(await req.json());
  const siblings = await prisma.column.findMany({
    where: { boardId },
    select: { position: true },
  });
  const col = await prisma.column.create({
    data: { boardId, name, position: bottomPosition(siblings) },
  });
  return NextResponse.json(col, { status: 201 });
}
