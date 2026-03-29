export interface PlatformAdapter {
  platform: string;
  publish(post: PublishPayload): Promise<PublishResult>;
  validateCredentials(accountId: number): Promise<boolean>;
}

export interface PublishPayload {
  accountId: number;
  videoPath: string;
  caption: string;
  hashtags: string[];
}

export interface PublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
}
