import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { sanitizeRichText } from "@/lib/sanitize";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ cardId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { cardId } = await params;
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: { include: { board: { include: { tags: true } } } },
      owners: { include: { user: true } },
      tags: { include: { tag: true } },
      checklists: {
        orderBy: { position: "asc" },
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              owners: { include: { user: true } },
              tags: { include: { tag: true } },
            },
          },
        },
      },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      activities: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(card);
}

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(280).optional(),
  descriptionHtml: z.string().max(50_000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { cardId } = await params;
  const body = PatchSchema.parse(await req.json());
  const me = await getCurrentUser();

  const before = await prisma.card.findUnique({ where: { id: cardId } });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: { title?: string; descriptionHtml?: string | null; dueDate?: Date | null } = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.descriptionHtml !== undefined)
    data.descriptionHtml = body.descriptionHtml ? sanitizeRichText(body.descriptionHtml) : null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.card.update({ where: { id: cardId }, data });
    if (body.dueDate !== undefined) {
      const becameSet = !before.dueDate && u.dueDate;
      const becameCleared = before.dueDate && !u.dueDate;
      if (becameSet) {
        await logActivity(tx, {
          cardId,
          actorUserId: me.id,
          type: "DATE_SET",
          payload: { dueDate: u.dueDate?.toISOString() },
        });
      } else if (becameCleared) {
        await logActivity(tx, { cardId, actorUserId: me.id, type: "DATE_CLEARED" });
      }
    }
    return u;
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { cardId } = await params;
  await prisma.card.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
