import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { Sidebar } from "@/components/Sidebar";
import { BoardView } from "@/components/BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const me = await getCurrentUser();

  const [boards, board] = await Promise.all([
    prisma.board.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.board.findUnique({
      where: { id: boardId },
      include: {
        tags: { orderBy: { name: "asc" } },
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                owners: { include: { user: true } },
                tags: { include: { tag: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!board) notFound();

  return (
    <div className="flex h-screen">
      <Sidebar boards={boards} activeBoardId={boardId} currentUser={me} />
      <BoardView board={board} allBoards={boards} />
    </div>
  );
}
