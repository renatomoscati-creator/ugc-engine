import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { redisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES } from "@/lib/queue/producers";

const scriptGenQueue = new Queue(QUEUE_NAMES.SCRIPT_GEN, { connection: redisConnection });

export async function POST(req: Request) {
  const { jobIds } = (await req.json()) as { jobIds: string[] };

  const results = await Promise.all(
    jobIds.map(async (id) => {
      const job = await scriptGenQueue.getJob(id);
      if (!job) return { id, state: "unknown" as const };
      const state = await job.getState();
      return { id, state, failedReason: job.failedReason ?? null };
    })
  );

  const counts = {
    total: results.length,
    completed: results.filter((r) => r.state === "completed").length,
    failed: results.filter((r) => r.state === "failed").length,
    active: results.filter((r) => r.state === "active").length,
    waiting: results.filter((r) => r.state === "waiting" || r.state === "delayed").length,
  };

  const allDone = counts.completed + counts.failed === counts.total;
  const anyFailed = counts.failed > 0;

  return NextResponse.json({ ...counts, allDone, anyFailed, jobs: results });
}
