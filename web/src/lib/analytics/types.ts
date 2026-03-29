export interface MetricSnapshot {
  postId: number;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime?: number; // seconds
  fetchedAt: string; // ISO
}
