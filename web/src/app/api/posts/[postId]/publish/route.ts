import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schedules, posts, accounts, platforms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const postIdNum = parseInt(postId);

  const { accountId, platform } = await req.json() as {
    accountId: number;
    platform: string;
  };

  if (!accountId || !platform) {
    return NextResponse.json(
      { error: "accountId and platform are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Verify post exists
  const post = db
    .select()
    .from(posts)
    .where(eq(posts.id, postIdNum))
    .get();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Verify account exists and matches the requested platform
  const account = db
    .select({ id: accounts.id, platformId: accounts.platformId })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const platformRow = db
    .select({ id: platforms.id, name: platforms.name })
    .from(platforms)
    .where(eq(platforms.id, account.platformId))
    .get();

  if (!platformRow || platformRow.name !== platform) {
    return NextResponse.json(
      { error: `Account does not belong to platform '${platform}'` },
      { status: 422 }
    );
  }

  // Create schedule with scheduledAt = now
  const now = new Date().toISOString();

  const schedule = db
    .insert(schedules)
    .values({
      postId: postIdNum,
      accountId,
      scheduledAt: now,
      status: "scheduled",
    })
    .returning()
    .get();

  // Enqueue immediately to POST_DISPATCHER
  await enqueue(QUEUE_NAMES.POST_DISPATCHER, "dispatch-post", {
    scheduleId: schedule.id,
  });

  console.log(
    `[manual-publish] Enqueued scheduleId=${schedule.id} for postId=${postIdNum}`
  );

  return NextResponse.json({ scheduleId: schedule.id, status: "queued" }, { status: 201 });
}
