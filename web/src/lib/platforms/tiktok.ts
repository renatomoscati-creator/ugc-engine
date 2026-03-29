import type { PlatformAdapter, PublishPayload, PublishResult } from "./types";

export class TikTokAdapter implements PlatformAdapter {
  platform = "tiktok";

  async publish(post: PublishPayload): Promise<PublishResult> {
    console.log(`[TikTokAdapter] publish called for accountId=${post.accountId}`);
    return { success: false, error: "not_implemented" };
  }

  async validateCredentials(accountId: number): Promise<boolean> {
    console.log(`[TikTokAdapter] validateCredentials called for accountId=${accountId}`);
    return false;
  }
}
