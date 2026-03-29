import type { MetricSnapshot } from "../types";

export async function fetchYouTubeMetrics(post: {
  platformPostId: string;
  accountId: number;
}): Promise<MetricSnapshot> {
  console.log("[youtube] fetching youtube metrics (stub)", post.platformPostId);
  return {
    postId: post.accountId,
    platform: "youtube",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    watchTime: 0,
    fetchedAt: new Date().toISOString(),
  };
}
