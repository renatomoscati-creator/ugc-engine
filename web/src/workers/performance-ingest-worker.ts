import { Worker, Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { redisConnection } from "@/lib/queue/connection";
import { getDb } from "@/lib/db";
import { posts, accounts, platforms, performanceSnapshots } from "@/lib/db/schema";
import { isNotNull, eq } from "drizzle-orm";
import { getMetricsFetcher } from "@/lib/analytics/fetchers";

interface PerformanceIngestJobData {
  personaId?: number;
}

export function startPerformanceIngestWorker() {
  const worker = new Worker<PerformanceIngestJobData>(
    QUEUE_NAMES.PERFORMANCE_INGEST,
    async (job: Job<PerformanceIngestJobData>) => {
      console.log(`[performance-ingest-worker] START jobId=${job.id}`);
      const db = getDb();

      // Query all posted posts (platformPostId is not null)
      const postedPosts = db
        .select({
          postId: posts.id,
          accountId: posts.accountId,
          platformPostId: posts.platformPostId,
          platformName: platforms.name,
        })
        .from(posts)
        .innerJoin(accounts, eq(posts.accountId, accounts.id))
        .innerJoin(platforms, eq(accounts.platformId, platforms.id))
        .where(isNotNull(posts.platformPostId))
        .all();

      console.log(`[performance-ingest-worker] Found ${postedPosts.length} posted posts`);

      let snapshotCount = 0;
      for (const post of postedPosts) {
        try {
          const fetcher = getMetricsFetcher(post.platformName);
          const metrics = await fetcher({
            platformPostId: post.platformPostId!,
            accountId: post.accountId,
          });

          const snapshotAt = new Date().toISOString();

          db.insert(performanceSnapshots)
            .values({
              postId: post.postId,
              accountId: post.accountId,
              views: metrics.views,
              likes: metrics.likes,
              comments: metrics.comments,
              shares: metrics.shares,
              watchTimeSeconds: metrics.watchTime ?? null,
              snapshotAt,
            })
            .run();

          snapshotCount++;
        } catch (err) {
          console.error(
            `[performance-ingest-worker] Failed to ingest postId=${post.postId}`,
            err
          );
        }
      }

      console.log(`[performance-ingest-worker] DONE snapshots=${snapshotCount}`);
      return { snapshotCount };
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[performance-ingest-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
