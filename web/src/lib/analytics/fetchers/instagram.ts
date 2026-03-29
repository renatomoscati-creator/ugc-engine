import type { MetricSnapshot } from "../types";

export async function fetchInstagramMetrics(post: {
  platformPostId: string;
  accountId: number;
}): Promise<MetricSnapshot> {
  console.log("[instagram] fetching instagram metrics (stub)", post.platformPostId);
  return {
    postId: post.accountId,
    platform: "instagram",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    watchTime: 0,
    fetchedAt: new Date().toISOString(),
  };
}
