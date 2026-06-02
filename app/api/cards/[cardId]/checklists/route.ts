import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { logActivity } from "@/lib/activity";
import { bottomPosition } from "@/lib/position";

type Params = { params: Promise<{ cardId: string }> };

const Schema = z.object({ title: z.string().trim().min(1).max(200) });

export async function POST(req: Request, { params }: Params) {
  const { cardId } = await params;
  const { title } = Schema.parse(await req.json());
  const me = await getCurrentUser();
  const siblings = await prisma.checklist.findMany({
    where: { cardId },
    select: { position: true },
  });
  const created = await prisma.$transaction(async (tx) => {
    const cl = await tx.checklist.create({
      data: { cardId, title, position: bottomPosition(siblings) },
    });
    await logActivity(tx, {
      cardId,
      actorUserId: me.id,
      type: "CHECKLIST_CREATED",
      payload: { checklist_id: cl.id, title },
    });
    return cl;
  });
  return NextResponse.json(created, { status: 201 });
}
