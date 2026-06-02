import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ cardId: string }> };

const Schema = z.object({ userId: z.string().uuid() });

export async function POST(req: Request, { params }: Params) {
  const { cardId } = await params;
  const { userId } = Schema.parse(await req.json());
  const me = await getCurrentUser();
  await prisma.$transaction(async (tx) => {
    await tx.cardOwner.upsert({
      where: { cardId_userId: { cardId, userId } },
      update: {},
      create: { cardId, userId },
    });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "OWNER_ADDED",
      payload: { user_id: userId },
    });
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { cardId } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const me = await getCurrentUser();
  await prisma.$transaction(async (tx) => {
    await tx.cardOwner.delete({ where: { cardId_userId: { cardId, userId } } });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "OWNER_REMOVED",
      payload: { user_id: userId },
    });
  });
  return NextResponse.json({ ok: true });
}
