import { getDb } from "@/lib/db";
import { posts, scripts, contentPillars, productionJobs, performanceSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface TopLineMetrics {
  totalPosts: number;
  totalViews: number;
  weeklyPostCount: number;
  followerGrowth: number;
}

export interface PillarMetric {
  pillarName: string;
  postCount: number;
  avgViews: number;
}

export interface HookMetric {
  hookType: string;
  count: number;
  avgViews: number;
}

export interface PipelineHealth {
  queuedCount: number;
  failedCount: number;
  completedCount: number;
  avgJobDurationMs: number;
}

export async function getTopLineMetrics(personaId: number): Promise<TopLineMetrics> {
  const db = getDb();

  const allPosts = db
    .select({ id: posts.id, status: posts.status, createdAt: posts.createdAt })
    .from(posts)
    .all();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weeklyPosts = allPosts.filter(
    (p) => p.status === "posted" && new Date(p.createdAt) >= sevenDaysAgo
  );

  const snapshots = db.select({ views: performanceSnapshots.views }).from(performanceSnapshots).all();
  const totalViews = snapshots.reduce((sum, s) => sum + (s.views ?? 0), 0);

  return {
    totalPosts: allPosts.filter((p) => p.status === "posted").length,
    totalViews,
    weeklyPostCount: weeklyPosts.length,
    followerGrowth: 0, // stub until platform APIs connected
  };
}

export async function getPillarBreakdown(personaId: number): Promise<PillarMetric[]> {
  const db = getDb();

  const pillars = db
    .select({ id: contentPillars.id, name: contentPillars.name })
    .from(contentPillars)
    .where(eq(contentPillars.personaId, personaId))
    .all();

  return pillars.map((pillar) => {
    const pillarScripts = db
      .select({ id: scripts.id })
      .from(scripts)
      .where(eq(scripts.pillarId, pillar.id))
      .all();

    return {
      pillarName: pillar.name,
      postCount: pillarScripts.length,
      avgViews: 0, // stub until snapshots have data
    };
  });
}

export async function getHookPerformance(personaId: number): Promise<HookMetric[]> {
  const db = getDb();

  const allPosts = db
    .select({ hookType: posts.hookType })
    .from(posts)
    .all();

  const byType = new Map<string, number>();
  for (const post of allPosts) {
    const key = post.hookType ?? "unknown";
    byType.set(key, (byType.get(key) ?? 0) + 1);
  }

  return Array.from(byType.entries()).map(([hookType, cnt]) => ({
    hookType,
    count: cnt,
    avgViews: 0,
  }));
}

export async function getPipelineHealth(personaId: number): Promise<PipelineHealth> {
  const db = getDb();

  const jobs = db.select({ status: productionJobs.status, durationMs: productionJobs.durationMs }).from(productionJobs).all();

  const queued = jobs.filter((j) => j.status === "pending" || j.status === "running").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const durations = jobs.filter((j) => j.durationMs != null).map((j) => j.durationMs!);
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    queuedCount: queued,
    failedCount: failed,
    completedCount: completed,
    avgJobDurationMs: Math.round(avg),
  };
}
