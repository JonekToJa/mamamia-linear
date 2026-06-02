import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";

type Params = { params: Promise<{ cardId: string }> };

const Schema = z.object({ body: z.string().trim().min(1).max(5_000) });

export async function POST(req: Request, { params }: Params) {
  const { cardId } = await params;
  const { body } = Schema.parse(await req.json());
  const me = await getCurrentUser();
  const comment = await prisma.comment.create({
    data: { cardId, authorUserId: me.id, body },
    include: { author: true },
  });
  return NextResponse.json(comment, { status: 201 });
}
