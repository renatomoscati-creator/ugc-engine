import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { personas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const persona = db
    .select()
    .from(personas)
    .where(eq(personas.id, parseInt(id)))
    .get();

  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(persona);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const personaId = parseInt(id);

  const body = await req.json() as {
    name?: string;
    niche?: string;
    voiceTone?: string;
    targetAudience?: string;
    bannedClaims?: string[];
  };

  const update: Partial<{
    name: string;
    niche: string;
    voiceTone: string;
    bannedClaims: string;
  }> = {};

  if (body.name !== undefined) update.name = body.name;
  if (body.niche !== undefined) update.niche = body.niche;
  if (body.voiceTone !== undefined) update.voiceTone = body.voiceTone;
  if (body.bannedClaims !== undefined)
    update.bannedClaims = JSON.stringify(body.bannedClaims);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  db.update(personas).set(update).where(eq(personas.id, personaId)).run();

  const updated = db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .get();

  return NextResponse.json(updated);
}
