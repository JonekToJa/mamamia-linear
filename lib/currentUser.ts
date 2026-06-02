import { cache } from "react";
import { prisma } from "./db";

const DEFAULT_MOCK_EMAIL = "mock@local";

export const getCurrentUser = cache(async () => {
  const id = process.env.MOCK_USER_ID;
  if (id) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (u) return u;
  }
  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.user.upsert({
    where: { email: DEFAULT_MOCK_EMAIL },
    update: {},
    create: { email: DEFAULT_MOCK_EMAIL, name: "Me" },
  });
});
