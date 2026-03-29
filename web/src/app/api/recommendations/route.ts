import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      id: recommendations.id,
      type: recommendations.type,
      title: recommendations.title,
      body: recommendations.content,
      confidence: recommendations.actionable,
      createdAt: recommendations.createdAt,
    })
    .from(recommendations)
    .where(eq(recommendations.personaId, 1))
    .all();

  return NextResponse.json(rows);
}
