import { startIdeationWorker } from "./ideation-worker";
import { startScriptWorker } from "./script-worker";
import { startQAWorker } from "./qa-worker";
import { startScheduleWorker } from "./schedule-worker";
import { registerCronJobs } from "@/lib/cron";

export async function startAllWorkers() {
  console.log("[workers] Starting all Node-side BullMQ workers...");

  startIdeationWorker();
  startScriptWorker();
  startQAWorker();
  startScheduleWorker();

  await registerCronJobs(1);

  console.log("[workers] All workers started");
}
