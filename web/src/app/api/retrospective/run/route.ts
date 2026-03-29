import { NextResponse } from "next/server";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function POST() {
  await enqueue(QUEUE_NAMES.RETROSPECTIVE, "run-retrospective", { personaId: 1 });
  return NextResponse.json({ queued: true });
}
