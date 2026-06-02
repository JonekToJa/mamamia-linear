import { cache } from "react";
import { prisma } from "./db";

export const getCurrentUser = cache(async () => {
  const id = process.env.MOCK_USER_ID;
  if (id) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (u) return u;
  }
  const fallback = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!fallback) {
    throw new Error(
      "No users in DB. Run `npm run db:seed` to create the mock user.",
    );
  }
  return fallback;
});
