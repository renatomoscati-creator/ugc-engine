import { Worker, Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue/producers";
import { redisConnection } from "@/lib/queue/connection";
import { getDb } from "@/lib/db";
import { recommendations, systemLogs } from "@/lib/db/schema";
import { computeWeeklyStats } from "@/lib/analytics/aggregations";
import { generateJSON } from "@/lib/ollama/client";

interface RetrospectiveJobData {
  personaId: number;
}

interface Recommendation {
  type: string;
  title: string;
  body: string;
  confidence: number;
}

interface RetrospectiveResult {
  recommendations: Recommendation[];
}

export function startRetrospectiveWorker() {
  const worker = new Worker<RetrospectiveJobData>(
    QUEUE_NAMES.RETROSPECTIVE,
    async (job: Job<RetrospectiveJobData>) => {
      console.log(`[retrospective-worker] START jobId=${job.id}`);
      const db = getDb();
      const { personaId } = job.data;

      // Get the start of the past week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
      const daysToLastMonday = ((dayOfWeek + 6) % 7) + 7; // go back to last Monday
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - daysToLastMonday);
      lastMonday.setHours(0, 0, 0, 0);
      const weekStart = lastMonday.toISOString().slice(0, 10);

      // Step 1: Compute weekly stats
      const stats = await computeWeeklyStats(personaId, weekStart);

      // Step 2: Build prompt
      const prompt = `You are a social media growth analyst for a virtual creator.

Here are the performance stats for the week starting ${weekStart}:
- Total posts published: ${stats.totalPosts}
- Total views: ${stats.totalViews}
- Total engagement (likes + comments + shares): ${stats.totalEngagement}
- Average watch time: ${stats.avgWatchTime != null ? `${stats.avgWatchTime.toFixed(1)}s` : "N/A"}
- Best performing post ID: ${stats.bestPostId ?? "N/A"} (${stats.bestPostViews} views)
- Best performing content pillar: ${stats.bestPillarName ?? "N/A"} (avg engagement: ${stats.bestPillarAvgEngagement.toFixed(1)})

Based on these stats, generate 3–5 actionable recommendations to improve performance next week.

Respond ONLY with valid JSON in this exact format:
\`\`\`json
{
  "recommendations": [
    {
      "type": "content_strategy|posting_time|hook|format|pillar",
      "title": "Short title (max 80 chars)",
      "body": "Detailed actionable recommendation in 2–4 sentences.",
      "confidence": 0.0
    }
  ]
}
\`\`\`

Confidence is a float from 0.0 (low confidence) to 1.0 (high confidence).`;

      // Step 3: Call Ollama
      const result = await generateJSON<RetrospectiveResult>(prompt, {
        temperature: 0.5,
        maxTokens: 1024,
      });

      // Step 4: Insert recommendations
      const insertedIds: number[] = [];
      for (const rec of result.recommendations) {
        const inserted = db
          .insert(recommendations)
          .values({
            personaId,
            type: "weekly_retro",
            title: rec.title,
            content: rec.body,
            actionable: true,
            isRead: false,
          })
          .returning({ id: recommendations.id })
          .get();
        if (inserted) insertedIds.push(inserted.id);
      }

      // Step 5: Log completion
      db.insert(systemLogs)
        .values({
          level: "info",
          source: QUEUE_NAMES.RETROSPECTIVE,
          message: `Weekly retro complete for personaId=${personaId}, week=${weekStart}`,
          metadata: JSON.stringify({
            personaId,
            weekStart,
            recommendationCount: insertedIds.length,
            insertedIds,
            stats,
          }),
        })
        .run();

      console.log(
        `[retrospective-worker] DONE personaId=${personaId} week=${weekStart} recommendations=${insertedIds.length}`
      );
      return { weekStart, recommendationCount: insertedIds.length };
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[retrospective-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
