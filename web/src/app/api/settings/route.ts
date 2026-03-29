import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = db.select().from(settings).all();
  const obj: Record<string, string> = {};
  for (const row of rows) {
    obj[row.key] = row.value;
  }
  return NextResponse.json(obj);
}

export async function POST(req: Request) {
  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();

  if (existing) {
    db.update(settings).set({ value: String(value) }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value: String(value) }).run();
  }

  return NextResponse.json({ ok: true });
}
