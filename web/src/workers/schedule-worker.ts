import { Worker, Job } from "bullmq";
import { redisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { scripts, schedules, assets, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAuto } from "@/lib/automation";

interface ScheduleJobData {
  scriptId: number;
  personaId: number;
  scheduledAt?: string;
}

function nextSlot(): string {
  const now = new Date();
  const slots = [9, 18];
  for (const hour of slots) {
    const candidate = new Date(now);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate > now) return candidate.toISOString();
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString();
}

export function startScheduleWorker() {
  const worker = new Worker<ScheduleJobData>(
    QUEUE_NAMES.SCHEDULE,
    async (job: Job<ScheduleJobData>) => {
      console.log(`[schedule-worker] START jobId=${job.id}`);
      const { scriptId, personaId, scheduledAt } = job.data;
      const db = getDb();

      if (!isAuto(personaId, "scheduling")) {
        console.log(`[schedule-worker] MANUAL scheduling required for scriptId=${scriptId}`);
        return;
      }

      const asset = db.select().from(assets).where(eq(assets.scriptId, scriptId)).get();
      if (!asset) throw new Error(`No asset found for scriptId=${scriptId}`);

      const account = db.select().from(accounts).where(eq(accounts.personaId, personaId)).get();
      if (!account) throw new Error(`No account found for personaId=${personaId}`);

      const slot = scheduledAt ?? nextSlot();

      db.insert(schedules).values({
        accountId: account.id,
        scheduledAt: slot,
        status: "pending",
      }).run();

      db.update(scripts).set({ status: "scheduled" }).where(eq(scripts.id, scriptId)).run();
      console.log(`[schedule-worker] DONE scriptId=${scriptId} slot=${slot}`);
    },
    { connection: redisConnection, concurrency: 10 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[schedule-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
