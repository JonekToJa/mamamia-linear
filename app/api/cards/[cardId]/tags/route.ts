import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ cardId: string }> };

const Schema = z.object({ tagId: z.string().uuid() });

export async function POST(req: Request, { params }: Params) {
  const { cardId } = await params;
  const { tagId } = Schema.parse(await req.json());
  const me = await getCurrentUser();

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!card || !tag) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (tag.boardId !== card.column.boardId) {
    return NextResponse.json({ error: "tag does not belong to this card's board" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.cardTag.upsert({
      where: { cardId_tagId: { cardId, tagId } },
      update: {},
      create: { cardId, tagId },
    });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "TAG_ADDED",
      payload: { tag_id: tagId, name: tag.name },
    });
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { cardId } = await params;
  const tagId = new URL(req.url).searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId required" }, { status: 400 });
  const me = await getCurrentUser();
  await prisma.$transaction(async (tx) => {
    await tx.cardTag.delete({ where: { cardId_tagId: { cardId, tagId } } });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "TAG_REMOVED",
      payload: { tag_id: tagId },
    });
  });
  return NextResponse.json({ ok: true });
}
