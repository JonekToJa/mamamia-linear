import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ itemId: string }> };
const Schema = z.object({ userId: z.string().uuid() });

async function resolveCardId(itemId: string) {
  const it = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: true },
  });
  return it?.checklist.cardId;
}

export async function POST(req: Request, { params }: Params) {
  const { itemId } = await params;
  const { userId } = Schema.parse(await req.json());
  const me = await getCurrentUser();
  const cardId = await resolveCardId(itemId);
  if (!cardId) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.checklistItemOwner.upsert({
      where: { checklistItemId_userId: { checklistItemId: itemId, userId } },
      update: {},
      create: { checklistItemId: itemId, userId },
    });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "CHECKLIST_ITEM_OWNER_ADDED",
      payload: { item_id: itemId, user_id: userId },
    });
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { itemId } = await params;
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const me = await getCurrentUser();
  const cardId = await resolveCardId(itemId);
  if (!cardId) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.checklistItemOwner.delete({
      where: { checklistItemId_userId: { checklistItemId: itemId, userId } },
    });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "CHECKLIST_ITEM_OWNER_REMOVED",
      payload: { item_id: itemId, user_id: userId },
    });
  });
  return NextResponse.json({ ok: true });
}
