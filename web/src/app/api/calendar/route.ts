import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schedules, posts, accounts, platforms } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const db = getDb();

  const rows = db
    .select({
      scheduleId: schedules.id,
      postId: schedules.postId,
      accountId: schedules.accountId,
      scheduledAt: schedules.scheduledAt,
      status: schedules.status,
      title: posts.caption,
      platform: platforms.name,
    })
    .from(schedules)
    .leftJoin(posts, eq(schedules.postId, posts.id))
    .leftJoin(accounts, eq(schedules.accountId, accounts.id))
    .leftJoin(platforms, eq(accounts.platformId, platforms.id))
    .where(
      and(
        start ? gte(schedules.scheduledAt, start) : undefined,
        end ? lte(schedules.scheduledAt, end) : undefined
      )
    )
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { postId, accountId, scheduledAt } = body as {
    postId: number;
    accountId: number;
    scheduledAt: string;
  };

  if (!postId || !accountId || !scheduledAt) {
    return NextResponse.json(
      { error: "postId, accountId, and scheduledAt are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Frequency cap check: count schedules for this account today
  const day = scheduledAt.slice(0, 10); // YYYY-MM-DD
  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const cap = account.frequencyCap ?? 3;
  const countRow = db
    .select({ count: sql<number>`count(*)` })
    .from(schedules)
    .where(
      and(
        eq(schedules.accountId, accountId),
        gte(schedules.scheduledAt, `${day}T00:00:00.000Z`),
        lte(schedules.scheduledAt, `${day}T23:59:59.999Z`)
      )
    )
    .get();

  const todayCount = countRow?.count ?? 0;
  if (todayCount >= cap) {
    return NextResponse.json(
      { error: `Frequency cap of ${cap} posts/day exceeded for this account` },
      { status: 422 }
    );
  }

  const result = db
    .insert(schedules)
    .values({ postId, accountId, scheduledAt, status: "scheduled" })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
