import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await getCurrentUser();
  const boards = await prisma.board.findMany({
    where: { members: { some: { userId: me.id } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (boards.length > 0) {
    redirect(`/boards/${boards[0].id}`);
  }

  return (
    <div className="flex h-screen">
      <Sidebar boards={boards} activeBoardId={null} currentUser={me} />
      <main className="flex-1 grid place-items-center text-muted">
        <div className="text-center">
          <p className="text-lg">No boards yet.</p>
          <p className="text-sm">Click the + next to "Boards" to create one.</p>
        </div>
      </main>
    </div>
  );
}
