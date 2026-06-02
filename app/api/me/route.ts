import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";

export async function GET() {
  const u = await getCurrentUser();
  return NextResponse.json(u);
}
