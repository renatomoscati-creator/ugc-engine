import { Worker, Job } from "bullmq";
import { redisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { schedules, posts, accounts, platforms, systemLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAdapter } from "@/lib/platforms";

interface PostDispatcherJobData {
  scheduleId: number;
}

export function startPostDispatcherWorker() {
  const worker = new Worker<PostDispatcherJobData>(
    QUEUE_NAMES.POST_DISPATCHER,
    async (job: Job<PostDispatcherJobData>) => {
      const { scheduleId } = job.data;
      console.log(`[post-dispatcher] START scheduleId=${scheduleId}`);

      const db = getDb();

      // 1. Fetch schedule → post → account → platform
      const schedule = db
        .select()
        .from(schedules)
        .where(eq(schedules.id, scheduleId))
        .get();

      if (!schedule) throw new Error(`Schedule ${scheduleId} not found`);

      if (!schedule.postId) throw new Error(`Schedule ${scheduleId} has no postId`);

      const post = db
        .select()
        .from(posts)
        .where(eq(posts.id, schedule.postId))
        .get();

      if (!post) throw new Error(`Post ${schedule.postId} not found`);

      const account = db
        .select()
        .from(accounts)
        .where(eq(accounts.id, schedule.accountId))
        .get();

      if (!account) throw new Error(`Account ${schedule.accountId} not found`);

      const platform = db
        .select()
        .from(platforms)
        .where(eq(platforms.id, account.platformId))
        .get();

      if (!platform) throw new Error(`Platform ${account.platformId} not found`);

      // 2. Get platform adapter
      const adapter = getAdapter(platform.name);

      // 3. Build publish payload — need the video path from the asset
      const { assets } = await import("@/lib/db/schema");
      const asset = db
        .select()
        .from(assets)
        .where(eq(assets.id, post.assetId))
        .get();

      if (!asset) throw new Error(`Asset ${post.assetId} not found`);

      const hashtags: string[] = post.hashtags
        ? JSON.parse(post.hashtags)
        : [];

      try {
        // 4. Publish
        const result = await adapter.publish({
          accountId: account.id,
          videoPath: asset.filePath,
          caption: post.caption ?? "",
          hashtags,
        });

        if (!result.success) {
          throw new Error(result.error ?? "Publish failed with no error message");
        }

        // 5a. On success: update schedule and post
        const now = new Date().toISOString();

        db.update(schedules)
          .set({ status: "posted" })
          .where(eq(schedules.id, scheduleId))
          .run();

        db.update(posts)
          .set({
            status: "posted",
            postedAt: now,
            platformPostId: result.externalId ?? null,
          })
          .where(eq(posts.id, post.id))
          .run();

        console.log(
          `[post-dispatcher] DONE scheduleId=${scheduleId} externalId=${result.externalId}`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        // 5b. On failure: update schedule status and log
        db.update(schedules)
          .set({ status: "failed" })
          .where(eq(schedules.id, scheduleId))
          .run();

        db.insert(systemLogs)
          .values({
            level: "error",
            source: QUEUE_NAMES.POST_DISPATCHER,
            message: `Failed to publish scheduleId=${scheduleId}: ${message}`,
            metadata: JSON.stringify({ scheduleId, postId: post.id }),
          })
          .run();

        console.error(`[post-dispatcher] FAIL scheduleId=${scheduleId}`, message);
        throw err; // re-throw so BullMQ marks the job as failed
      }
    },
    { connection: redisConnection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[post-dispatcher] JOB FAIL jobId=${job?.id}`,
      err.message
    );
  });

  return worker;
}
