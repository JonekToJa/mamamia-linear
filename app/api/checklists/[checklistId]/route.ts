import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ checklistId: string }> };

const PatchSchema = z.object({ title: z.string().trim().min(1).max(200) });

export async function PATCH(req: Request, { params }: Params) {
  const { checklistId } = await params;
  const { title } = PatchSchema.parse(await req.json());
  const cl = await prisma.checklist.update({ where: { id: checklistId }, data: { title } });
  return NextResponse.json(cl);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { checklistId } = await params;
  const me = await getCurrentUser();
  const cl = await prisma.checklist.findUnique({ where: { id: checklistId } });
  if (!cl) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.checklist.delete({ where: { id: checklistId } });
    await logActivity(tx, {
      cardId: cl.cardId,
      actorUserId: me.id,
      type: "CHECKLIST_DELETED",
      payload: { checklist_id: checklistId, title: cl.title },
    });
  });
  return NextResponse.json({ ok: true });
}
