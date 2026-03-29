# Plan 1: Foundation — Project Scaffold, Database, Shared Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the two-service project structure with a working database, Redis connection, and shared utilities — the foundation everything else builds on.

**Architecture:** Next.js 16 App Router (web/) + Python FastAPI (pipeline/) sharing SQLite via Drizzle ORM and Redis via BullMQ. Docker Compose for Redis.

**Tech Stack:** Next.js 16, Drizzle ORM, better-sqlite3, BullMQ, Redis, FastAPI, Python 3.11+, Docker Compose

**Spec:** `docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md`

---

## File Map

### New files — web service
- `web/package.json` — Node dependencies
- `web/next.config.ts` — Next.js config
- `web/tsconfig.json` — TypeScript config
- `web/src/app/layout.tsx` — Root layout with sidebar shell
- `web/src/app/page.tsx` — Redirect to dashboard
- `web/src/lib/db/index.ts` — Drizzle client with WAL mode + busy timeout
- `web/src/lib/db/schema.ts` — Full Drizzle schema (all tables)
- `web/src/lib/db/seed.ts` — Seed script for platforms + default persona
- `web/src/lib/queue/connection.ts` — BullMQ Redis connection config
- `web/src/lib/queue/producers.ts` — Job enqueue helpers per queue
- `web/drizzle.config.ts` — Drizzle Kit config pointing to shared/db
- `web/drizzle/` — Generated migrations (auto)

### New files — pipeline service
- `pipeline/main.py` — FastAPI entrypoint with health route
- `pipeline/db.py` — Python SQLite client with WAL mode + busy timeout
- `pipeline/queue_connection.py` — Python Redis/BullMQ connection
- `pipeline/requirements.txt` — Python dependencies
- `pipeline/workers/__init__.py` — Workers package

### New files — shared
- `shared/db/.gitkeep` — Ensure directory exists
- `shared/assets/identity/.gitkeep`
- `shared/assets/audio/.gitkeep`
- `shared/assets/animation/.gitkeep`
- `shared/assets/renders/.gitkeep`
- `shared/assets/templates/.gitkeep`

### New files — root
- `docker-compose.yml` — Redis service
- `.gitignore` — Node, Python, SQLite, .env patterns
- `.env.example` — Environment variable template

---

## Task 1: Root project files

**Files:**
- Create: `docker-compose.yml`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `shared/db/.gitkeep`
- Create: `shared/assets/identity/.gitkeep`
- Create: `shared/assets/audio/.gitkeep`
- Create: `shared/assets/animation/.gitkeep`
- Create: `shared/assets/renders/.gitkeep`
- Create: `shared/assets/templates/.gitkeep`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.next/
.env
.env.local
*.db
*.db-wal
*.db-shm
__pycache__/
*.pyc
.venv/
dist/
.DS_Store
shared/assets/audio/*
shared/assets/animation/*
shared/assets/renders/*
!shared/assets/**/.gitkeep
```

- [ ] **Step 3: Create .env.example**

```
# Redis
REDIS_URL=redis://localhost:6379

# SQLite
DATABASE_PATH=../shared/db/ugc.db

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

# Pipeline
PIPELINE_URL=http://localhost:8000
```

- [ ] **Step 4: Create shared directory structure**

```bash
mkdir -p shared/db shared/assets/{identity,audio,animation,renders,templates}
touch shared/db/.gitkeep shared/assets/identity/.gitkeep shared/assets/audio/.gitkeep shared/assets/animation/.gitkeep shared/assets/renders/.gitkeep shared/assets/templates/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .gitignore .env.example shared/
git commit -m "feat: add root project files, docker-compose for Redis, shared dirs"
```

---

## Task 2: Scaffold Next.js web service

**Files:**
- Create: `web/` (via create-next-app)
- Modify: `web/next.config.ts`
- Modify: `web/package.json` (add dependencies)

- [ ] **Step 1: Create Next.js app**

```bash
cd web
npx create-next-app@latest . --yes --force --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
```

- [ ] **Step 2: Install dependencies**

```bash
npm install drizzle-orm better-sqlite3 bullmq dotenv
npm install -D drizzle-kit @types/better-sqlite3
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Visit http://localhost:3000 — confirm Next.js welcome page loads. Kill the server.

- [ ] **Step 4: Commit**

```bash
cd ..
git add web/
git commit -m "feat: scaffold Next.js 16 web service"
```

---

## Task 3: Database schema with Drizzle

**Files:**
- Create: `web/src/lib/db/schema.ts`
- Create: `web/src/lib/db/index.ts`
- Create: `web/drizzle.config.ts`

- [ ] **Step 1: Create Drizzle config**

File: `web/drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH || "../shared/db/ugc.db",
  },
});
```

- [ ] **Step 2: Create full database schema**

File: `web/src/lib/db/schema.ts`

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamp = () =>
  text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`);

const updatedAt = () =>
  text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`);

// --- Core entities ---

export const personas = sqliteTable("personas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  niche: text("niche"),
  voiceTone: text("voice_tone"),
  visualStyle: text("visual_style"),
  bannedClaims: text("banned_claims"), // JSON array
  identityPackPath: text("identity_pack_path"),
  automationConfig: text("automation_config"), // JSON
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const platforms = sqliteTable("platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // tiktok, instagram, youtube
  displayName: text("display_name").notNull(),
  exportConfig: text("export_config"), // JSON: resolution, aspect ratio, max duration
  defaultFrequencyCap: integer("default_frequency_cap").default(3),
});

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  platformId: integer("platform_id")
    .notNull()
    .references(() => platforms.id),
  handle: text("handle"),
  apiCredentials: text("api_credentials"), // JSON, encrypted later
  frequencyCap: integer("frequency_cap"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: timestamp(),
});

export const contentPillars = sqliteTable("content_pillars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  name: text("name").notNull(),
  description: text("description"),
  promptGuidance: text("prompt_guidance"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: timestamp(),
});

export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  pillarId: integer("pillar_id").references(() => contentPillars.id),
  topic: text("topic").notNull(),
  angle: text("angle"),
  hookSketch: text("hook_sketch"),
  status: text("status").notNull().default("generated"), // generated/approved/rejected/scripted
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const scripts = sqliteTable("scripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  ideaId: integer("idea_id").references(() => ideas.id),
  pillarId: integer("pillar_id").references(() => contentPillars.id),
  platformTarget: text("platform_target"),
  hook: text("hook"),
  openingLine: text("opening_line"),
  bodyBeats: text("body_beats"), // JSON array
  proofDemoBeat: text("proof_demo_beat"),
  ctaClosingBeat: text("cta_closing_beat"),
  estimatedDuration: integer("estimated_duration"), // seconds
  visualPlan: text("visual_plan"), // JSON
  captionIdeas: text("caption_ideas"), // JSON array
  hashtags: text("hashtags"), // JSON array
  experimentMetadata: text("experiment_metadata"), // JSON
  status: text("status").notNull().default("generated"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const scriptVariants = sqliteTable("script_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id")
    .notNull()
    .references(() => scripts.id),
  variantType: text("variant_type").notNull(), // hook/cta/opening
  content: text("content").notNull(),
  createdAt: timestamp(),
});

export const productionJobs = sqliteTable("production_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id")
    .notNull()
    .references(() => scripts.id),
  stage: text("stage").notNull(), // tts/animation/composition/encode
  status: text("status").notNull().default("pending"),
  bullmqJobId: text("bullmq_job_id"),
  inputPath: text("input_path"),
  outputPath: text("output_path"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  durationMs: integer("duration_ms"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scriptId: integer("script_id")
    .notNull()
    .references(() => scripts.id),
  productionJobId: integer("production_job_id").references(
    () => productionJobs.id
  ),
  assetType: text("asset_type").notNull(), // audio/animation/video/thumbnail
  filePath: text("file_path").notNull(),
  durationSeconds: real("duration_seconds"),
  fileSizeBytes: integer("file_size_bytes"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp(),
});

export const assetVariants = sqliteTable("asset_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id),
  variantType: text("variant_type").notNull(), // caption_style/cta_ending/first_frame
  filePath: text("file_path").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp(),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id),
  scriptId: integer("script_id").references(() => scripts.id),
  platformPostId: text("platform_post_id"),
  caption: text("caption"),
  hashtags: text("hashtags"), // JSON array
  hookType: text("hook_type"),
  format: text("format"),
  durationBucket: text("duration_bucket"),
  ctaType: text("cta_type"),
  postingTimeBucket: text("posting_time_bucket"),
  visualTemplate: text("visual_template"),
  voiceType: text("voice_type"),
  subtitleStyle: text("subtitle_style"),
  status: text("status").notNull().default("scheduled"),
  scheduledAt: text("scheduled_at"),
  postedAt: text("posted_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp(),
});

export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  postId: integer("post_id").references(() => posts.id),
  scheduledAt: text("scheduled_at").notNull(),
  status: text("status").notNull().default("pending"), // pending/posted/failed/cancelled
  createdAt: timestamp(),
});

export const experiments = sqliteTable("experiments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  name: text("name").notNull(),
  description: text("description"),
  variable: text("variable").notNull(), // posting_time/hook/template/cta
  status: text("status").notNull().default("active"),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  createdAt: timestamp(),
});

export const experimentAssignments = sqliteTable("experiment_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  experimentId: integer("experiment_id")
    .notNull()
    .references(() => experiments.id),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id),
  arm: text("arm").notNull(), // control/variant_a/variant_b
  createdAt: timestamp(),
});

export const performanceSnapshots = sqliteTable("performance_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  views: integer("views"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  saves: integer("saves"),
  reach: integer("reach"),
  impressions: integer("impressions"),
  watchTimeSeconds: real("watch_time_seconds"),
  avgWatchPercent: real("avg_watch_percent"),
  followerConversions: integer("follower_conversions"),
  clicks: integer("clicks"),
  rawData: text("raw_data"), // JSON: full API response
  snapshotAt: text("snapshot_at").notNull(),
  createdAt: timestamp(),
});

export const recommendations = sqliteTable("recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id")
    .notNull()
    .references(() => personas.id),
  type: text("type").notNull(), // weekly_retro/content_suggestion/posting_time/niche_research
  title: text("title").notNull(),
  content: text("content").notNull(), // Markdown
  actionable: integer("actionable", { mode: "boolean" }).default(true),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: timestamp(),
});

export const systemLogs = sqliteTable("system_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  level: text("level").notNull(), // info/warn/error
  source: text("source").notNull(), // queue name or module name
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: timestamp(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id").references(() => personas.id),
  key: text("key").notNull(),
  value: text("value").notNull(),
});
```

- [ ] **Step 3: Create database client**

File: `web/src/lib/db/index.ts`

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const DATABASE_PATH = process.env.DATABASE_PATH || "../shared/db/ugc.db";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const sqlite = new Database(DATABASE_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}
```

- [ ] **Step 4: Generate and run migration**

```bash
cd web
npx drizzle-kit generate
npx drizzle-kit push
```

Verify: `ls ../shared/db/` should show `ugc.db`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add web/src/lib/db/ web/drizzle.config.ts web/drizzle/
git commit -m "feat: add Drizzle schema with all 17 tables, WAL mode SQLite client"
```

---

## Task 4: Seed script for platforms and default persona

**Files:**
- Create: `web/src/lib/db/seed.ts`

- [ ] **Step 1: Create seed script**

File: `web/src/lib/db/seed.ts`

```typescript
import { getDb } from "./index";
import { personas, platforms } from "./schema";

async function seed() {
  const db = getDb();

  // Seed platforms
  const existingPlatforms = db.select().from(platforms).all();
  if (existingPlatforms.length === 0) {
    db.insert(platforms)
      .values([
        {
          name: "tiktok",
          displayName: "TikTok",
          exportConfig: JSON.stringify({
            resolution: "1080x1920",
            aspectRatio: "9:16",
            maxDuration: 60,
            format: "mp4",
          }),
          defaultFrequencyCap: 3,
        },
        {
          name: "instagram",
          displayName: "Instagram Reels",
          exportConfig: JSON.stringify({
            resolution: "1080x1920",
            aspectRatio: "9:16",
            maxDuration: 90,
            format: "mp4",
          }),
          defaultFrequencyCap: 2,
        },
        {
          name: "youtube",
          displayName: "YouTube Shorts",
          exportConfig: JSON.stringify({
            resolution: "1080x1920",
            aspectRatio: "9:16",
            maxDuration: 60,
            format: "mp4",
          }),
          defaultFrequencyCap: 3,
        },
      ])
      .run();
    console.log("Seeded platforms");
  }

  // Seed default persona
  const existingPersonas = db.select().from(personas).all();
  if (existingPersonas.length === 0) {
    db.insert(personas)
      .values({
        name: "Default Creator",
        automationConfig: JSON.stringify({
          ideation: { mode: "manual", batch_size: 10, cron: "0 6 * * *" },
          script_gen: { mode: "manual" },
          asset_production: { mode: "manual" },
          qa_review: { mode: "manual" },
          scheduling: { mode: "manual", strategy: "best_time" },
          posting: { mode: "manual" },
          performance_ingest: { mode: "auto", cron: "0 */6 * * *" },
        }),
      })
      .run();
    console.log("Seeded default persona");
  }

  console.log("Seed complete");
}

seed();
```

- [ ] **Step 2: Add seed script to package.json**

Add to `web/package.json` scripts:

```json
"db:seed": "npx tsx src/lib/db/seed.ts"
```

- [ ] **Step 3: Run seed**

```bash
cd web
npm run db:seed
```

Expected: "Seeded platforms", "Seeded default persona", "Seed complete"

- [ ] **Step 4: Commit**

```bash
cd ..
git add web/src/lib/db/seed.ts web/package.json
git commit -m "feat: add seed script for platforms and default persona"
```

---

## Task 5: BullMQ connection and queue producers

**Files:**
- Create: `web/src/lib/queue/connection.ts`
- Create: `web/src/lib/queue/producers.ts`

- [ ] **Step 1: Create Redis connection**

File: `web/src/lib/queue/connection.ts`

```typescript
import { ConnectionOptions } from "bullmq";

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};
```

- [ ] **Step 2: Create queue producers**

File: `web/src/lib/queue/producers.ts`

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "./connection";

const queues = new Map<string, Queue>();

function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: redisConnection }));
  }
  return queues.get(name)!;
}

export const QUEUE_NAMES = {
  IDEATION: "ideation",
  SCRIPT_GEN: "script-gen",
  TTS: "tts",
  ANIMATION: "animation",
  COMPOSITION: "composition",
  ENCODE: "encode",
  QA: "qa",
  SCHEDULE: "schedule",
  POST: "post",
} as const;

export async function enqueue(
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
  opts?: { delay?: number; attempts?: number }
) {
  const queue = getQueue(queueName);
  return queue.add(jobName, data, {
    attempts: opts?.attempts ?? 3,
    backoff: { type: "exponential", delay: 5000 },
    delay: opts?.delay,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });
}
```

- [ ] **Step 3: Verify Redis connection**

Start Redis first:

```bash
docker compose up -d redis
```

Then test in a quick script or Node REPL:

```bash
cd web
node -e "const {Queue} = require('bullmq'); const q = new Queue('test', {connection: {host:'localhost', port:6379}}); q.add('ping', {}).then(j => { console.log('Job added:', j.id); process.exit(0); })"
```

Expected: "Job added: <some-id>"

- [ ] **Step 4: Commit**

```bash
cd ..
git add web/src/lib/queue/
git commit -m "feat: add BullMQ connection and queue producer utilities"
```

---

## Task 6: Python pipeline service scaffold

**Files:**
- Create: `pipeline/main.py`
- Create: `pipeline/db.py`
- Create: `pipeline/queue_connection.py`
- Create: `pipeline/requirements.txt`
- Create: `pipeline/workers/__init__.py`

- [ ] **Step 1: Create requirements.txt**

File: `pipeline/requirements.txt`

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
python-dotenv==1.0.*
aiosqlite==0.20.*
redis==5.2.*
```

- [ ] **Step 2: Set up Python virtual environment**

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 3: Create FastAPI entrypoint**

File: `pipeline/main.py`

```python
import os
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

app = FastAPI(title="UGC Pipeline Service")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pipeline"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

- [ ] **Step 4: Create Python DB client**

File: `pipeline/db.py`

```python
import os
import sqlite3
from contextlib import contextmanager

DATABASE_PATH = os.getenv("DATABASE_PATH", "../shared/db/ugc.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
```

- [ ] **Step 5: Create Python queue connection**

File: `pipeline/queue_connection.py`

```python
import os
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis_client = redis.from_url(REDIS_URL)
```

- [ ] **Step 6: Create workers package**

File: `pipeline/workers/__init__.py`

```python
# Pipeline workers package
```

- [ ] **Step 7: Verify pipeline service starts**

```bash
cd pipeline
source .venv/bin/activate
python main.py
```

Visit http://localhost:8000/health — should return `{"status":"ok","service":"pipeline"}`. Kill the server.

- [ ] **Step 8: Commit**

```bash
cd ..
git add pipeline/
git commit -m "feat: scaffold Python FastAPI pipeline service with DB and Redis clients"
```

---

## Task 7: App shell with sidebar layout

**Files:**
- Create: `web/src/app/layout.tsx` (modify existing)
- Create: `web/src/app/page.tsx` (modify existing)
- Create: `web/src/components/sidebar.tsx`

- [ ] **Step 1: Install shadcn/ui**

```bash
cd web
npx shadcn@latest init -d
```

- [ ] **Step 2: Install sidebar-relevant shadcn components**

```bash
npx shadcn@latest add button separator tooltip scroll-area
```

- [ ] **Step 3: Create sidebar component**

File: `web/src/components/sidebar.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Clapperboard,
  Library,
  CalendarDays,
  BarChart3,
  Lightbulb,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/scripts", label: "Scripts", icon: FileText },
  { href: "/production", label: "Production", icon: Clapperboard },
  { href: "/library", label: "Library", icon: Library },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/recommendations", label: "Insights", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Sparkles className="h-5 w-5" />
        <span className="font-semibold">Creator OS</span>
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn("justify-start gap-2", isActive && "font-medium")}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-3 text-xs text-muted-foreground">
        Virtual Creator OS v0.1
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Update root layout**

Replace contents of `web/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Virtual Creator OS",
  description: "Local-first content engine for virtual creator accounts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="antialiased">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Update home page**

Replace contents of `web/src/app/page.tsx`:

```tsx
export default function OverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-2 text-muted-foreground">
        Dashboard coming soon. Foundation is set up.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Verify the app shell**

```bash
cd web
npm run dev
```

Visit http://localhost:3000 — should see dark sidebar with nav links and "Overview" page content. Kill the server.

- [ ] **Step 7: Commit**

```bash
cd ..
git add web/src/
git commit -m "feat: add app shell with dark sidebar navigation"
```

---

## Verification

After completing all tasks, confirm:

1. `docker compose up -d redis` — Redis running
2. `cd web && npm run dev` — Next.js starts at :3000 with sidebar
3. `cd pipeline && python main.py` — FastAPI starts at :8000, /health returns ok
4. `ls shared/db/ugc.db` — Database file exists with all tables
5. All 7 commits in git log
