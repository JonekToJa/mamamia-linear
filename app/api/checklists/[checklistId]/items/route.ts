import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";
import { bottomPosition } from "@/lib/position";

type Params = { params: Promise<{ checklistId: string }> };

const Schema = z.object({ title: z.string().trim().min(1).max(280) });

export async function POST(req: Request, { params }: Params) {
  const { checklistId } = await params;
  const { title } = Schema.parse(await req.json());
  const me = await getCurrentUser();
  const cl = await prisma.checklist.findUnique({ where: { id: checklistId } });
  if (!cl) return NextResponse.json({ error: "not found" }, { status: 404 });

  const siblings = await prisma.checklistItem.findMany({
    where: { checklistId },
    select: { position: true },
  });
  const item = await prisma.$transaction(async (tx) => {
    const it = await tx.checklistItem.create({
      data: { checklistId, title, position: bottomPosition(siblings) },
    });
    await logActivity(tx, {
      cardId: cl.cardId,
      actorUserId: me.id,
      type: "CHECKLIST_ITEM_ADDED",
      payload: { item_id: it.id, title },
    });
    return it;
  });
  return NextResponse.json(item, { status: 201 });
}
