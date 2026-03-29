import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const personaId = parseInt(searchParams.get("personaId") ?? "1");
  const status = searchParams.get("status");

  const db = getDb();
  const result = db.select().from(ideas).where(eq(ideas.personaId, personaId)).all();
  const filtered = status ? result.filter((i) => i.status === status) : result;

  return NextResponse.json(filtered);
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  const db = getDb();
  db.update(ideas).set({ status }).where(eq(ideas.id, id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = getDb();
  db.delete(ideas).where(eq(ideas.id, id)).run();
  return NextResponse.json({ ok: true });
}
