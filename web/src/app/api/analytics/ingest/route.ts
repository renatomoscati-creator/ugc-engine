import { NextResponse } from "next/server";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function POST(req: Request) {
  let personaId: number | undefined;
  try {
    const body = await req.json();
    personaId = body.personaId;
  } catch {
    // body is optional
  }

  await enqueue(QUEUE_NAMES.PERFORMANCE_INGEST, "ingest", { personaId: personaId ?? null });

  return NextResponse.json({ queued: true });
}
