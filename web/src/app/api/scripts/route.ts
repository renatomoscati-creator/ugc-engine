import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const personaId = parseInt(searchParams.get("personaId") ?? "1");
  const status = searchParams.get("status");

  const db = getDb();
  const result = db
    .select()
    .from(scripts)
    .where(eq(scripts.personaId, personaId))
    .orderBy(desc(scripts.createdAt))
    .all();

  const filtered = status ? result.filter((s) => s.status === status) : result;
  return NextResponse.json(filtered);
}
