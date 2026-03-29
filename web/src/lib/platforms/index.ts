import type { PlatformAdapter } from "./types";
import { TikTokAdapter } from "./tiktok";
import { InstagramAdapter } from "./instagram";
import { YouTubeAdapter } from "./youtube";

export type { PlatformAdapter, PublishPayload, PublishResult } from "./types";

const adapters: Record<string, () => PlatformAdapter> = {
  tiktok: () => new TikTokAdapter(),
  instagram: () => new InstagramAdapter(),
  youtube: () => new YouTubeAdapter(),
};

export function getAdapter(platform: string): PlatformAdapter {
  const factory = adapters[platform];
  if (!factory) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return factory();
}
