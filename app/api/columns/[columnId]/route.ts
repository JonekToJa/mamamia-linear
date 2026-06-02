import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ columnId: string }> };

const PatchSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function PATCH(req: Request, { params }: Params) {
  const { columnId } = await params;
  const { name } = PatchSchema.parse(await req.json());
  const col = await prisma.column.update({ where: { id: columnId }, data: { name } });
  return NextResponse.json(col);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { columnId } = await params;
  await prisma.column.delete({ where: { id: columnId } });
  return NextResponse.json({ ok: true });
}
