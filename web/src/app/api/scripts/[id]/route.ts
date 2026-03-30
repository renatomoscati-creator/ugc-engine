import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const script = db.select().from(scripts).where(eq(scripts.id, parseInt(id))).get();
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(script);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await req.json();
  const db = getDb();
  const scriptId = parseInt(id);

  if (action === "approve") {
    db.update(scripts).set({ status: "approved_for_production" }).where(eq(scripts.id, scriptId)).run();
    return NextResponse.json({ ok: true, status: "approved_for_production" });
  }

  if (action === "reject") {
    db.update(scripts).set({ status: "rejected" }).where(eq(scripts.id, scriptId)).run();
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action === "restore") {
    db.update(scripts).set({ status: "generated" }).where(eq(scripts.id, scriptId)).run();
    return NextResponse.json({ ok: true, status: "generated" });
  }

  if (action === "send_to_production") {
    const script = db.select().from(scripts).where(eq(scripts.id, scriptId)).get();
    if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });
    db.update(scripts).set({ status: "in_production" }).where(eq(scripts.id, scriptId)).run();
    await enqueue(QUEUE_NAMES.TTS, "tts", { scriptId, personaId: script.personaId });
    return NextResponse.json({ ok: true, status: "in_production" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
