import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { productionJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const job = db.select().from(productionJobs).where(eq(productionJobs.id, parseInt(id))).get();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const queueMap: Record<string, string> = {
    tts: QUEUE_NAMES.TTS,
    animation: QUEUE_NAMES.ANIMATION,
    composition: QUEUE_NAMES.COMPOSITION,
    encode: QUEUE_NAMES.ENCODE,
  };

  const queue = queueMap[job.stage];
  if (!queue) return NextResponse.json({ error: "Unknown stage" }, { status: 400 });

  await enqueue(queue, `retry-${job.stage}`, { scriptId: job.scriptId, personaId: 1 });
  db.update(productionJobs).set({ status: "pending", errorMessage: null }).where(eq(productionJobs.id, job.id)).run();

  return NextResponse.json({ ok: true });
}
