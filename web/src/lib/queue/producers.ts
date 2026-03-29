import { Queue } from "bullmq";
import { redisConnection } from "./connection";

const queues = new Map<string, Queue>();

function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: redisConnection }));
  }
  return queues.get(name)!;
}

export const QUEUE_NAMES = {
  IDEATION: "ideation",
  SCRIPT_GEN: "script-gen",
  TTS: "tts",
  ANIMATION: "animation",
  COMPOSITION: "composition",
  ENCODE: "encode",
  QA: "qa",
  SCHEDULE: "schedule",
  POST: "post",
  PERFORMANCE_INGEST: "performance-ingest",
  RETROSPECTIVE: "retrospective",
} as const;

export async function enqueue(
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
  opts?: { delay?: number; attempts?: number }
) {
  const queue = getQueue(queueName);
  return queue.add(jobName, data, {
    attempts: opts?.attempts ?? 3,
    backoff: { type: "exponential", delay: 5000 },
    delay: opts?.delay,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });
}
