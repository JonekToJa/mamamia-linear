import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ itemId: string }> };

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(280).optional(),
  description: z.string().max(2_000).nullable().optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { itemId } = await params;
  const body = PatchSchema.parse(await req.json());
  const me = await getCurrentUser();

  const before = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: true },
  });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: { title?: string; description?: string | null; completed?: boolean; dueDate?: Date | null } = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.completed !== undefined) data.completed = body.completed;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.checklistItem.update({ where: { id: itemId }, data });
    const cardId = before.checklist.cardId;
    if (body.completed !== undefined && body.completed !== before.completed) {
      await logActivity(tx, {
        cardId,
        actorUserId: me.id,
        type: "CHECKLIST_ITEM_TOGGLED",
        payload: { item_id: itemId, title: u.title, completed: u.completed },
      });
    }
    if (body.dueDate !== undefined) {
      const becameSet = !before.dueDate && u.dueDate;
      const becameCleared = before.dueDate && !u.dueDate;
      if (becameSet) {
        await logActivity(tx, {
          cardId,
          actorUserId: me.id,
          type: "CHECKLIST_ITEM_DATE_SET",
          payload: { item_id: itemId, dueDate: u.dueDate?.toISOString() },
        });
      } else if (becameCleared) {
        await logActivity(tx, {
          cardId,
          actorUserId: me.id,
          type: "CHECKLIST_ITEM_DATE_CLEARED",
          payload: { item_id: itemId },
        });
      }
    }
    return u;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { itemId } = await params;
  const me = await getCurrentUser();
  const before = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: true },
  });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.checklistItem.delete({ where: { id: itemId } });
    await logActivity(tx, {
      cardId: before.checklist.cardId,
      actorUserId: me.id,
      type: "CHECKLIST_ITEM_REMOVED",
      payload: { item_id: itemId, title: before.title },
    });
  });
  return NextResponse.json({ ok: true });
}
