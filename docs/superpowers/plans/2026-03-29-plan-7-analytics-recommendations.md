# Plan 7: Analytics & Recommendations — Performance Ingestion, Insights, Niche Research

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the feedback loop. Ingest platform performance metrics every 6 hours, surface aggregated analytics in the UI, run LLM-powered weekly retrospectives that generate actionable recommendations, and add the niche research workflow so the operator can evaluate content opportunities with local LLM analysis before committing.

**Architecture:** BullMQ workers (Node) consume scheduled jobs → read/write SQLite via Drizzle → Next.js API routes serve aggregated data → Ollama (Qwen 3 8B) generates retrospective JSON + niche analysis → Recommendations page renders insights.

**Tech Stack:** BullMQ, Drizzle ORM, better-sqlite3, Ollama (generateJSON), Next.js 16 App Router, shadcn/ui, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md`

**Depends on:** Plan 1 (foundation, schema, queue), Plan 2 (Ollama client), Plan 5 (posting/posts table), Plan 6 (posts with status='posted')

---

## File Map

### New files — analytics fetchers
- `web/src/lib/analytics/fetchers/types.ts` — `MetricSnapshot` interface
- `web/src/lib/analytics/fetchers/tiktok.ts` — Stub TikTok metric fetcher
- `web/src/lib/analytics/fetchers/instagram.ts` — Stub Instagram metric fetcher
- `web/src/lib/analytics/fetchers/youtube.ts` — Stub YouTube metric fetcher
- `web/src/lib/analytics/fetchers/index.ts` — `fetchPlatformMetrics` dispatcher

### New files — analytics aggregations
- `web/src/lib/analytics/aggregations.ts` — Executive, creative, operations metrics

### New files — workers
- `web/src/workers/performance-ingest.ts` — BullMQ worker, 6h cron
- `web/src/workers/retrospective.ts` — BullMQ worker, weekly Monday 9am

### New files — Ollama prompts
- `web/src/lib/ollama/prompts/nicheResearchPrompt.ts` — Niche analysis prompt template
- `web/src/lib/ollama/prompts/retrospectivePrompt.ts` — Weekly retrospective prompt template

### New files — API routes
- `web/src/app/api/analytics/route.ts` — GET aggregated metrics
- `web/src/app/api/recommendations/route.ts` — GET list, POST trigger
- `web/src/app/api/niche-research/route.ts` — POST niche analysis

### New files — UI pages
- `web/src/app/recommendations/page.tsx` — Recommendations list with niche_research filter
- `web/src/app/settings/niche-research/page.tsx` — Niche research input + results

### Test files
- `web/src/lib/analytics/__tests__/aggregations.test.ts`
- `web/src/lib/analytics/__tests__/fetchers.test.ts`
- `web/src/workers/__tests__/performance-ingest.test.ts`
- `web/src/workers/__tests__/retrospective.test.ts`

---

## Tasks

### Task 1 — MetricSnapshot interface + stub platform fetchers

**Purpose:** Define the data contract all fetchers must return. Stub implementations return deterministic mock data so the rest of the system can be wired and tested without live API credentials.

- [ ] **Write test first** — Create `web/src/lib/analytics/__tests__/fetchers.test.ts`:
  ```ts
  import { fetchPlatformMetrics } from '../fetchers'

  describe('fetchPlatformMetrics', () => {
    it('returns a MetricSnapshot with all required fields for tiktok', async () => {
      const snap = await fetchPlatformMetrics(
        { platform: 'tiktok', externalId: 'acc_1' },
        'post_abc'
      )
      expect(snap).toHaveProperty('views')
      expect(snap).toHaveProperty('likes')
      expect(snap).toHaveProperty('comments')
      expect(snap).toHaveProperty('shares')
      expect(snap).toHaveProperty('saves')
      expect(snap).toHaveProperty('watchTimeAvg')
      expect(snap).toHaveProperty('fetchedAt')
      expect(typeof snap.views).toBe('number')
    })

    it('returns a MetricSnapshot for instagram', async () => {
      const snap = await fetchPlatformMetrics(
        { platform: 'instagram', externalId: 'acc_2' },
        'post_def'
      )
      expect(snap).toHaveProperty('views')
    })

    it('returns a MetricSnapshot for youtube', async () => {
      const snap = await fetchPlatformMetrics(
        { platform: 'youtube', externalId: 'acc_3' },
        'post_ghi'
      )
      expect(snap).toHaveProperty('watchTimeAvg')
    })

    it('throws for unknown platform', async () => {
      await expect(
        fetchPlatformMetrics({ platform: 'unknown' as any, externalId: 'x' }, 'post_x')
      ).rejects.toThrow('Unsupported platform')
    })
  })
  ```

- [ ] Run test — expect all to **fail** (files don't exist yet):
  ```
  cd web && npx vitest run src/lib/analytics/__tests__/fetchers.test.ts
  ```

- [ ] Create `web/src/lib/analytics/fetchers/types.ts`:
  ```ts
  export interface AccountRef {
    platform: 'tiktok' | 'instagram' | 'youtube'
    externalId: string
  }

  export interface MetricSnapshot {
    views: number
    likes: number
    comments: number
    shares: number
    saves: number
    watchTimeAvg: number  // seconds
    fetchedAt: Date
  }
  ```

- [ ] Create `web/src/lib/analytics/fetchers/tiktok.ts`:
  ```ts
  // Stub — replace with real TikTok Video Query API when credentials are live
  // Real endpoint: POST https://open.tiktokapis.com/v2/video/query/
  import type { AccountRef, MetricSnapshot } from './types'

  export async function fetchTikTokMetrics(
    account: AccountRef,
    postId: string
  ): Promise<MetricSnapshot> {
    // TODO: replace stub with real API call
    // Required scopes: video.insights
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTimeAvg: 0,
      fetchedAt: new Date(),
    }
  }
  ```

- [ ] Create `web/src/lib/analytics/fetchers/instagram.ts`:
  ```ts
  // Stub — replace with Instagram Graph API Media Insights when credentials are live
  // Real endpoint: GET /{media-id}/insights?metric=impressions,reach,likes,comments,shares,saved
  import type { AccountRef, MetricSnapshot } from './types'

  export async function fetchInstagramMetrics(
    account: AccountRef,
    postId: string
  ): Promise<MetricSnapshot> {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTimeAvg: 0,
      fetchedAt: new Date(),
    }
  }
  ```

- [ ] Create `web/src/lib/analytics/fetchers/youtube.ts`:
  ```ts
  // Stub — replace with YouTube Data API v3 Videos.list statistics when credentials are live
  // Real endpoint: GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id={videoId}
  import type { AccountRef, MetricSnapshot } from './types'

  export async function fetchYouTubeMetrics(
    account: AccountRef,
    postId: string
  ): Promise<MetricSnapshot> {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTimeAvg: 0,
      fetchedAt: new Date(),
    }
  }
  ```

- [ ] Create `web/src/lib/analytics/fetchers/index.ts`:
  ```ts
  import type { AccountRef, MetricSnapshot } from './types'
  import { fetchTikTokMetrics } from './tiktok'
  import { fetchInstagramMetrics } from './instagram'
  import { fetchYouTubeMetrics } from './youtube'

  export type { AccountRef, MetricSnapshot }

  export async function fetchPlatformMetrics(
    account: AccountRef,
    postId: string
  ): Promise<MetricSnapshot> {
    switch (account.platform) {
      case 'tiktok':
        return fetchTikTokMetrics(account, postId)
      case 'instagram':
        return fetchInstagramMetrics(account, postId)
      case 'youtube':
        return fetchYouTubeMetrics(account, postId)
      default:
        throw new Error(`Unsupported platform: ${(account as any).platform}`)
    }
  }
  ```

- [ ] Run test again — expect all to **pass**:
  ```
  cd web && npx vitest run src/lib/analytics/__tests__/fetchers.test.ts
  ```

- [ ] Commit:
  ```
  git add web/src/lib/analytics/fetchers/
  git add web/src/lib/analytics/__tests__/fetchers.test.ts
  git commit -m "feat(plan-7): MetricSnapshot interface + stub platform fetchers"
  ```

---

### Task 2 — Performance ingestion worker

**Purpose:** BullMQ worker that runs every 6 hours, fetches metrics for all posted content, writes `performance_snapshots` rows, and updates `posts` aggregate fields.

- [ ] **Write test first** — Create `web/src/workers/__tests__/performance-ingest.test.ts`:
  ```ts
  import { processPerformanceIngest } from '../performance-ingest'

  // Mock db and fetcher to isolate worker logic
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      { id: 'post_1', externalPostId: 'ext_1', platform: 'tiktok', accountExternalId: 'acc_1' },
    ]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }

  vi.mock('../../lib/db', () => ({ db: mockDb }))
  vi.mock('../../lib/analytics/fetchers', () => ({
    fetchPlatformMetrics: vi.fn().mockResolvedValue({
      views: 100, likes: 10, comments: 2, shares: 1, saves: 5, watchTimeAvg: 8, fetchedAt: new Date(),
    }),
  }))

  describe('processPerformanceIngest', () => {
    it('calls fetchPlatformMetrics for each posted post', async () => {
      const { fetchPlatformMetrics } = await import('../../lib/analytics/fetchers')
      await processPerformanceIngest()
      expect(fetchPlatformMetrics).toHaveBeenCalledTimes(1)
      expect(fetchPlatformMetrics).toHaveBeenCalledWith(
        { platform: 'tiktok', externalId: 'acc_1' },
        'ext_1'
      )
    })

    it('does not throw if a single post fetch fails', async () => {
      const { fetchPlatformMetrics } = await import('../../lib/analytics/fetchers')
      vi.mocked(fetchPlatformMetrics).mockRejectedValueOnce(new Error('API error'))
      await expect(processPerformanceIngest()).resolves.not.toThrow()
    })
  })
  ```

- [ ] Run test — expect to **fail**:
  ```
  cd web && npx vitest run src/workers/__tests__/performance-ingest.test.ts
  ```

- [ ] Create `web/src/workers/performance-ingest.ts`:
  ```ts
  import { Worker, Queue } from 'bullmq'
  import { eq } from 'drizzle-orm'
  import { db } from '../lib/db'
  import { posts, performanceSnapshots } from '../lib/db/schema'
  import { fetchPlatformMetrics } from '../lib/analytics/fetchers'
  import { connection } from '../lib/queue/connection'

  const QUEUE_NAME = 'performance-ingest'

  // Export core logic for testability
  export async function processPerformanceIngest(): Promise<void> {
    const postedPosts = await db
      .select({
        id: posts.id,
        externalPostId: posts.externalPostId,
        platform: posts.platform,
        accountExternalId: posts.accountExternalId,
      })
      .from(posts)
      .where(eq(posts.status, 'posted'))

    for (const post of postedPosts) {
      try {
        const snapshot = await fetchPlatformMetrics(
          { platform: post.platform as any, externalId: post.accountExternalId },
          post.externalPostId
        )

        await db.insert(performanceSnapshots).values({
          postId: post.id,
          views: snapshot.views,
          likes: snapshot.likes,
          comments: snapshot.comments,
          shares: snapshot.shares,
          saves: snapshot.saves,
          watchTimeAvg: snapshot.watchTimeAvg,
          fetchedAt: snapshot.fetchedAt.toISOString(),
        })

        // Update aggregate metrics on posts row
        await db
          .update(posts)
          .set({
            metricsViews: snapshot.views,
            metricsLikes: snapshot.likes,
            metricsComments: snapshot.comments,
            metricsShares: snapshot.shares,
            metricsSaves: snapshot.saves,
            metricsUpdatedAt: new Date().toISOString(),
          })
          .where(eq(posts.id, post.id))
      } catch (err) {
        console.error(`[performance-ingest] Failed for post ${post.id}:`, err)
        // Continue to next post — partial failure is acceptable
      }
    }
  }

  // BullMQ worker registration — called from main worker entrypoint
  export function registerPerformanceIngestWorker() {
    const worker = new Worker(
      QUEUE_NAME,
      async () => {
        await processPerformanceIngest()
      },
      { connection }
    )

    worker.on('failed', (job, err) => {
      console.error(`[performance-ingest] Job ${job?.id} failed:`, err)
    })

    return worker
  }

  // Cron job registration — call once at startup
  export async function schedulePerformanceIngest() {
    const queue = new Queue(QUEUE_NAME, { connection })
    await queue.upsertJobScheduler(
      'performance-ingest-cron',
      { pattern: '0 */6 * * *' }, // every 6 hours
      { name: 'ingest' }
    )
  }
  ```

  > Note: If `performanceSnapshots`, `posts.accountExternalId`, or aggregate metric columns do not yet exist in `web/src/lib/db/schema.ts`, add them now. Run `cd web && npx drizzle-kit push` after schema changes.

- [ ] Run test again — expect to **pass**:
  ```
  cd web && npx vitest run src/workers/__tests__/performance-ingest.test.ts
  ```

- [ ] Commit:
  ```
  git add web/src/workers/performance-ingest.ts
  git add web/src/workers/__tests__/performance-ingest.test.ts
  git commit -m "feat(plan-7): performance ingestion worker with 6h cron schedule"
  ```

---

### Task 3 — Analytics aggregation functions

**Purpose:** Read-model functions that query SQLite to produce executive, creative, and operations dashboards. All queries go through Drizzle.

- [ ] **Write test first** — Create `web/src/lib/analytics/__tests__/aggregations.test.ts`:
  ```ts
  import { getExecutiveMetrics, getCreativeMetrics, getOperationsMetrics } from '../aggregations'

  // Mock db — tests verify query shape, not data correctness
  vi.mock('../../db', () => ({
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    },
  }))

  describe('getExecutiveMetrics', () => {
    it('returns an object with required keys', async () => {
      const result = await getExecutiveMetrics('persona_1', 30)
      expect(result).toHaveProperty('totalPosts')
      expect(result).toHaveProperty('totalViews')
      expect(result).toHaveProperty('avgEngagementRate')
      expect(result).toHaveProperty('topPerformingPost')
    })
  })

  describe('getCreativeMetrics', () => {
    it('returns breakdown arrays', async () => {
      const result = await getCreativeMetrics('persona_1', 30)
      expect(result).toHaveProperty('byPillar')
      expect(result).toHaveProperty('byHookType')
      expect(result).toHaveProperty('byFormat')
      expect(result).toHaveProperty('byDurationBucket')
    })
  })

  describe('getOperationsMetrics', () => {
    it('returns operations health fields', async () => {
      const result = await getOperationsMetrics('persona_1', 30)
      expect(result).toHaveProperty('jobSuccessRate')
      expect(result).toHaveProperty('avgProcessingTimeMs')
      expect(result).toHaveProperty('deadLetterCount')
    })
  })
  ```

- [ ] Run test — expect to **fail**:
  ```
  cd web && npx vitest run src/lib/analytics/__tests__/aggregations.test.ts
  ```

- [ ] Create `web/src/lib/analytics/aggregations.ts`:
  ```ts
  import { and, eq, gte, sql, desc } from 'drizzle-orm'
  import { db } from '../db'
  import { posts, performanceSnapshots, productionJobs, scripts } from '../db/schema'

  function daysAgo(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString()
  }

  export interface ExecutiveMetrics {
    totalPosts: number
    totalViews: number
    avgEngagementRate: number        // (likes + comments + shares + saves) / views
    followerGrowth: number | null    // stub — requires platform API
    topPerformingPost: { postId: string; views: number } | null
  }

  export async function getExecutiveMetrics(
    personaId: string,
    days: number
  ): Promise<ExecutiveMetrics> {
    const since = daysAgo(days)

    const postRows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.personaId, personaId), gte(posts.postedAt, since)))

    const totalViews = postRows.reduce((sum, p) => sum + (p.metricsViews ?? 0), 0)
    const totalEngagements = postRows.reduce(
      (sum, p) =>
        sum +
        (p.metricsLikes ?? 0) +
        (p.metricsComments ?? 0) +
        (p.metricsShares ?? 0) +
        (p.metricsSaves ?? 0),
      0
    )
    const avgEngagementRate = totalViews > 0 ? totalEngagements / totalViews : 0

    const top = postRows.sort((a, b) => (b.metricsViews ?? 0) - (a.metricsViews ?? 0))[0]

    return {
      totalPosts: postRows.length,
      totalViews,
      avgEngagementRate,
      followerGrowth: null, // stub until platform API is connected
      topPerformingPost: top ? { postId: top.id, views: top.metricsViews ?? 0 } : null,
    }
  }

  export interface CreativeMetrics {
    byPillar: Array<{ pillarId: string; avgViews: number; postCount: number }>
    byHookType: Array<{ hookType: string; avgViews: number; postCount: number }>
    byFormat: Array<{ format: string; avgViews: number; postCount: number }>
    byDurationBucket: Array<{ bucket: string; avgViews: number; postCount: number }>
  }

  export async function getCreativeMetrics(
    personaId: string,
    days: number
  ): Promise<CreativeMetrics> {
    const since = daysAgo(days)

    const postRows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.personaId, personaId), gte(posts.postedAt, since)))

    function groupByAvg<T>(
      rows: typeof postRows,
      keyFn: (r: (typeof postRows)[0]) => string | null
    ): Array<{ key: string; avgViews: number; postCount: number }> {
      const map = new Map<string, { total: number; count: number }>()
      for (const row of rows) {
        const key = keyFn(row) ?? 'unknown'
        const existing = map.get(key) ?? { total: 0, count: 0 }
        map.set(key, { total: existing.total + (row.metricsViews ?? 0), count: existing.count + 1 })
      }
      return Array.from(map.entries()).map(([key, { total, count }]) => ({
        key,
        avgViews: count > 0 ? total / count : 0,
        postCount: count,
      }))
    }

    const byPillar = groupByAvg(postRows, (r) => r.pillarId).map((x) => ({
      pillarId: x.key,
      avgViews: x.avgViews,
      postCount: x.postCount,
    }))
    const byHookType = groupByAvg(postRows, (r) => r.hookType).map((x) => ({
      hookType: x.key,
      avgViews: x.avgViews,
      postCount: x.postCount,
    }))
    const byFormat = groupByAvg(postRows, (r) => r.format).map((x) => ({
      format: x.key,
      avgViews: x.avgViews,
      postCount: x.postCount,
    }))
    const byDurationBucket = groupByAvg(postRows, (r) => r.durationBucket).map((x) => ({
      bucket: x.key,
      avgViews: x.avgViews,
      postCount: x.postCount,
    }))

    return { byPillar, byHookType, byFormat, byDurationBucket }
  }

  export interface OperationsMetrics {
    jobSuccessRate: number            // 0–1
    avgProcessingTimeMs: number
    deadLetterCount: number
  }

  export async function getOperationsMetrics(
    personaId: string,
    days: number
  ): Promise<OperationsMetrics> {
    const since = daysAgo(days)

    const jobs = await db
      .select()
      .from(productionJobs)
      .where(and(eq(productionJobs.personaId, personaId), gte(productionJobs.createdAt, since)))

    const total = jobs.length
    const succeeded = jobs.filter((j) => j.status === 'completed').length
    const deadLetters = jobs.filter((j) => j.status === 'dead').length

    const completedJobs = jobs.filter(
      (j) => j.status === 'completed' && j.startedAt && j.completedAt
    )
    const avgMs =
      completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => {
            const start = new Date(j.startedAt!).getTime()
            const end = new Date(j.completedAt!).getTime()
            return sum + (end - start)
          }, 0) / completedJobs.length
        : 0

    return {
      jobSuccessRate: total > 0 ? succeeded / total : 1,
      avgProcessingTimeMs: avgMs,
      deadLetterCount: deadLetters,
    }
  }
  ```

  > Note: If `posts.pillarId`, `posts.hookType`, `posts.format`, `posts.durationBucket`, `posts.postedAt`, `productionJobs.personaId`, `productionJobs.startedAt`, `productionJobs.completedAt` are not yet in the schema, add them. Run `cd web && npx drizzle-kit push` after changes.

- [ ] Run test again — expect to **pass**:
  ```
  cd web && npx vitest run src/lib/analytics/__tests__/aggregations.test.ts
  ```

- [ ] Commit:
  ```
  git add web/src/lib/analytics/aggregations.ts
  git add web/src/lib/analytics/__tests__/aggregations.test.ts
  git commit -m "feat(plan-7): executive, creative, and operations aggregation functions"
  ```

---

### Task 4 — Analytics API route

**Purpose:** Single GET endpoint that dispatches to the three aggregation functions based on `type` query param.

- [ ] Create `web/src/app/api/analytics/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import {
    getExecutiveMetrics,
    getCreativeMetrics,
    getOperationsMetrics,
  } from '@/lib/analytics/aggregations'

  export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const type = searchParams.get('type')
    const days = parseInt(searchParams.get('days') ?? '30', 10)
    const personaId = searchParams.get('personaId')

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
    }

    if (!['executive', 'creative', 'operations'].includes(type ?? '')) {
      return NextResponse.json(
        { error: 'type must be executive, creative, or operations' },
        { status: 400 }
      )
    }

    try {
      let data
      if (type === 'executive') data = await getExecutiveMetrics(personaId, days)
      else if (type === 'creative') data = await getCreativeMetrics(personaId, days)
      else data = await getOperationsMetrics(personaId, days)

      return NextResponse.json(data)
    } catch (err) {
      console.error('[api/analytics] Error:', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
  ```

- [ ] Smoke test with curl (dev server running):
  ```
  curl "http://localhost:3000/api/analytics?type=executive&days=30&personaId=TEST" | jq .
  ```
  Expected: `{ totalPosts, totalViews, avgEngagementRate, followerGrowth, topPerformingPost }`

- [ ] Commit:
  ```
  git add web/src/app/api/analytics/route.ts
  git commit -m "feat(plan-7): analytics API route (executive, creative, operations)"
  ```

---

### Task 5 — Weekly retrospective worker

**Purpose:** Runs every Monday at 9am, pulls the last 7 days of metrics, builds a structured prompt, calls Ollama's `generateJSON`, and writes the result to the `recommendations` table.

- [ ] **Write test first** — Create `web/src/workers/__tests__/retrospective.test.ts`:
  ```ts
  import { processRetrospective } from '../retrospective'

  vi.mock('../../lib/db', () => ({
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
    },
  }))

  vi.mock('../../lib/analytics/aggregations', () => ({
    getExecutiveMetrics: vi.fn().mockResolvedValue({
      totalPosts: 5, totalViews: 1000, avgEngagementRate: 0.04, followerGrowth: null, topPerformingPost: null,
    }),
    getCreativeMetrics: vi.fn().mockResolvedValue({
      byPillar: [], byHookType: [], byFormat: [], byDurationBucket: [],
    }),
  }))

  vi.mock('../../lib/ollama/client', () => ({
    generateJSON: vi.fn().mockResolvedValue({
      summary: 'Good week',
      topInsights: ['Hooks with questions perform 2x'],
      actionableRecommendations: ['Post more at 7pm'],
      experimentSuggestions: ['Try green screen format'],
    }),
  }))

  describe('processRetrospective', () => {
    it('calls generateJSON and inserts a recommendation record', async () => {
      const { generateJSON } = await import('../../lib/ollama/client')
      const { db } = await import('../../lib/db')

      await processRetrospective('persona_1')

      expect(generateJSON).toHaveBeenCalledTimes(1)
      expect(vi.mocked(db.insert)).toHaveBeenCalled()
    })

    it('does not throw if Ollama fails', async () => {
      const { generateJSON } = await import('../../lib/ollama/client')
      vi.mocked(generateJSON).mockRejectedValueOnce(new Error('Ollama timeout'))
      await expect(processRetrospective('persona_1')).resolves.not.toThrow()
    })
  })
  ```

- [ ] Run test — expect to **fail**:
  ```
  cd web && npx vitest run src/workers/__tests__/retrospective.test.ts
  ```

- [ ] Create `web/src/lib/ollama/prompts/retrospectivePrompt.ts`:
  ```ts
  import type { ExecutiveMetrics, CreativeMetrics } from '../analytics/aggregations'

  export interface RetrospectiveInput {
    periodDays: number
    executive: ExecutiveMetrics
    creative: CreativeMetrics
    topPosts: Array<{ postId: string; views: number; hookType?: string; pillarId?: string }>
    bottomPosts: Array<{ postId: string; views: number; hookType?: string; pillarId?: string }>
  }

  export function buildRetrospectivePrompt(input: RetrospectiveInput): string {
    return `You are analyzing content performance for a short-form video creator. Return ONLY valid JSON.

  Period: Last ${input.periodDays} days
  Total posts: ${input.executive.totalPosts}
  Total views: ${input.executive.totalViews}
  Average engagement rate: ${(input.executive.avgEngagementRate * 100).toFixed(2)}%

  Top performing content:
  ${JSON.stringify(input.topPosts, null, 2)}

  Bottom performing content:
  ${JSON.stringify(input.bottomPosts, null, 2)}

  Creative breakdown by hook type:
  ${JSON.stringify(input.creative.byHookType, null, 2)}

  Creative breakdown by pillar:
  ${JSON.stringify(input.creative.byPillar, null, 2)}

  Return this exact JSON schema:
  {
    "summary": "2-3 sentence week in review",
    "topInsights": ["insight 1", "insight 2", "insight 3"],
    "actionableRecommendations": ["specific action 1", "specific action 2"],
    "experimentSuggestions": ["experiment idea 1", "experiment idea 2"]
  }`
  }
  ```

- [ ] Create `web/src/workers/retrospective.ts`:
  ```ts
  import { Worker, Queue } from 'bullmq'
  import { eq, and, gte, desc } from 'drizzle-orm'
  import { db } from '../lib/db'
  import { posts, recommendations } from '../lib/db/schema'
  import { getExecutiveMetrics, getCreativeMetrics } from '../lib/analytics/aggregations'
  import { generateJSON } from '../lib/ollama/client'
  import { buildRetrospectivePrompt } from '../lib/ollama/prompts/retrospectivePrompt'
  import { connection } from '../lib/queue/connection'
  import { randomUUID } from 'crypto'

  const QUEUE_NAME = 'weekly-retrospective'
  const PERIOD_DAYS = 7

  export async function processRetrospective(personaId: string): Promise<void> {
    try {
      const [executive, creative] = await Promise.all([
        getExecutiveMetrics(personaId, PERIOD_DAYS),
        getCreativeMetrics(personaId, PERIOD_DAYS),
      ])

      const since = new Date()
      since.setDate(since.getDate() - PERIOD_DAYS)

      const recentPosts = await db
        .select()
        .from(posts)
        .where(and(eq(posts.personaId, personaId), gte(posts.postedAt, since.toISOString())))

      const sorted = recentPosts.sort((a, b) => (b.metricsViews ?? 0) - (a.metricsViews ?? 0))
      const topPosts = sorted.slice(0, 3).map((p) => ({
        postId: p.id,
        views: p.metricsViews ?? 0,
        hookType: p.hookType ?? undefined,
        pillarId: p.pillarId ?? undefined,
      }))
      const bottomPosts = sorted.slice(-3).map((p) => ({
        postId: p.id,
        views: p.metricsViews ?? 0,
        hookType: p.hookType ?? undefined,
        pillarId: p.pillarId ?? undefined,
      }))

      const prompt = buildRetrospectivePrompt({ periodDays: PERIOD_DAYS, executive, creative, topPosts, bottomPosts })

      const analysis = await generateJSON(prompt)

      await db.insert(recommendations).values({
        id: randomUUID(),
        personaId,
        type: 'weekly_retrospective',
        summary: analysis.summary ?? '',
        payload: JSON.stringify(analysis),
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error(`[retrospective] Failed for persona ${personaId}:`, err)
    }
  }

  export function registerRetrospectiveWorker() {
    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const personaId = job.data?.personaId
        if (!personaId) throw new Error('Missing personaId in job data')
        await processRetrospective(personaId)
      },
      { connection }
    )

    worker.on('failed', (job, err) => {
      console.error(`[retrospective] Job ${job?.id} failed:`, err)
    })

    return worker
  }

  export async function scheduleRetrospective() {
    const queue = new Queue(QUEUE_NAME, { connection })
    await queue.upsertJobScheduler(
      'weekly-retro-cron',
      { pattern: '0 9 * * 1' }, // every Monday at 9am
      { name: 'retro' }
    )
  }
  ```

  > Note: If `recommendations` table or `posts.hookType`/`posts.pillarId` columns are missing from schema, add them and run `npx drizzle-kit push`.

- [ ] Run test again — expect to **pass**:
  ```
  cd web && npx vitest run src/workers/__tests__/retrospective.test.ts
  ```

- [ ] Commit:
  ```
  git add web/src/workers/retrospective.ts
  git add web/src/lib/ollama/prompts/retrospectivePrompt.ts
  git add web/src/workers/__tests__/retrospective.test.ts
  git commit -m "feat(plan-7): weekly retrospective worker with Ollama JSON generation"
  ```

---

### Task 6 — Recommendations API route

**Purpose:** Exposes recommendations to the UI. GET returns paginated results filtered by persona and optional type. POST to `/trigger` manually enqueues a retrospective job for on-demand analysis.

- [ ] Create `web/src/app/api/recommendations/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { eq, and, desc } from 'drizzle-orm'
  import { db } from '@/lib/db'
  import { recommendations } from '@/lib/db/schema'
  import { Queue } from 'bullmq'
  import { connection } from '@/lib/queue/connection'

  export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const personaId = searchParams.get('personaId')
    const type = searchParams.get('type')

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
    }

    const conditions = [eq(recommendations.personaId, personaId)]
    if (type) conditions.push(eq(recommendations.type, type))

    const rows = await db
      .select()
      .from(recommendations)
      .where(and(...conditions))
      .orderBy(desc(recommendations.createdAt))
      .limit(50)

    return NextResponse.json(rows)
  }

  export async function POST(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const isTrigger = req.nextUrl.pathname.endsWith('/trigger')

    if (!isTrigger) {
      return NextResponse.json({ error: 'POST only supported on /trigger' }, { status: 405 })
    }

    const body = await req.json()
    const { personaId } = body

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
    }

    const queue = new Queue('weekly-retrospective', { connection })
    const job = await queue.add('retro', { personaId })

    return NextResponse.json({ jobId: job.id, status: 'queued' })
  }
  ```

- [ ] Create `web/src/app/api/recommendations/trigger/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { Queue } from 'bullmq'
  import { connection } from '@/lib/queue/connection'

  export async function POST(req: NextRequest) {
    const body = await req.json()
    const { personaId } = body

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
    }

    const queue = new Queue('weekly-retrospective', { connection })
    const job = await queue.add('retro', { personaId })

    return NextResponse.json({ jobId: job.id, status: 'queued' })
  }
  ```

- [ ] Smoke test (dev server running):
  ```
  curl "http://localhost:3000/api/recommendations?personaId=TEST" | jq .
  ```
  Expected: empty array or array of recommendation objects.

- [ ] Commit:
  ```
  git add web/src/app/api/recommendations/
  git commit -m "feat(plan-7): recommendations GET list and POST trigger API routes"
  ```

---

### Task 7 — Niche research prompt + API route

**Purpose:** The operator provides candidate niches, the system calls Ollama to analyze audience size signals, competition density, content gaps, monetization potential, and platform fit, then stores and returns the structured results.

- [ ] Create `web/src/lib/ollama/prompts/nicheResearchPrompt.ts`:
  ```ts
  export interface NicheResearchInput {
    niche: string
    targetPlatforms: string[]
  }

  export function buildNicheResearchPrompt(input: NicheResearchInput): string {
    return `You are a short-form content strategist. Analyze the following niche for a virtual creator account on ${input.targetPlatforms.join(', ')}. Return ONLY valid JSON.

  Niche to analyze: "${input.niche}"

  Evaluate across these dimensions and return this exact JSON schema:
  {
    "niche": "${input.niche}",
    "audienceSizeSignal": "small|medium|large",
    "audienceSizeRationale": "1-2 sentences",
    "competitionDensity": "low|medium|high",
    "competitionRationale": "1-2 sentences",
    "contentGaps": ["gap 1", "gap 2", "gap 3"],
    "monetizationPotential": "low|medium|high",
    "monetizationRationale": "1-2 sentences",
    "platformFit": {
      "tiktok": "poor|moderate|strong",
      "instagram": "poor|moderate|strong",
      "youtube": "poor|moderate|strong"
    },
    "topContentAngles": ["angle 1", "angle 2", "angle 3"],
    "overallRecommendation": "pursue|consider|avoid",
    "overallRationale": "2-3 sentences explaining the recommendation"
  }`
  }
  ```

- [ ] Create `web/src/app/api/niche-research/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { db } from '@/lib/db'
  import { recommendations } from '@/lib/db/schema'
  import { generateJSON } from '@/lib/ollama/client'
  import { buildNicheResearchPrompt } from '@/lib/ollama/prompts/nicheResearchPrompt'
  import { randomUUID } from 'crypto'

  export async function POST(req: NextRequest) {
    const body = await req.json()
    const { niche, personaId, targetPlatforms = ['tiktok', 'instagram', 'youtube'] } = body

    if (!niche || typeof niche !== 'string') {
      return NextResponse.json({ error: 'niche is required' }, { status: 400 })
    }
    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 })
    }

    const prompt = buildNicheResearchPrompt({ niche, targetPlatforms })

    let analysis
    try {
      analysis = await generateJSON(prompt)
    } catch (err) {
      console.error('[niche-research] Ollama error:', err)
      return NextResponse.json({ error: 'LLM analysis failed' }, { status: 502 })
    }

    const id = randomUUID()
    await db.insert(recommendations).values({
      id,
      personaId,
      type: 'niche_research',
      summary: `Niche analysis: ${niche} — ${analysis.overallRecommendation ?? 'unknown'}`,
      payload: JSON.stringify({ niche, ...analysis }),
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id, ...analysis })
  }
  ```

- [ ] Smoke test (Ollama running):
  ```
  curl -X POST http://localhost:3000/api/niche-research \
    -H "Content-Type: application/json" \
    -d '{"niche":"AI productivity tools","personaId":"TEST"}' | jq .
  ```
  Expected: JSON with `overallRecommendation`, `contentGaps`, `platformFit` fields.

- [ ] Commit:
  ```
  git add web/src/lib/ollama/prompts/nicheResearchPrompt.ts
  git add web/src/app/api/niche-research/route.ts
  git commit -m "feat(plan-7): niche research prompt template and API route"
  ```

---

### Task 8 — Recommendations page UI

**Purpose:** Display all LLM recommendations. Tabs to filter between `weekly_retrospective` and `niche_research` types. Weekly retrospectives render as structured cards (summary + insights + actions + experiments). Niche research renders as analysis cards with a recommendation badge.

- [ ] Create `web/src/app/recommendations/page.tsx`:
  ```tsx
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'

  async function getRecommendations(personaId: string, type?: string) {
    const params = new URLSearchParams({ personaId })
    if (type) params.set('type', type)
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/recommendations?${params}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  }

  // TODO: Replace with active persona from session/settings
  const PERSONA_ID = process.env.DEFAULT_PERSONA_ID ?? 'default'

  export default async function RecommendationsPage() {
    const [retros, niches] = await Promise.all([
      getRecommendations(PERSONA_ID, 'weekly_retrospective'),
      getRecommendations(PERSONA_ID, 'niche_research'),
    ])

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Recommendations</h1>
          <form action="/api/recommendations/trigger" method="POST">
            <input type="hidden" name="personaId" value={PERSONA_ID} />
            <Button type="submit" variant="outline" size="sm">
              Run Retrospective Now
            </Button>
          </form>
        </div>

        <Tabs defaultValue="retrospectives">
          <TabsList>
            <TabsTrigger value="retrospectives">Weekly Retrospectives</TabsTrigger>
            <TabsTrigger value="niche">Niche Research</TabsTrigger>
          </TabsList>

          <TabsContent value="retrospectives" className="space-y-4 mt-4">
            {retros.length === 0 && (
              <p className="text-muted-foreground text-sm">No retrospectives yet. Run one to get started.</p>
            )}
            {retros.map((rec: any) => {
              const payload = typeof rec.payload === 'string' ? JSON.parse(rec.payload) : rec.payload
              return (
                <Card key={rec.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {new Date(rec.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{payload.summary}</p>
                    {payload.topInsights?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1">Top Insights</p>
                        <ul className="list-disc list-inside space-y-1">
                          {payload.topInsights.map((i: string, idx: number) => (
                            <li key={idx} className="text-sm">{i}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {payload.actionableRecommendations?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1">Actions</p>
                        <ul className="list-disc list-inside space-y-1">
                          {payload.actionableRecommendations.map((a: string, idx: number) => (
                            <li key={idx} className="text-sm">{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {payload.experimentSuggestions?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1">Experiment Ideas</p>
                        <ul className="list-disc list-inside space-y-1">
                          {payload.experimentSuggestions.map((e: string, idx: number) => (
                            <li key={idx} className="text-sm">{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="niche" className="space-y-4 mt-4">
            {niches.length === 0 && (
              <p className="text-muted-foreground text-sm">No niche analyses yet. Use Settings → Niche Research to run one.</p>
            )}
            {niches.map((rec: any) => {
              const payload = typeof rec.payload === 'string' ? JSON.parse(rec.payload) : rec.payload
              const badgeVariant =
                payload.overallRecommendation === 'pursue'
                  ? 'default'
                  : payload.overallRecommendation === 'consider'
                  ? 'secondary'
                  : 'destructive'
              return (
                <Card key={rec.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{payload.niche}</CardTitle>
                      <Badge variant={badgeVariant}>{payload.overallRecommendation ?? 'unknown'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{payload.overallRationale}</p>
                    {payload.contentGaps?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1">Content Gaps</p>
                        <ul className="list-disc list-inside space-y-1">
                          {payload.contentGaps.map((g: string, idx: number) => (
                            <li key={idx} className="text-sm">{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {payload.platformFit && (
                      <div className="flex gap-2">
                        {Object.entries(payload.platformFit).map(([platform, fit]) => (
                          <Badge key={platform} variant="outline">
                            {platform}: {fit as string}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>
        </Tabs>
      </div>
    )
  }
  ```

- [ ] Commit:
  ```
  git add web/src/app/recommendations/page.tsx
  git commit -m "feat(plan-7): recommendations page with retrospective and niche research tabs"
  ```

---

### Task 9 — Niche research settings page

**Purpose:** UI entry point for the operator to submit a candidate niche and see the analysis result inline before it is saved. Lives under Settings → Niche Research.

- [ ] Create `web/src/app/settings/niche-research/page.tsx`:
  ```tsx
  'use client'

  import { useState } from 'react'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { Badge } from '@/components/ui/badge'
  import { Loader2 } from 'lucide-react'

  // TODO: Replace with active persona from context/settings
  const PERSONA_ID = 'default'

  interface NicheResult {
    niche: string
    overallRecommendation: 'pursue' | 'consider' | 'avoid'
    overallRationale: string
    audienceSizeSignal: string
    competitionDensity: string
    monetizationPotential: string
    contentGaps: string[]
    topContentAngles: string[]
    platformFit: Record<string, string>
  }

  export default function NicheResearchPage() {
    const [niche, setNiche] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<NicheResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      if (!niche.trim()) return

      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const res = await fetch('/api/niche-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ niche: niche.trim(), personaId: PERSONA_ID }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Request failed')
        }
        const data = await res.json()
        setResult(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const badgeVariant =
      result?.overallRecommendation === 'pursue'
        ? 'default'
        : result?.overallRecommendation === 'consider'
        ? 'secondary'
        : 'destructive'

    return (
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Niche Research</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a candidate niche to get an LLM-powered analysis of audience size, competition, content gaps, and monetization potential.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. AI productivity for solopreneurs"
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !niche.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{result.niche}</CardTitle>
                <Badge variant={badgeVariant}>{result.overallRecommendation}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{result.overallRationale}</p>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Audience</p>
                  <Badge variant="outline">{result.audienceSizeSignal}</Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Competition</p>
                  <Badge variant="outline">{result.competitionDensity}</Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Monetization</p>
                  <Badge variant="outline">{result.monetizationPotential}</Badge>
                </div>
              </div>

              {result.contentGaps?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1">Content Gaps</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.contentGaps.map((g, i) => <li key={i} className="text-sm">{g}</li>)}
                  </ul>
                </div>
              )}

              {result.topContentAngles?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1">Top Content Angles</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.topContentAngles.map((a, i) => <li key={i} className="text-sm">{a}</li>)}
                  </ul>
                </div>
              )}

              {result.platformFit && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1">Platform Fit</p>
                  <div className="flex gap-2">
                    {Object.entries(result.platformFit).map(([platform, fit]) => (
                      <Badge key={platform} variant="outline">{platform}: {fit}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Analysis saved to Recommendations. View all niche analyses under Recommendations → Niche Research.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }
  ```

- [ ] Commit:
  ```
  git add web/src/app/settings/niche-research/page.tsx
  git commit -m "feat(plan-7): niche research settings page with inline result display"
  ```

---

### Task 10 — Wire workers into startup entrypoint

**Purpose:** Register the two new BullMQ workers and their cron schedulers so they run automatically when the web service starts. Also verify the full analytics flow end-to-end.

- [ ] Open `web/src/workers/index.ts` (or the file that registers workers — check Plan 1 or 4 for the exact path). Add registrations:
  ```ts
  import { registerPerformanceIngestWorker, schedulePerformanceIngest } from './performance-ingest'
  import { registerRetrospectiveWorker, scheduleRetrospective } from './retrospective'

  // Add to existing worker startup sequence:
  registerPerformanceIngestWorker()
  registerRetrospectiveWorker()

  // Schedule cron jobs (idempotent — upsertJobScheduler is safe to call on every restart)
  await schedulePerformanceIngest()
  await scheduleRetrospective()
  ```

- [ ] Run full test suite:
  ```
  cd web && npx vitest run
  ```
  All tests must pass.

- [ ] Start dev server and verify analytics endpoint returns valid shape:
  ```
  npm run dev &
  sleep 3
  curl "http://localhost:3000/api/analytics?type=executive&days=30&personaId=TEST" | jq .
  curl "http://localhost:3000/api/analytics?type=creative&days=30&personaId=TEST" | jq .
  curl "http://localhost:3000/api/analytics?type=operations&days=30&personaId=TEST" | jq .
  ```

- [ ] Verify recommendations page loads at `http://localhost:3000/recommendations` without errors.

- [ ] Verify niche research page loads at `http://localhost:3000/settings/niche-research` without errors.

- [ ] Commit:
  ```
  git add web/src/workers/index.ts
  git commit -m "feat(plan-7): wire performance ingest and retrospective workers into startup"
  ```

---

## Schema additions checklist

If any of these columns or tables are missing from `web/src/lib/db/schema.ts`, add them before running workers:

**`posts` table — add if missing:**
- `externalPostId text` — platform's native ID for the post
- `accountExternalId text` — account's external platform ID
- `platform text` — 'tiktok' | 'instagram' | 'youtube'
- `personaId text` — foreign key to personas
- `pillarId text` — foreign key to content_pillars
- `hookType text` — hook classification
- `format text` — content format
- `durationBucket text` — '0-15s' | '15-30s' | '30-60s' | '60s+'
- `postedAt text` — ISO timestamp
- `metricsViews integer default 0`
- `metricsLikes integer default 0`
- `metricsComments integer default 0`
- `metricsShares integer default 0`
- `metricsSaves integer default 0`
- `metricsUpdatedAt text`

**`performance_snapshots` table — create if missing:**
```ts
export const performanceSnapshots = sqliteTable('performance_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  postId: text('post_id').notNull().references(() => posts.id),
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),
  saves: integer('saves').default(0),
  watchTimeAvg: real('watch_time_avg').default(0),
  fetchedAt: text('fetched_at').notNull(),
})
```

**`recommendations` table — create if missing:**
```ts
export const recommendations = sqliteTable('recommendations', {
  id: text('id').primaryKey(),
  personaId: text('persona_id').notNull(),
  type: text('type').notNull(), // 'weekly_retrospective' | 'niche_research'
  summary: text('summary').notNull(),
  payload: text('payload').notNull(), // JSON string
  createdAt: text('created_at').notNull(),
})
```

**`productionJobs` table — add if missing:**
- `personaId text`
- `startedAt text`
- `completedAt text`
- `status text` — include 'dead' as valid status

After any schema changes: `cd web && npx drizzle-kit push`

---

## Verification

All plan-7 work is complete when:

- [ ] `npx vitest run` passes all tests in `src/lib/analytics/__tests__/` and `src/workers/__tests__/`
- [ ] `GET /api/analytics?type=executive&days=30&personaId=X` returns `{ totalPosts, totalViews, avgEngagementRate, followerGrowth, topPerformingPost }`
- [ ] `GET /api/analytics?type=creative&days=30&personaId=X` returns `{ byPillar, byHookType, byFormat, byDurationBucket }`
- [ ] `GET /api/analytics?type=operations&days=30&personaId=X` returns `{ jobSuccessRate, avgProcessingTimeMs, deadLetterCount }`
- [ ] `GET /api/recommendations?personaId=X` returns an array (empty or populated)
- [ ] `POST /api/recommendations/trigger` with `{ personaId }` returns `{ jobId, status: 'queued' }`
- [ ] `POST /api/niche-research` with `{ niche, personaId }` returns structured analysis from Ollama
- [ ] `/recommendations` page renders without errors, tabs work
- [ ] `/settings/niche-research` page renders, form submits, result card appears
- [ ] BullMQ dashboard (if available) shows `performance-ingest` and `weekly-retrospective` queues with registered cron schedulers
- [ ] All 10 tasks committed individually with descriptive messages
