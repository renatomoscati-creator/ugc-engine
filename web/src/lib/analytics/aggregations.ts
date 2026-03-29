import { getDb } from "@/lib/db";
import {
  posts,
  performanceSnapshots,
  accounts,
  scripts,
  contentPillars,
} from "@/lib/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";

export interface WeeklyStats {
  weekStart: string;
  totalPosts: number;
  totalViews: number;
  totalEngagement: number;
  avgWatchTime: number | null;
  bestPostId: number | null;
  bestPostViews: number;
  bestPillarName: string | null;
  bestPillarAvgEngagement: number;
}

export interface HookStat {
  hookType: string;
  postCount: number;
  avgViews: number;
  avgEngagementRate: number;
}

export async function computeWeeklyStats(
  personaId: number,
  weekStart: string
): Promise<WeeklyStats> {
  const db = getDb();

  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  const weekStartISO = weekStartDate.toISOString();
  const weekEndISO = weekEndDate.toISOString();

  // Get all accounts for this persona
  const personaAccounts = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.personaId, personaId))
    .all();

  const accountIds = personaAccounts.map((a) => a.id);
  if (!accountIds.length) {
    return {
      weekStart,
      totalPosts: 0,
      totalViews: 0,
      totalEngagement: 0,
      avgWatchTime: null,
      bestPostId: null,
      bestPostViews: 0,
      bestPillarName: null,
      bestPillarAvgEngagement: 0,
    };
  }

  // Get all posted posts in the week window
  const weekPosts = db
    .select({
      id: posts.id,
      accountId: posts.accountId,
      scriptId: posts.scriptId,
      hookType: posts.hookType,
      postedAt: posts.postedAt,
    })
    .from(posts)
    .where(
      and(
        isNotNull(posts.postedAt),
        gte(posts.postedAt, weekStartISO),
        lte(posts.postedAt, weekEndISO)
      )
    )
    .all()
    .filter((p) => accountIds.includes(p.accountId));

  if (!weekPosts.length) {
    return {
      weekStart,
      totalPosts: 0,
      totalViews: 0,
      totalEngagement: 0,
      avgWatchTime: null,
      bestPostId: null,
      bestPostViews: 0,
      bestPillarName: null,
      bestPillarAvgEngagement: 0,
    };
  }

  const postIds = weekPosts.map((p) => p.id);

  // Gather latest snapshots for each post
  const allSnapshots = db
    .select()
    .from(performanceSnapshots)
    .all()
    .filter((s) => postIds.includes(s.postId));

  // Aggregate per post: take the latest snapshot
  const latestByPost = new Map<number, (typeof allSnapshots)[number]>();
  for (const snap of allSnapshots) {
    const existing = latestByPost.get(snap.postId);
    if (!existing || snap.snapshotAt > existing.snapshotAt) {
      latestByPost.set(snap.postId, snap);
    }
  }

  let totalViews = 0;
  let totalEngagement = 0;
  let watchTimeSum = 0;
  let watchTimeCount = 0;
  let bestPostId: number | null = null;
  let bestPostViews = 0;

  for (const [postId, snap] of latestByPost) {
    const views = snap.views ?? 0;
    const engagement = (snap.likes ?? 0) + (snap.comments ?? 0) + (snap.shares ?? 0);
    totalViews += views;
    totalEngagement += engagement;

    if (snap.watchTimeSeconds != null) {
      watchTimeSum += snap.watchTimeSeconds;
      watchTimeCount++;
    }

    if (views > bestPostViews) {
      bestPostViews = views;
      bestPostId = postId;
    }
  }

  // Best performing content pillar by avg engagement
  const pillarEngagement = new Map<number, { sum: number; count: number; name: string }>();

  for (const post of weekPosts) {
    if (!post.scriptId) continue;
    const script = db
      .select({ pillarId: scripts.pillarId })
      .from(scripts)
      .where(eq(scripts.id, post.scriptId))
      .get();
    if (!script?.pillarId) continue;

    const snap = latestByPost.get(post.id);
    const engagement = snap
      ? (snap.likes ?? 0) + (snap.comments ?? 0) + (snap.shares ?? 0)
      : 0;

    const existing = pillarEngagement.get(script.pillarId);
    if (existing) {
      existing.sum += engagement;
      existing.count++;
    } else {
      const pillar = db
        .select({ name: contentPillars.name })
        .from(contentPillars)
        .where(eq(contentPillars.id, script.pillarId))
        .get();
      pillarEngagement.set(script.pillarId, {
        sum: engagement,
        count: 1,
        name: pillar?.name ?? "Unknown",
      });
    }
  }

  let bestPillarName: string | null = null;
  let bestPillarAvgEngagement = 0;
  for (const [, data] of pillarEngagement) {
    const avg = data.count > 0 ? data.sum / data.count : 0;
    if (avg > bestPillarAvgEngagement) {
      bestPillarAvgEngagement = avg;
      bestPillarName = data.name;
    }
  }

  return {
    weekStart,
    totalPosts: weekPosts.length,
    totalViews,
    totalEngagement,
    avgWatchTime: watchTimeCount > 0 ? watchTimeSum / watchTimeCount : null,
    bestPostId,
    bestPostViews,
    bestPillarName,
    bestPillarAvgEngagement,
  };
}

export async function computeHookEffectiveness(personaId: number): Promise<HookStat[]> {
  const db = getDb();

  const personaAccounts = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.personaId, personaId))
    .all();

  const accountIds = personaAccounts.map((a) => a.id);
  if (!accountIds.length) return [];

  const allPosts = db
    .select({
      id: posts.id,
      accountId: posts.accountId,
      hookType: posts.hookType,
    })
    .from(posts)
    .where(isNotNull(posts.postedAt))
    .all()
    .filter((p) => accountIds.includes(p.accountId));

  const allSnapshots = db.select().from(performanceSnapshots).all();

  // Latest snapshot per post
  const latestByPost = new Map<number, (typeof allSnapshots)[number]>();
  for (const snap of allSnapshots) {
    const existing = latestByPost.get(snap.postId);
    if (!existing || snap.snapshotAt > existing.snapshotAt) {
      latestByPost.set(snap.postId, snap);
    }
  }

  // Group by hookType
  const byHook = new Map<
    string,
    { viewsSum: number; engagementSum: number; count: number }
  >();

  for (const post of allPosts) {
    const key = post.hookType ?? "unknown";
    const snap = latestByPost.get(post.id);
    const views = snap?.views ?? 0;
    const engagement =
      (snap?.likes ?? 0) + (snap?.comments ?? 0) + (snap?.shares ?? 0);

    const existing = byHook.get(key);
    if (existing) {
      existing.viewsSum += views;
      existing.engagementSum += engagement;
      existing.count++;
    } else {
      byHook.set(key, { viewsSum: views, engagementSum: engagement, count: 1 });
    }
  }

  const stats: HookStat[] = Array.from(byHook.entries()).map(([hookType, data]) => {
    const avgViews = data.count > 0 ? data.viewsSum / data.count : 0;
    const avgEngagementRate =
      data.viewsSum > 0 ? data.engagementSum / data.viewsSum : 0;
    return { hookType, postCount: data.count, avgViews, avgEngagementRate };
  });

  stats.sort((a, b) => b.avgViews - a.avgViews);
  return stats;
}
