import type { MetricSnapshot } from "../types";

export async function fetchTikTokMetrics(post: {
  platformPostId: string;
  accountId: number;
}): Promise<MetricSnapshot> {
  console.log("[tiktok] fetching tiktok metrics (stub)", post.platformPostId);
  return {
    postId: post.accountId,
    platform: "tiktok",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    watchTime: 0,
    fetchedAt: new Date().toISOString(),
  };
}
