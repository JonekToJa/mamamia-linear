import type { ActivityType, Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function logActivity(
  tx: Tx,
  args: {
    cardId: string;
    actorUserId: string;
    type: ActivityType;
    payload?: Record<string, unknown>;
  },
) {
  await tx.activity.create({
    data: {
      cardId: args.cardId,
      actorUserId: args.actorUserId,
      type: args.type,
      payload: (args.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}
