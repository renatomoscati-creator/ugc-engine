import type { PlatformAdapter, PublishPayload, PublishResult } from "./types";

export class YouTubeAdapter implements PlatformAdapter {
  platform = "youtube";

  async publish(post: PublishPayload): Promise<PublishResult> {
    console.log(`[YouTubeAdapter] publish called for accountId=${post.accountId}`);
    return { success: false, error: "not_implemented" };
  }

  async validateCredentials(accountId: number): Promise<boolean> {
    console.log(`[YouTubeAdapter] validateCredentials called for accountId=${accountId}`);
    return false;
  }
}
