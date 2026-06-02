import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bottomPosition } from "@/lib/position";

type Params = { params: Promise<{ columnId: string }> };

const Schema = z.object({ title: z.string().trim().min(1).max(280) });

export async function POST(req: Request, { params }: Params) {
  const { columnId } = await params;
  const { title } = Schema.parse(await req.json());
  const siblings = await prisma.card.findMany({
    where: { columnId },
    select: { position: true },
  });
  const card = await prisma.card.create({
    data: { columnId, title, position: bottomPosition(siblings) },
  });
  return NextResponse.json(card, { status: 201 });
}
