import { getDb } from "@/lib/db";
import { schedules } from "@/lib/db/schema";
import { eq, lte, and } from "drizzle-orm";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function dispatchDueSchedules(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const due = db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.status, "scheduled"),
        lte(schedules.scheduledAt, now)
      )
    )
    .all();

  if (due.length === 0) {
    console.log("[cron-dispatcher] No due schedules found");
    return;
  }

  console.log(`[cron-dispatcher] Dispatching ${due.length} due schedule(s)`);

  for (const schedule of due) {
    await enqueue(
      QUEUE_NAMES.POST_DISPATCHER,
      "dispatch-post",
      { scheduleId: schedule.id }
    );
    console.log(`[cron-dispatcher] Enqueued scheduleId=${schedule.id}`);
  }
}
