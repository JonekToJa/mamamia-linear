import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { boardId } = await params;
  const tags = await prisma.tag.findMany({
    where: { boardId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags);
}

const Schema = z.object({ name: z.string().trim().min(1).max(60), color: z.string().max(20).nullable().optional() });

export async function POST(req: Request, { params }: Params) {
  const { boardId } = await params;
  const { name, color } = Schema.parse(await req.json());
  const tag = await prisma.tag.upsert({
    where: { boardId_name: { boardId, name } },
    update: { color: color ?? null },
    create: { boardId, name, color: color ?? null },
  });
  return NextResponse.json(tag, { status: 201 });
}
