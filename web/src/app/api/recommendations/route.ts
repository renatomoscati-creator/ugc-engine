import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const personaId = Number(req.nextUrl.searchParams.get("personaId") ?? "1");
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
    .where(eq(recommendations.personaId, personaId))
    .all();

  return NextResponse.json(rows);
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const db = getDb();
  db.delete(recommendations).where(eq(recommendations.id, id)).run();
  return NextResponse.json({ deleted: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    type: string;
    title: string;
    body: string;
    confidence?: boolean;
    personaId?: number;
  };

  if (!body.type || !body.title || !body.body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .insert(recommendations)
    .values({
      personaId: body.personaId ?? 1,
      type: body.type,
      title: body.title,
      content: body.body,
      actionable: body.confidence ?? true,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
