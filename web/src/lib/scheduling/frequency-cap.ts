import { getDb } from "@/lib/db";
import { posts, accounts, platforms } from "@/lib/db/schema";
import { eq, and, like } from "drizzle-orm";

/**
 * Returns true if the account is under its daily frequency cap for the given platform and date.
 * Returns true (safe default) if platform config is missing.
 */
export async function checkFrequencyCap(
  accountId: number,
  platform: string,
  date: string // YYYY-MM-DD
): Promise<boolean> {
  const db = getDb();

  // Count posts for this account on this date (prefix match on scheduledAt)
  const existingPosts = db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.accountId, accountId),
        like(posts.scheduledAt, `${date}%`)
      )
    )
    .all();

  const postsToday = existingPosts.length;

  // Get platform config via join: accounts -> platforms
  const config = db
    .select()
    .from(accounts)
    .innerJoin(platforms, eq(accounts.platformId, platforms.id))
    .where(eq(accounts.id, accountId))
    .get() as
    | { frequencyCap: number | null; defaultFrequencyCap: number | null }
    | null
    | undefined;

  if (!config) {
    // Missing platform config — safe default: allow posting
    return true;
  }

  const cap =
    (config as { frequencyCap?: number | null }).frequencyCap ??
    (config as { defaultFrequencyCap?: number | null }).defaultFrequencyCap;

  if (cap == null) {
    return true;
  }

  return postsToday < cap;
}
