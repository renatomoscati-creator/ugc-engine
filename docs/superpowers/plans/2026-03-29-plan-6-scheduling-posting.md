# Plan 6: Scheduling & Posting — Calendar API, Frequency Caps, Platform Adapters, Post Dispatcher

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full scheduling and posting layer: calendar CRUD API routes, frequency cap enforcement, next-slot algorithm, a clean platform adapter interface with stub implementations for TikTok/Instagram/YouTube, a BullMQ post-dispatcher worker that runs every 15 minutes, and a manual publish endpoint. Platform credentials are NOT yet configured — all adapters return a structured "not configured" error until credentials are added in a future plan.

**Architecture:** Scheduling logic lives in `web/src/lib/scheduling/`. Posting logic lives in `web/src/lib/posting/`. The post-dispatcher worker is registered as a BullMQ repeatable job alongside the other workers in `web/src/workers/index.ts`. All posting flows through the adapter interface — no direct API calls outside of adapter files.

**Tech Stack:** Next.js 16 App Router, BullMQ, Drizzle ORM, SQLite (WAL mode)

**Prereqs:** Plans 1-4 complete (DB schema with `schedules`, `posts`, `platforms`, `system_logs` tables; BullMQ queue setup; workers/index.ts exists)

---

## File Map

- Create: `web/src/lib/scheduling/frequency-caps.ts` — Cap check logic
- Create: `web/src/lib/scheduling/frequency-caps.test.ts` — Unit tests
- Create: `web/src/lib/scheduling/next-slot.ts` — Next available slot algorithm
- Create: `web/src/lib/scheduling/next-slot.test.ts` — Unit tests
- Create: `web/src/lib/posting/adapter.ts` — PlatformAdapter interface and PostResult type
- Create: `web/src/lib/posting/adapters/tiktok.ts` — TikTok stub adapter
- Create: `web/src/lib/posting/adapters/instagram.ts` — Instagram stub adapter
- Create: `web/src/lib/posting/adapters/youtube.ts` — YouTube stub adapter
- Create: `web/src/lib/posting/adapters/index.ts` — Adapter registry
- Create: `web/src/workers/post-dispatcher.ts` — BullMQ repeatable posting worker
- Create: `web/src/app/api/schedule/route.ts` — GET + POST /api/schedule
- Create: `web/src/app/api/schedule/[id]/route.ts` — DELETE /api/schedule/[id]
- Create: `web/src/app/api/posts/[id]/publish/route.ts` — Manual publish trigger
- Modify: `web/src/workers/index.ts` — Register post-dispatcher repeatable job

---

## Task 1: Platform adapter interface and stub adapters

**Files:**
- Create: `web/src/lib/posting/adapter.ts`
- Create: `web/src/lib/posting/adapters/tiktok.ts`
- Create: `web/src/lib/posting/adapters/instagram.ts`
- Create: `web/src/lib/posting/adapters/youtube.ts`
- Create: `web/src/lib/posting/adapters/index.ts`

- [ ] **Step 1: Write the adapter interface**

File: `web/src/lib/posting/adapter.ts`

```typescript
export interface PostResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export interface PostMetadata {
  caption: string;
  hashtags: string[];
  platformSpecific: Record<string, unknown>;
}

export interface AccountCredentials {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  channelId?: string;
  [key: string]: unknown;
}

export interface PlatformAccount {
  id: string;
  platformId: string;
  handle: string;
  credentials: AccountCredentials;
}

export interface PlatformAdapter {
  platformId: string;
  post(
    account: PlatformAccount,
    assetPath: string,
    metadata: PostMetadata
  ): Promise<PostResult>;
}
```

- [ ] **Step 2: Create TikTok stub adapter**

File: `web/src/lib/posting/adapters/tiktok.ts`

```typescript
import type { PlatformAdapter, PlatformAccount, PostMetadata, PostResult } from "../adapter";

export class TikTokAdapter implements PlatformAdapter {
  platformId = "tiktok";

  async post(
    account: PlatformAccount,
    assetPath: string,
    metadata: PostMetadata
  ): Promise<PostResult> {
    if (!account.credentials.accessToken) {
      return { success: false, error: "Platform API not configured" };
    }

    // Stub: TikTok Content Posting API v2
    // POST https://open.tiktokapis.com/v2/post/publish/video/init/
    // Requires: access_token, video binary, caption, privacy_level
    console.log("[tiktok-adapter] stub — credentials present but API call not implemented", {
      accountId: account.id,
      assetPath,
      captionLength: metadata.caption.length,
    });

    return { success: false, error: "Platform API not configured" };
  }
}
```

- [ ] **Step 3: Create Instagram stub adapter**

File: `web/src/lib/posting/adapters/instagram.ts`

```typescript
import type { PlatformAdapter, PlatformAccount, PostMetadata, PostResult } from "../adapter";

export class InstagramAdapter implements PlatformAdapter {
  platformId = "instagram";

  async post(
    account: PlatformAccount,
    assetPath: string,
    metadata: PostMetadata
  ): Promise<PostResult> {
    if (!account.credentials.accessToken || !account.credentials.userId) {
      return { success: false, error: "Platform API not configured" };
    }

    // Stub: Instagram Graph API Reels endpoint (two-step: container create → publish)
    // POST https://graph.facebook.com/v19.0/{ig-user-id}/media
    // POST https://graph.facebook.com/v19.0/{ig-user-id}/media_publish
    // Requires: access_token, video_url (public URL), caption, media_type=REELS
    console.log("[instagram-adapter] stub — credentials present but API call not implemented", {
      accountId: account.id,
      assetPath,
      hashtags: metadata.hashtags.length,
    });

    return { success: false, error: "Platform API not configured" };
  }
}
```

- [ ] **Step 4: Create YouTube stub adapter**

File: `web/src/lib/posting/adapters/youtube.ts`

```typescript
import type { PlatformAdapter, PlatformAccount, PostMetadata, PostResult } from "../adapter";

export class YouTubeAdapter implements PlatformAdapter {
  platformId = "youtube";

  async post(
    account: PlatformAccount,
    assetPath: string,
    metadata: PostMetadata
  ): Promise<PostResult> {
    if (!account.credentials.accessToken || !account.credentials.channelId) {
      return { success: false, error: "Platform API not configured" };
    }

    // Stub: YouTube Data API v3 video.insert (resumable upload)
    // POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable
    // Requires: OAuth2 access_token, video binary, snippet.title, snippet.description,
    //           status.privacyStatus, snippet.categoryId
    // For Shorts: title/description must contain #Shorts, video must be <= 60s vertical
    console.log("[youtube-adapter] stub — credentials present but API call not implemented", {
      accountId: account.id,
      assetPath,
    });

    return { success: false, error: "Platform API not configured" };
  }
}
```

- [ ] **Step 5: Create adapter registry**

File: `web/src/lib/posting/adapters/index.ts`

```typescript
import { TikTokAdapter } from "./tiktok";
import { InstagramAdapter } from "./instagram";
import { YouTubeAdapter } from "./youtube";
import type { PlatformAdapter } from "../adapter";

const adapters: Record<string, PlatformAdapter> = {
  tiktok: new TikTokAdapter(),
  instagram: new InstagramAdapter(),
  youtube: new YouTubeAdapter(),
};

export function getAdapter(platformId: string): PlatformAdapter | null {
  return adapters[platformId] ?? null;
}

export { TikTokAdapter, InstagramAdapter, YouTubeAdapter };
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/renatomoscati/ugc/web && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E "posting/|adapter" | head -20
```

Expected: no errors in posting files.

- [ ] **Step 7: Commit**

```bash
cd /Users/renatomoscati/ugc && git add web/src/lib/posting/ && git commit -m "feat(plan-6): platform adapter interface and stub adapters (tiktok, instagram, youtube)"
```

---

## Task 2: Frequency cap enforcement (TDD)

**Files:**
- Create: `web/src/lib/scheduling/frequency-caps.ts`
- Create: `web/src/lib/scheduling/frequency-caps.test.ts`

- [ ] **Step 1: Write failing tests**

File: `web/src/lib/scheduling/frequency-caps.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Drizzle db before importing the module under test
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import { checkFrequencyCap } from "./frequency-caps";
import { getDb } from "@/lib/db";

const mockDb = {
  select: vi.fn(),
};

beforeEach(() => {
  vi.mocked(getDb).mockReturnValue(mockDb as any);
  vi.clearAllMocks();
});

describe("checkFrequencyCap", () => {
  it("returns allowed=true when postsToday < cap", async () => {
    // platform cap = 3, posts today = 1
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ frequencyCap: 3 }]),
    });
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    });

    const result = await checkFrequencyCap("persona-1", "tiktok", new Date("2026-03-29"));
    expect(result.allowed).toBe(true);
    expect(result.postsToday).toBe(1);
    expect(result.cap).toBe(3);
  });

  it("returns allowed=false when postsToday >= cap", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ frequencyCap: 2 }]),
    });
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    });

    const result = await checkFrequencyCap("persona-1", "tiktok", new Date("2026-03-29"));
    expect(result.allowed).toBe(false);
    expect(result.postsToday).toBe(2);
    expect(result.cap).toBe(2);
  });

  it("returns allowed=true with cap=0 treated as unlimited when platform not found", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    });

    const result = await checkFrequencyCap("persona-1", "unknown-platform", new Date("2026-03-29"));
    expect(result.allowed).toBe(true);
    expect(result.cap).toBe(0);
  });
});
```

- [ ] **Step 2: Verify tests fail (no implementation yet)**

```bash
cd /Users/renatomoscati/ugc/web && npx vitest run src/lib/scheduling/frequency-caps.test.ts 2>&1 | tail -10
```

Expected: Cannot find module `./frequency-caps` or similar — tests fail at import.

- [ ] **Step 3: Implement frequency cap logic**

File: `web/src/lib/scheduling/frequency-caps.ts`

```typescript
import { getDb } from "@/lib/db";
import { platforms, schedules } from "@/lib/db/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";

export interface FrequencyCapResult {
  allowed: boolean;
  postsToday: number;
  cap: number;
}

export async function checkFrequencyCap(
  personaId: string,
  platformId: string,
  date: Date
): Promise<FrequencyCapResult> {
  const db = getDb();

  // Get frequency cap from platforms table
  const platformRows = await db
    .select({ frequencyCap: platforms.frequencyCap })
    .from(platforms)
    .where(eq(platforms.id, platformId))
    .limit(1);

  const cap = platformRows[0]?.frequencyCap ?? 0;

  // Count posts already scheduled or posted today for this persona+platform
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const countRows = await db
    .select({ count: count() })
    .from(schedules)
    .where(
      and(
        eq(schedules.personaId, personaId),
        eq(schedules.platformId, platformId),
        gte(schedules.scheduledAt, dayStart),
        lt(schedules.scheduledAt, dayEnd)
      )
    );

  const postsToday = Number(countRows[0]?.count ?? 0);

  // cap = 0 means unlimited (no cap configured)
  const allowed = cap === 0 || postsToday < cap;

  return { allowed, postsToday, cap };
}
```

- [ ] **Step 4: Verify tests pass**

```bash
cd /Users/renatomoscati/ugc/web && npx vitest run src/lib/scheduling/frequency-caps.test.ts 2>&1 | tail -15
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/renatomoscati/ugc && git add web/src/lib/scheduling/ && git commit -m "feat(plan-6): frequency cap enforcement with passing tests"
```

---

## Task 3: Next-slot algorithm (TDD)

**Files:**
- Create: `web/src/lib/scheduling/next-slot.ts`
- Create: `web/src/lib/scheduling/next-slot.test.ts`

- [ ] **Step 1: Write failing tests**

File: `web/src/lib/scheduling/next-slot.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./frequency-caps", () => ({
  checkFrequencyCap: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import { findNextAvailableSlot } from "./next-slot";
import { checkFrequencyCap } from "./frequency-caps";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findNextAvailableSlot", () => {
  it("returns first default slot when cap not reached", async () => {
    vi.mocked(checkFrequencyCap).mockResolvedValue({ allowed: true, postsToday: 0, cap: 3 });

    // Reference date: 2026-03-29 08:00 UTC — before any TikTok slots
    const ref = new Date("2026-03-29T08:00:00.000Z");
    const result = await findNextAvailableSlot("persona-1", "tiktok", ref);

    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(9); // first TikTok slot = 9am
  });

  it("returns null when all slots for today and tomorrow are at cap", async () => {
    vi.mocked(checkFrequencyCap).mockResolvedValue({ allowed: false, postsToday: 3, cap: 3 });

    const ref = new Date("2026-03-29T08:00:00.000Z");
    const result = await findNextAvailableSlot("persona-1", "tiktok", ref);

    expect(result).toBeNull();
  });

  it("skips slots in the past and returns next future slot", async () => {
    vi.mocked(checkFrequencyCap).mockResolvedValue({ allowed: true, postsToday: 1, cap: 3 });

    // 2pm — TikTok slots 9am and 1pm are in the past
    const ref = new Date("2026-03-29T14:00:00.000Z");
    const result = await findNextAvailableSlot("persona-1", "tiktok", ref);

    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(19); // 7pm slot (UTC = local for test)
  });

  it("uses Instagram default slots", async () => {
    vi.mocked(checkFrequencyCap).mockResolvedValue({ allowed: true, postsToday: 0, cap: 3 });

    const ref = new Date("2026-03-29T08:00:00.000Z");
    const result = await findNextAvailableSlot("persona-1", "instagram", ref);

    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(11); // first IG slot = 11am
  });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
cd /Users/renatomoscati/ugc/web && npx vitest run src/lib/scheduling/next-slot.test.ts 2>&1 | tail -10
```

Expected: Cannot find module `./next-slot`.

- [ ] **Step 3: Implement next-slot algorithm**

File: `web/src/lib/scheduling/next-slot.ts`

```typescript
import { checkFrequencyCap } from "./frequency-caps";

// Default posting times (hour in local time, 24h)
const DEFAULT_SLOTS: Record<string, number[]> = {
  tiktok: [9, 13, 19],
  instagram: [11, 15, 20],
  youtube: [14, 18],
};

const FALLBACK_SLOTS = [10, 15, 20];
const LOOK_AHEAD_DAYS = 7;

/**
 * Find the next available posting slot respecting frequency caps.
 * Returns a Date or null if no slot is available within LOOK_AHEAD_DAYS.
 */
export async function findNextAvailableSlot(
  personaId: string,
  platformId: string,
  preferredTime: Date = new Date()
): Promise<Date | null> {
  const slots = DEFAULT_SLOTS[platformId] ?? FALLBACK_SLOTS;
  const now = preferredTime;

  for (let dayOffset = 0; dayOffset < LOOK_AHEAD_DAYS; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    day.setSeconds(0, 0);

    const capResult = await checkFrequencyCap(personaId, platformId, day);
    if (!capResult.allowed) continue;

    for (const hour of slots) {
      const candidate = new Date(day);
      candidate.setHours(hour, 0, 0, 0);

      // Skip slots in the past (with 5 min buffer)
      if (candidate.getTime() < now.getTime() - 5 * 60 * 1000) continue;

      return candidate;
    }
  }

  return null;
}
```

- [ ] **Step 4: Verify tests pass**

```bash
cd /Users/renatomoscati/ugc/web && npx vitest run src/lib/scheduling/next-slot.test.ts 2>&1 | tail -15
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/renatomoscati/ugc && git add web/src/lib/scheduling/next-slot.ts web/src/lib/scheduling/next-slot.test.ts && git commit -m "feat(plan-6): next-slot algorithm with passing tests"
```

---

## Task 4: Calendar API routes (GET, POST, DELETE)

**Files:**
- Create: `web/src/app/api/schedule/route.ts`
- Create: `web/src/app/api/schedule/[id]/route.ts`

- [ ] **Step 1: Create GET + POST /api/schedule**

File: `web/src/app/api/schedule/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schedules, posts, platforms } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { checkFrequencyCap } from "@/lib/scheduling/frequency-caps";
import { randomUUID } from "crypto";

// GET /api/schedule?start=ISO&end=ISO&personaId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const personaId = searchParams.get("personaId");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end query params required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const conditions = [
      gte(schedules.scheduledAt, new Date(start)),
      lte(schedules.scheduledAt, new Date(end)),
    ];
    if (personaId) conditions.push(eq(schedules.personaId, personaId));

    const rows = await db
      .select()
      .from(schedules)
      .where(and(...conditions))
      .orderBy(schedules.scheduledAt);

    return NextResponse.json({ schedules: rows });
  } catch (error) {
    console.error("[api/schedule GET] failed", { error: String(error) });
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

// POST /api/schedule — body: { postId, personaId, platformId, platformAccountId, scheduledAt }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, personaId, platformId, platformAccountId, scheduledAt } = body;

    if (!postId || !personaId || !platformId || !platformAccountId || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    const scheduleDate = new Date(scheduledAt);

    // Enforce frequency cap before inserting
    const capResult = await checkFrequencyCap(personaId, platformId, scheduleDate);
    if (!capResult.allowed) {
      return NextResponse.json(
        {
          error: `Frequency cap reached for ${platformId} on this date`,
          postsToday: capResult.postsToday,
          cap: capResult.cap,
        },
        { status: 422 }
      );
    }

    const id = randomUUID();
    await db.insert(schedules).values({
      id,
      postId,
      personaId,
      platformId,
      platformAccountId,
      scheduledAt: scheduleDate,
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [created] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return NextResponse.json({ schedule: created }, { status: 201 });
  } catch (error) {
    console.error("[api/schedule POST] failed", { error: String(error) });
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create DELETE /api/schedule/[id]**

File: `web/src/app/api/schedule/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { schedules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const db = getDb();

    const [existing] = await db
      .select({ id: schedules.id, status: schedules.status })
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (existing.status === "posted") {
      return NextResponse.json(
        { error: "Cannot unschedule a post that has already been posted" },
        { status: 409 }
      );
    }

    await db.delete(schedules).where(eq(schedules.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/schedule DELETE] failed", { id, error: String(error) });
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/renatomoscati/ugc/web && npx tsc --noEmit 2>&1 | grep -E "api/schedule" | head -20
```

Expected: no errors.

- [ ] **Step 4: Smoke test with curl (dev server must be running)**

```bash
curl -s "http://localhost:3000/api/schedule?start=2026-03-29T00:00:00Z&end=2026-03-30T00:00:00Z" | head -c 200
```

Expected: `{"schedules":[...]}` (empty array is fine).

- [ ] **Step 5: Commit**

```bash
cd /Users/renatomoscati/ugc && git add web/src/app/api/schedule/ && git commit -m "feat(plan-6): calendar API routes (GET, POST, DELETE /api/schedule)"
```

---

## Task 5: Post dispatcher worker

**Files:**
- Create: `web/src/workers/post-dispatcher.ts`
- Modify: `web/src/workers/index.ts`

- [ ] **Step 1: Create post-dispatcher worker**

File: `web/src/workers/post-dispatcher.ts`

```typescript
import { Worker, Job } from "bullmq";
import { getDb } from "@/lib/db";
import { schedules, posts, platformAccounts, system_logs } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAdapter } from "@/lib/posting/adapters";
import { redisConnection } from "@/lib/queue";
import { randomUUID } from "crypto";

const QUEUE_NAME = "post-dispatcher";
const MAX_RETRIES = 3;

export function createPostDispatcherWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (_job: Job) => {
      console.log("[post-dispatcher] scanning for due posts");
      const db = getDb();
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

      // Find posts due in the next 15 minutes with status 'scheduled'
      const dueSchedules = await db
        .select()
        .from(schedules)
        .where(
          and(
            eq(schedules.status, "scheduled"),
            gte(schedules.scheduledAt, now),
            lte(schedules.scheduledAt, windowEnd)
          )
        );

      console.log(`[post-dispatcher] found ${dueSchedules.length} due posts`);

      for (const schedule of dueSchedules) {
        await processSchedule(schedule);
      }
    },
    { connection: redisConnection }
  );

  worker.on("failed", (job, err) => {
    console.error("[post-dispatcher] job failed", { jobId: job?.id, error: String(err) });
  });

  return worker;
}

async function processSchedule(schedule: typeof schedules.$inferSelect) {
  const db = getDb();

  try {
    const adapter = getAdapter(schedule.platformId);
    if (!adapter) {
      await logAndUpdateStatus(schedule, false, `No adapter for platform: ${schedule.platformId}`);
      return;
    }

    // Load account credentials
    const [account] = await db
      .select()
      .from(platformAccounts)
      .where(eq(platformAccounts.id, schedule.platformAccountId))
      .limit(1);

    if (!account) {
      await logAndUpdateStatus(schedule, false, `Platform account not found: ${schedule.platformAccountId}`);
      return;
    }

    // Load post and its asset path
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, schedule.postId))
      .limit(1);

    if (!post) {
      await logAndUpdateStatus(schedule, false, `Post not found: ${schedule.postId}`);
      return;
    }

    const retries = schedule.retryCount ?? 0;

    const result = await adapter.post(
      {
        id: account.id,
        platformId: account.platformId,
        handle: account.handle,
        credentials: account.credentials as Record<string, unknown>,
      },
      post.assetPath ?? "",
      {
        caption: post.caption ?? "",
        hashtags: post.hashtags ?? [],
        platformSpecific: (schedule.platformSpecific as Record<string, unknown>) ?? {},
      }
    );

    if (result.success) {
      // Update schedule and post to posted
      await db
        .update(schedules)
        .set({ status: "posted", platformPostId: result.platformPostId, updatedAt: new Date() })
        .where(eq(schedules.id, schedule.id));

      await db
        .update(posts)
        .set({ status: "posted", updatedAt: new Date() })
        .where(eq(posts.id, schedule.postId));

      await insertLog(schedule.id, "info", `Posted successfully. platformPostId=${result.platformPostId}`);
      console.log("[post-dispatcher] posted successfully", { scheduleId: schedule.id });
    } else {
      if (retries < MAX_RETRIES - 1) {
        // Exponential backoff: reschedule
        const backoffMs = Math.pow(2, retries) * 60 * 1000;
        const nextAttempt = new Date(Date.now() + backoffMs);
        await db
          .update(schedules)
          .set({ retryCount: retries + 1, scheduledAt: nextAttempt, updatedAt: new Date() })
          .where(eq(schedules.id, schedule.id));

        await insertLog(schedule.id, "warn", `Post failed (attempt ${retries + 1}/${MAX_RETRIES}): ${result.error}. Retrying at ${nextAttempt.toISOString()}`);
      } else {
        await db
          .update(schedules)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(schedules.id, schedule.id));

        await insertLog(schedule.id, "error", `Post failed after ${MAX_RETRIES} attempts: ${result.error}`);
      }
    }
  } catch (err) {
    console.error("[post-dispatcher] processSchedule threw", { scheduleId: schedule.id, error: String(err) });
    await insertLog(schedule.id, "error", `Unexpected error: ${String(err)}`);
  }
}

async function logAndUpdateStatus(
  schedule: typeof schedules.$inferSelect,
  success: boolean,
  message: string
) {
  const db = getDb();
  await db
    .update(schedules)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(schedules.id, schedule.id));

  await insertLog(schedule.id, "error", message);
  console.error("[post-dispatcher]", message, { scheduleId: schedule.id });
}

async function insertLog(scheduleId: string, level: "info" | "warn" | "error", message: string) {
  const db = getDb();
  await db.insert(system_logs).values({
    id: randomUUID(),
    entityType: "schedule",
    entityId: scheduleId,
    level,
    message,
    createdAt: new Date(),
  });
}
```

- [ ] **Step 2: Register repeatable job in workers/index.ts**

Open `web/src/workers/index.ts` and add:

```typescript
// Add to imports
import { createPostDispatcherWorker } from "./post-dispatcher";
import { Queue } from "bullmq";
import { redisConnection } from "@/lib/queue";

// Inside the startup function, after existing workers:
const postDispatcherQueue = new Queue("post-dispatcher", { connection: redisConnection });
await postDispatcherQueue.add(
  "tick",
  {},
  {
    repeat: { every: 15 * 60 * 1000 }, // every 15 minutes
    jobId: "post-dispatcher-repeatable",
  }
);
const postDispatcherWorker = createPostDispatcherWorker();
console.log("[workers] post-dispatcher registered (every 15 min)");
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/renatomoscati/ugc/web && npx tsc --noEmit 2>&1 | grep -E "post-dispatcher|workers" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/renatomoscati/ugc && git add web/src/workers/post-dispatcher.ts web/src/workers/index.ts && git commit -m "feat(plan-6): post-dispatcher BullMQ worker (15-min repeatable, exponential backoff)"
```

---

## Task 6: Manual publish endpoint

**Files:**
- Create: `web/src/app/api/posts/[id]/publish/route.ts`

- [ ] **Step 1: Create manual publish route**

File: `web/src/app/api/posts/[id]/publish/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { posts, schedules, platformAccounts, system_logs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAdapter } from "@/lib/posting/adapters";
import { randomUUID } from "crypto";

// POST /api/posts/[id]/publish
// Body: { platformAccountId: string, platformId: string, caption?: string, hashtags?: string[] }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: postId } = params;

  try {
    const body = await request.json();
    const { platformAccountId, platformId, caption, hashtags = [] } = body;

    if (!platformAccountId || !platformId) {
      return NextResponse.json(
        { error: "platformAccountId and platformId are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Load post
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status === "posted") {
      return NextResponse.json({ error: "Post has already been published" }, { status: 409 });
    }

    // Load platform account
    const [account] = await db
      .select()
      .from(platformAccounts)
      .where(eq(platformAccounts.id, platformAccountId))
      .limit(1);

    if (!account) {
      return NextResponse.json({ error: "Platform account not found" }, { status: 404 });
    }

    const adapter = getAdapter(platformId);
    if (!adapter) {
      return NextResponse.json({ error: `No adapter for platform: ${platformId}` }, { status: 400 });
    }

    console.log("[api/posts/publish] manually triggering post", { postId, platformId });

    const result = await adapter.post(
      {
        id: account.id,
        platformId: account.platformId,
        handle: account.handle,
        credentials: account.credentials as Record<string, unknown>,
      },
      post.assetPath ?? "",
      {
        caption: caption ?? post.caption ?? "",
        hashtags,
        platformSpecific: {},
      }
    );

    // Log result
    await db.insert(system_logs).values({
      id: randomUUID(),
      entityType: "post",
      entityId: postId,
      level: result.success ? "info" : "error",
      message: result.success
        ? `Manually published. platformPostId=${result.platformPostId}`
        : `Manual publish failed: ${result.error}`,
      createdAt: new Date(),
    });

    if (result.success) {
      await db
        .update(posts)
        .set({ status: "posted", updatedAt: new Date() })
        .where(eq(posts.id, postId));

      return NextResponse.json({
        success: true,
        platformPostId: result.platformPostId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Platform API not configured" ? 501 : 502 }
      );
    }
  } catch (error) {
    console.error("[api/posts/publish] failed", { postId, error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd /Users/renatomoscati/ugc/web && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: zero errors.

- [ ] **Step 3: Smoke test manual publish (returns 501 — expected for unconfigured adapter)**

```bash
curl -s -X POST http://localhost:3000/api/posts/test-post-id/publish \
  -H "Content-Type: application/json" \
  -d '{"platformAccountId":"acc-1","platformId":"tiktok"}' | head -c 200
```

Expected: `{"success":false,"error":"Platform API not configured"}` with status 501.

- [ ] **Step 4: Run all scheduling tests**

```bash
cd /Users/renatomoscati/ugc/web && npx vitest run src/lib/scheduling/ 2>&1 | tail -20
```

Expected: 7 tests pass (3 frequency-cap + 4 next-slot).

- [ ] **Step 5: Commit**

```bash
cd /Users/renatomoscati/ugc && git add web/src/app/api/posts/ && git commit -m "feat(plan-6): manual publish endpoint respecting platform adapter interface"
```

---

## Verification

After all tasks are complete:

- [ ] `npx tsc --noEmit` passes with no errors across the web package
- [ ] `npx vitest run src/lib/scheduling/` reports 7 tests passing
- [ ] `GET /api/schedule?start=...&end=...` returns `{ schedules: [] }` for empty DB
- [ ] `POST /api/schedule` with a valid body creates a schedule row and enforces the cap
- [ ] `DELETE /api/schedule/:id` removes an unposted schedule; returns 409 for already-posted
- [ ] `POST /api/posts/:id/publish` returns 501 with `{ error: "Platform API not configured" }` for all three platforms
- [ ] `createPostDispatcherWorker` is imported and registered in `workers/index.ts`
- [ ] No direct platform API calls exist outside `web/src/lib/posting/adapters/`

---

## What is intentionally NOT in this plan

- Real platform API calls (no credentials yet — covered in a future credentials/integration plan)
- Calendar UI component (covered in Plan 5 web UI or a future calendar page plan)
- Analytics data from posted content (covered in a future analytics plan)
- Webhook ingestion from platforms (future plan)
