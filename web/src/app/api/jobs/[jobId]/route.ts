import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { redisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES } from "@/lib/queue/producers";

const ideationQueue = new Queue(QUEUE_NAMES.IDEATION, { connection: redisConnection });
const scriptGenQueue = new Queue(QUEUE_NAMES.SCRIPT_GEN, { connection: redisConnection });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  let job = await ideationQueue.getJob(jobId);
  if (!job) {
    job = await scriptGenQueue.getJob(jobId);
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const state = await job.getState();

  return NextResponse.json({
    id: job.id,
    state,
    progress: job.progress,
    result: job.returnvalue ?? null,
    failedReason: job.failedReason ?? null,
  });
}
