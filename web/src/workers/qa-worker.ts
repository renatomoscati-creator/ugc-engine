import { Worker, Job } from "bullmq";
import { redisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES, enqueue } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAuto } from "@/lib/automation";

interface QAJobData {
  scriptId: number;
  personaId: number;
}

export function startQAWorker() {
  const worker = new Worker<QAJobData>(
    QUEUE_NAMES.QA,
    async (job: Job<QAJobData>) => {
      console.log(`[qa-worker] START jobId=${job.id}`);
      const { scriptId, personaId } = job.data;
      const db = getDb();

      if (isAuto(personaId, "qa_review")) {
        db.update(scripts).set({ status: "rendered" }).where(eq(scripts.id, scriptId)).run();
        await enqueue(QUEUE_NAMES.SCHEDULE, "schedule", { scriptId, personaId });
        console.log(`[qa-worker] AUTO approved scriptId=${scriptId}`);
      } else {
        db.update(scripts).set({ status: "rendered" }).where(eq(scripts.id, scriptId)).run();
        console.log(`[qa-worker] MANUAL review needed scriptId=${scriptId}`);
      }
    },
    { connection: redisConnection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[qa-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
