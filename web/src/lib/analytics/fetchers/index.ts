import type { MetricSnapshot } from "../types";
import { fetchTikTokMetrics } from "./tiktok";
import { fetchInstagramMetrics } from "./instagram";
import { fetchYouTubeMetrics } from "./youtube";

type FetcherFn = (post: {
  platformPostId: string;
  accountId: number;
}) => Promise<MetricSnapshot>;

export function getMetricsFetcher(platform: string): FetcherFn {
  switch (platform.toLowerCase()) {
    case "tiktok":
      return fetchTikTokMetrics;
    case "instagram":
      return fetchInstagramMetrics;
    case "youtube":
      return fetchYouTubeMetrics;
    default:
      return async (post) => {
        console.warn(`[metrics] No fetcher for platform "${platform}", returning zeroed snapshot`);
        return {
          postId: post.accountId,
          platform,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          watchTime: 0,
          fetchedAt: new Date().toISOString(),
        };
      };
  }
}
