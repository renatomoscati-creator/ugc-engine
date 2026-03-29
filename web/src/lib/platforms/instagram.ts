import type { PlatformAdapter, PublishPayload, PublishResult } from "./types";

export class InstagramAdapter implements PlatformAdapter {
  platform = "instagram";

  async publish(post: PublishPayload): Promise<PublishResult> {
    console.log(`[InstagramAdapter] publish called for accountId=${post.accountId}`);
    return { success: false, error: "not_implemented" };
  }

  async validateCredentials(accountId: number): Promise<boolean> {
    console.log(`[InstagramAdapter] validateCredentials called for accountId=${accountId}`);
    return false;
  }
}
