# Plan 4: Job Orchestration — BullMQ Workers, Automation Toggles, Cron Jobs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the Node-side BullMQ workers, implement automation mode (manual/auto per stage), add cron-based scheduling for daily batch and performance ingest, and build the Production Queue UI.

**Architecture:** Node workers run alongside Next.js. A dedicated `workers/index.ts` starts all consumers. Automation config is read per-job from the persona's `automationConfig` JSON. BullMQ repeatable jobs handle crons.

**Tech Stack:** BullMQ, Next.js workers, Drizzle ORM, shadcn/ui (Card, Progress, Badge)

**Prereqs:** Plans 1-3 complete (DB, queues, Ollama, pipeline workers running)

---

## File Map

- Create: `web/src/workers/index.ts` — Start all Node workers
- Create: `web/src/workers/qa-worker.ts` — QA/review stage
- Create: `web/src/workers/schedule-worker.ts` — Schedule stage
- Create: `web/src/lib/automation.ts` — Read automation config, decide auto vs manual
- Create: `web/src/lib/cron.ts` — Register BullMQ repeatable jobs
- Create: `web/src/app/api/production/route.ts` — List production jobs
- Create: `web/src/app/api/production/[id]/retry/route.ts` — Retry failed job
- Create: `web/src/app/production/page.tsx` — Production queue UI
- Modify: `web/src/workers/ideation-worker.ts` — Check automation config before auto-proceeding
- Modify: `web/src/workers/script-worker.ts` — Check automation config

---

## Task 1: Automation config helper

**Files:**
- Create: `web/src/lib/automation.ts`

- [ ] **Step 1: Create automation helper**

File: `web/src/lib/automation.ts`

```typescript
import { getDb } from "@/lib/db";
import { personas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AutomationStage =
  | "ideation"
  | "script_gen"
  | "asset_production"
  | "qa_review"
  | "scheduling"
  | "posting"
  | "performance_ingest";

export interface StageConfig {
  mode: "manual" | "auto";
  batch_size?: number;
  cron?: string;
  strategy?: string;
}

export type AutomationConfig = Record<AutomationStage, StageConfig>;

const DEFAULT_CONFIG: AutomationConfig = {
  ideation: { mode: "manual", batch_size: 10, cron: "0 6 * * *" },
  script_gen: { mode: "manual" },
  asset_production: { mode: "manual" },
  qa_review: { mode: "manual" },
  scheduling: { mode: "manual", strategy: "best_time" },
  posting: { mode: "manual" },
  performance_ingest: { mode: "auto", cron: "0 */6 * * *" },
};

export function getAutomationConfig(personaId: number): AutomationConfig {
  const db = getDb();
  const persona = db
    .select({ automationConfig: personas.automationConfig })
    .from(personas)
    .where(eq(personas.id, personaId))
    .get();

  if (!persona?.automationConfig) return DEFAULT_CONFIG;

  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(persona.automationConfig) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function isAuto(personaId: number, stage: AutomationStage): boolean {
  return getAutomationConfig(personaId)[stage].mode === "auto";
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/lib/automation.ts
git commit -m "feat: add automation config helper — reads per-persona manual/auto mode per stage"
```

---

## Task 2: QA and schedule workers

**Files:**
- Create: `web/src/workers/qa-worker.ts`
- Create: `web/src/workers/schedule-worker.ts`

- [ ] **Step 1: Create QA worker**

File: `web/src/workers/qa-worker.ts`

```typescript
import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_NAMES, enqueue } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { scripts, productionJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAuto } from "@/lib/automation";

interface QAJobData {
  scriptId: number;
  personaId: number;
}

export function startQAWorker() {
  const worker = new Worker<QAJobData>(
    QUEUE_NAMES.QA,
    async (job: Job<QAJobData>) => {
      console.log(`[qa-worker] START jobId=${job.id}`);
      const { scriptId, personaId } = job.data;
      const db = getDb();

      if (isAuto(personaId, "qa_review")) {
        // Auto mode: mark as rendered and proceed to schedule
        db.update(scripts)
          .set({ status: "rendered" })
          .where(eq(scripts.id, scriptId))
          .run();

        await enqueue(QUEUE_NAMES.SCHEDULE, "schedule", { scriptId, personaId });
        console.log(`[qa-worker] AUTO approved scriptId=${scriptId}`);
      } else {
        // Manual mode: mark as rendered, wait for human approval in UI
        db.update(scripts)
          .set({ status: "rendered" })
          .where(eq(scripts.id, scriptId))
          .run();
        console.log(`[qa-worker] MANUAL review needed scriptId=${scriptId}`);
      }
    },
    { connection: redisConnection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[qa-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
```

- [ ] **Step 2: Create schedule worker**

File: `web/src/workers/schedule-worker.ts`

```typescript
import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_NAMES } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { scripts, schedules, assets, accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAuto } from "@/lib/automation";

interface ScheduleJobData {
  scriptId: number;
  personaId: number;
  scheduledAt?: string; // ISO string, optional — auto-assigns if not provided
}

function nextSlot(): string {
  // Simple: next occurrence of 9am or 6pm
  const now = new Date();
  const slots = [9, 18];
  for (const hour of slots) {
    const candidate = new Date(now);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate > now) return candidate.toISOString();
  }
  // Tomorrow 9am
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString();
}

export function startScheduleWorker() {
  const worker = new Worker<ScheduleJobData>(
    QUEUE_NAMES.SCHEDULE,
    async (job: Job<ScheduleJobData>) => {
      console.log(`[schedule-worker] START jobId=${job.id}`);
      const { scriptId, personaId, scheduledAt } = job.data;
      const db = getDb();

      if (!isAuto(personaId, "scheduling")) {
        console.log(`[schedule-worker] MANUAL scheduling required for scriptId=${scriptId}`);
        return;
      }

      const asset = db
        .select()
        .from(assets)
        .where(and(eq(assets.scriptId, scriptId)))
        .get();

      if (!asset) {
        throw new Error(`No asset found for scriptId=${scriptId}`);
      }

      const account = db
        .select()
        .from(accounts)
        .where(eq(accounts.personaId, personaId))
        .get();

      if (!account) {
        throw new Error(`No account found for personaId=${personaId}`);
      }

      const slot = scheduledAt ?? nextSlot();

      db.insert(schedules)
        .values({
          accountId: account.id,
          scheduledAt: slot,
          status: "pending",
        })
        .run();

      db.update(scripts)
        .set({ status: "scheduled" })
        .where(eq(scripts.id, scriptId))
        .run();

      console.log(`[schedule-worker] DONE scriptId=${scriptId} slot=${slot}`);
    },
    { connection: redisConnection, concurrency: 10 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[schedule-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/workers/qa-worker.ts web/src/workers/schedule-worker.ts
git commit -m "feat: add QA and schedule workers with manual/auto mode awareness"
```

---

## Task 3: Cron jobs (BullMQ repeatable)

**Files:**
- Create: `web/src/lib/cron.ts`

- [ ] **Step 1: Create cron registration**

File: `web/src/lib/cron.ts`

```typescript
import { Queue } from "bullmq";
import { redisConnection, QUEUE_NAMES } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { personas } from "@/lib/db/schema";

export async function registerCronJobs(personaId: number) {
  const db = getDb();
  const persona = db
    .select({ automationConfig: personas.automationConfig })
    .from(personas)
    .where((p) => p.id.equals(personaId))
    .get();

  if (!persona) return;

  const config = persona.automationConfig
    ? JSON.parse(persona.automationConfig)
    : {};

  const ideationCron = config.ideation?.cron ?? "0 6 * * *";
  const ingestCron = config.performance_ingest?.cron ?? "0 */6 * * *";
  const retroCron = "0 9 * * 1"; // weekly Monday 9am

  const ideationQueue = new Queue(QUEUE_NAMES.IDEATION, {
    connection: redisConnection,
  });
  const postQueue = new Queue(QUEUE_NAMES.POST, {
    connection: redisConnection,
  });

  // Daily batch: generate ideas + scripts
  await ideationQueue.upsertJobScheduler(
    `daily-batch-persona-${personaId}`,
    { pattern: ideationCron },
    {
      name: "daily-batch",
      data: { personaId, count: config.ideation?.batch_size ?? 10 },
    }
  );

  // Post dispatcher: every 15 minutes
  await postQueue.upsertJobScheduler(
    `post-dispatcher-persona-${personaId}`,
    { pattern: "*/15 * * * *" },
    { name: "post-dispatcher", data: { personaId } }
  );

  console.log(`[cron] Registered cron jobs for persona ${personaId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/lib/cron.ts
git commit -m "feat: add BullMQ repeatable cron jobs — daily batch and post dispatcher"
```

---

## Task 4: Worker entrypoint

**Files:**
- Create: `web/src/workers/index.ts`

- [ ] **Step 1: Create worker entrypoint**

File: `web/src/workers/index.ts`

```typescript
import { startIdeationWorker } from "./ideation-worker";
import { startScriptWorker } from "./script-worker";
import { startQAWorker } from "./qa-worker";
import { startScheduleWorker } from "./schedule-worker";
import { registerCronJobs } from "@/lib/cron";

export async function startAllWorkers() {
  console.log("[workers] Starting all Node-side BullMQ workers...");

  startIdeationWorker();
  startScriptWorker();
  startQAWorker();
  startScheduleWorker();

  // Register cron jobs for default persona (1)
  await registerCronJobs(1);

  console.log("[workers] All workers started");
}
```

- [ ] **Step 2: Start workers in Next.js instrumentation hook**

Create `web/src/instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAllWorkers } = await import("./workers/index");
    await startAllWorkers();
  }
}
```

- [ ] **Step 3: Enable instrumentation in next.config.ts**

Modify `web/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verify workers start with Next.js**

```bash
cd web
npm run dev
```

Expected: Worker startup messages appear in the Next.js terminal output.

- [ ] **Step 5: Commit**

```bash
cd ..
git add web/src/workers/index.ts web/src/instrumentation.ts web/next.config.ts
git commit -m "feat: start all BullMQ workers via Next.js instrumentation hook"
```

---

## Task 5: Production queue API and UI

**Files:**
- Create: `web/src/app/api/production/route.ts`
- Create: `web/src/app/api/production/[id]/retry/route.ts`
- Create: `web/src/app/production/page.tsx`

- [ ] **Step 1: Production jobs API**

File: `web/src/app/api/production/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { productionJobs, scripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const jobs = db
    .select({
      id: productionJobs.id,
      scriptId: productionJobs.scriptId,
      stage: productionJobs.stage,
      status: productionJobs.status,
      errorMessage: productionJobs.errorMessage,
      retryCount: productionJobs.retryCount,
      durationMs: productionJobs.durationMs,
      createdAt: productionJobs.createdAt,
      scriptHook: scripts.hook,
    })
    .from(productionJobs)
    .leftJoin(scripts, eq(productionJobs.scriptId, scripts.id))
    .orderBy(desc(productionJobs.createdAt))
    .limit(200)
    .all();

  return NextResponse.json(jobs);
}
```

- [ ] **Step 2: Retry API**

File: `web/src/app/api/production/[id]/retry/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { productionJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const job = db
    .select()
    .from(productionJobs)
    .where(eq(productionJobs.id, parseInt(id)))
    .get();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const queueMap: Record<string, string> = {
    tts: QUEUE_NAMES.TTS,
    animation: QUEUE_NAMES.ANIMATION,
    composition: QUEUE_NAMES.COMPOSITION,
    encode: QUEUE_NAMES.ENCODE,
  };

  const queue = queueMap[job.stage];
  if (!queue) return NextResponse.json({ error: "Unknown stage" }, { status: 400 });

  await enqueue(queue, `retry-${job.stage}`, {
    scriptId: job.scriptId,
    personaId: 1,
  });

  db.update(productionJobs)
    .set({ status: "pending", errorMessage: null })
    .where(eq(productionJobs.id, job.id))
    .run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Install progress bar component**

```bash
cd web
npx shadcn@latest add progress card
```

- [ ] **Step 4: Create production page**

File: `web/src/app/production/page.tsx`

```tsx
import { getDb } from "@/lib/db";
import { productionJobs, scripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { RetryButton } from "./components/retry-button";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  running: "outline",
  completed: "default",
  failed: "destructive",
};

const STAGES = ["tts", "animation", "composition", "encode"];

export default async function ProductionPage() {
  const db = getDb();
  const jobs = db
    .select({
      id: productionJobs.id,
      scriptId: productionJobs.scriptId,
      stage: productionJobs.stage,
      status: productionJobs.status,
      errorMessage: productionJobs.errorMessage,
      durationMs: productionJobs.durationMs,
      createdAt: productionJobs.createdAt,
      scriptHook: scripts.hook,
    })
    .from(productionJobs)
    .leftJoin(scripts, eq(productionJobs.scriptId, scripts.id))
    .orderBy(desc(productionJobs.createdAt))
    .limit(100)
    .all();

  const stats = {
    running: jobs.filter((j) => j.status === "running").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Production</h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Running", value: stats.running, color: "text-blue-400" },
          { label: "Completed", value: stats.completed, color: "text-green-400" },
          { label: "Failed", value: stats.failed, color: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Script</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="max-w-[200px] truncate font-mono text-xs">
                {job.scriptHook ?? `Script #${job.scriptId}`}
              </TableCell>
              <TableCell className="font-mono text-xs uppercase">{job.stage}</TableCell>
              <TableCell>
                <Badge variant={STATUS_COLORS[job.status] ?? "outline"}>
                  {job.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : "—"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-red-400">
                {job.errorMessage ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {job.status === "failed" && (
                  <RetryButton jobId={job.id} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Create retry button (client)**

File: `web/src/app/production/components/retry-button.tsx`

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RetryButton({ jobId }: { jobId: number }) {
  const router = useRouter();
  async function retry() {
    await fetch(`/api/production/${jobId}/retry`, { method: "POST" });
    router.refresh();
  }
  return (
    <Button variant="outline" size="sm" onClick={retry}>
      Retry
    </Button>
  );
}
```

- [ ] **Step 6: Verify production page**

```bash
cd web && npm run dev
```

Visit http://localhost:3000/production — stats cards and empty job table.

- [ ] **Step 7: Commit**

```bash
cd ..
git add web/src/app/api/production/ web/src/app/production/
git commit -m "feat: add production queue UI with job tracker, retry actions, and stats"
```

---

## Verification

1. `npm run dev` — Workers start messages in terminal
2. http://localhost:3000/production — page loads with stat cards
3. POST `/api/llm/generate` with `{"type":"ideas","personaId":1}` — job appears in BullMQ
4. Automation config defaults to manual — jobs stop at each stage pending approval
