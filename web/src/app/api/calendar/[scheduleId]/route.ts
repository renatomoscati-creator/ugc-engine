import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schedules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const id = parseInt(scheduleId);
  const db = getDb();

  const existing = db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.status, "scheduled")))
    .get();

  if (!existing) {
    return NextResponse.json(
      { error: "Schedule not found or not in 'scheduled' status" },
      { status: 404 }
    );
  }

  db.delete(schedules).where(eq(schedules.id, id)).run();

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const id = parseInt(scheduleId);
  const { scheduledAt } = await req.json();

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "scheduledAt is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const existing = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const updated = db
    .update(schedules)
    .set({ scheduledAt })
    .where(eq(schedules.id, id))
    .returning()
    .get();

  return NextResponse.json(updated);
}
