import { Queue } from "bullmq";
import { redisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { personas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function registerCronJobs(personaId: number) {
  const db = getDb();
  const persona = db
    .select({ automationConfig: personas.automationConfig })
    .from(personas)
    .where(eq(personas.id, personaId))
    .get();

  if (!persona) return;

  const config = persona.automationConfig
    ? JSON.parse(persona.automationConfig)
    : {};

  const ideationCron = config.ideation?.cron ?? "0 6 * * *";
  const retroCron = "0 9 * * 1";

  const ideationQueue = new Queue(QUEUE_NAMES.IDEATION, { connection: redisConnection });
  const postQueue = new Queue(QUEUE_NAMES.POST, { connection: redisConnection });
  const performanceQueue = new Queue(QUEUE_NAMES.PERFORMANCE_INGEST, { connection: redisConnection });
  const retroQueue = new Queue(QUEUE_NAMES.RETROSPECTIVE, { connection: redisConnection });

  await ideationQueue.upsertJobScheduler(
    `daily-batch-persona-${personaId}`,
    { pattern: ideationCron },
    { name: "daily-batch", data: { personaId, count: config.ideation?.batch_size ?? 10 } }
  );

  await postQueue.upsertJobScheduler(
    `post-dispatcher-persona-${personaId}`,
    { pattern: "*/15 * * * *" },
    { name: "post-dispatcher", data: { personaId } }
  );

  await performanceQueue.upsertJobScheduler(
    `perf-ingest-persona-${personaId}`,
    { pattern: config.performance_ingest?.cron ?? "0 */6 * * *" },
    { name: "performance-ingest", data: { personaId } }
  );

  await retroQueue.upsertJobScheduler(
    `weekly-retro-persona-${personaId}`,
    { pattern: retroCron },
    { name: "weekly-retrospective", data: { personaId } }
  );

  console.log(`[cron] Registered cron jobs for persona ${personaId}`);
}
