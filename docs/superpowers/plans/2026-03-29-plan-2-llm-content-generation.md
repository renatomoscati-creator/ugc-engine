# Plan 2: LLM & Content Generation — Ollama Integration, Ideas, Scripts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Ollama client, idea generation, and script generation pipeline with structured outputs and a working approval queue UI.

**Architecture:** Thin Ollama wrapper in `lib/ollama/` → API routes → BullMQ jobs for batch generation → Script queue UI with approve/reject/regenerate actions.

**Tech Stack:** Ollama REST API, Next.js API routes, BullMQ, Drizzle ORM, shadcn/ui (Table, Dialog, Badge)

**Prereqs:** Plan 1 complete (database, queue connection, app shell running)

**Spec:** `docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md` §9 LLM Integration

---

## File Map

- Create: `web/src/lib/ollama/client.ts` — Ollama HTTP wrapper
- Create: `web/src/lib/ollama/prompts.ts` — Prompt templates
- Create: `web/src/lib/ollama/types.ts` — Shared response types
- Create: `web/src/workers/ideation-worker.ts` — BullMQ consumer for idea generation
- Create: `web/src/workers/script-worker.ts` — BullMQ consumer for script generation
- Create: `web/src/app/api/llm/generate/route.ts` — Trigger batch generation
- Create: `web/src/app/api/scripts/route.ts` — List scripts with filters
- Create: `web/src/app/api/scripts/[id]/route.ts` — Approve/reject/regenerate
- Create: `web/src/app/api/ideas/route.ts` — List and approve ideas
- Create: `web/src/app/scripts/page.tsx` — Script queue UI
- Create: `web/src/app/scripts/components/script-table.tsx` — Script list with actions
- Create: `web/src/app/scripts/components/script-detail-dialog.tsx` — Full script view

---

## Task 1: Ollama client wrapper

**Files:**
- Create: `web/src/lib/ollama/types.ts`
- Create: `web/src/lib/ollama/client.ts`
- Create: `web/src/lib/ollama/prompts.ts`

- [ ] **Step 1: Create shared types**

File: `web/src/lib/ollama/types.ts`

```typescript
export interface IdeaOutput {
  topic: string;
  angle: string;
  hookSketch: string;
  pillarName: string;
}

export interface ScriptOutput {
  hook: string;
  openingLine: string;
  bodyBeats: string[];
  proofDemoBeat: string;
  ctaClosingBeat: string;
  estimatedDuration: number;
  visualPlan: {
    talkingHeadPercent: number;
    overlayTypes: string[];
    brollSuggestions: string[];
  };
  captionIdeas: string[];
  hashtags: string[];
  hookType: string;
  format: string;
  ctaType: string;
}
```

- [ ] **Step 2: Create Ollama client**

File: `web/src/lib/ollama/client.ts`

```typescript
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const CONCURRENCY_LIMIT = 3;

interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generate(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model ?? OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.response as string;
}

export async function generateJSON<T>(
  prompt: string,
  options: GenerateOptions = {}
): Promise<T> {
  const raw = await generate(prompt, { ...options, temperature: 0.3 });
  const match = raw.match(/```json\n?([\s\S]*?)\n?```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error(`No JSON found in response: ${raw.slice(0, 200)}`);
  return JSON.parse(match[1]) as T;
}

export async function batch<T>(
  prompts: string[],
  options: GenerateOptions = {}
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < prompts.length; i += CONCURRENCY_LIMIT) {
    const chunk = prompts.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.all(
      chunk.map((p) => generateJSON<T>(p, options))
    );
    results.push(...chunkResults);
  }
  return results;
}
```

- [ ] **Step 3: Create prompt templates**

File: `web/src/lib/ollama/prompts.ts`

```typescript
import type { IdeaOutput, ScriptOutput } from "./types";

export function ideaGenerationPrompt(params: {
  personaName: string;
  niche: string;
  voiceTone: string;
  pillarName: string;
  pillarDescription: string;
  bannedClaims: string[];
  count: number;
}): string {
  return `You are a content strategist for a virtual creator named "${params.personaName}" in the ${params.niche} niche.

Voice and tone: ${params.voiceTone}
Content pillar: ${params.pillarName} — ${params.pillarDescription}
Banned claims or restricted topics: ${params.bannedClaims.join(", ") || "none"}

Generate exactly ${params.count} short-form video content ideas for TikTok/Instagram Reels/YouTube Shorts.
Each idea should be highly specific, scroll-stopping, and optimized for the 15-30 second format.

Respond with ONLY a JSON array:
\`\`\`json
[
  {
    "topic": "specific topic of the video",
    "angle": "unique angle or perspective that makes this interesting",
    "hookSketch": "opening 3-5 words that would stop someone scrolling",
    "pillarName": "${params.pillarName}"
  }
]
\`\`\``;
}

export function scriptGenerationPrompt(params: {
  personaName: string;
  niche: string;
  voiceTone: string;
  topic: string;
  angle: string;
  hookSketch: string;
  platform: string;
  bannedClaims: string[];
}): string {
  return `You are writing a short-form video script for a virtual creator named "${params.personaName}" in the ${params.niche} niche.

Platform: ${params.platform}
Voice and tone: ${params.voiceTone}
Topic: ${params.topic}
Angle: ${params.angle}
Suggested hook: ${params.hookSketch}
Banned claims: ${params.bannedClaims.join(", ") || "none"}

Write a complete 15-30 second script. The video structure is:
- 0-2s: Hook (character visible, hook text overlay)
- 2-6s: Talking-head beat (main claim or promise)
- 6-14s: Overlays/screenshots/list cards (supporting content)
- 14-20s: Return to face for payoff and CTA

Respond with ONLY a JSON object:
\`\`\`json
{
  "hook": "exact hook line (under 8 words)",
  "openingLine": "first spoken sentence (talking head beat)",
  "bodyBeats": ["beat 1", "beat 2", "beat 3"],
  "proofDemoBeat": "supporting fact, stat, or demonstration",
  "ctaClosingBeat": "closing call to action",
  "estimatedDuration": 22,
  "visualPlan": {
    "talkingHeadPercent": 30,
    "overlayTypes": ["text_card", "screenshot", "list"],
    "brollSuggestions": ["specific b-roll idea 1", "specific b-roll idea 2"]
  },
  "captionIdeas": ["caption option 1", "caption option 2"],
  "hashtags": ["#tag1", "#tag2"],
  "hookType": "question|mistake|secret|number_list|transformation",
  "format": "talking_head|faceless|hybrid",
  "ctaType": "follow|comment|share|link_in_bio"
}
\`\`\``;
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/ollama/
git commit -m "feat: add Ollama client with generate, generateJSON, batch helpers and prompt templates"
```

---

## Task 2: Ideation BullMQ worker

**Files:**
- Create: `web/src/workers/ideation-worker.ts`

- [ ] **Step 1: Create ideation worker**

File: `web/src/workers/ideation-worker.ts`

```typescript
import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_NAMES, enqueue } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { ideas, personas, contentPillars, settings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { batch, ideaGenerationPrompt } from "@/lib/ollama";

interface IdeationJobData {
  personaId: number;
  pillarId?: number;
  count?: number;
}

export function startIdeationWorker() {
  const worker = new Worker<IdeationJobData>(
    QUEUE_NAMES.IDEATION,
    async (job: Job<IdeationJobData>) => {
      console.log(`[ideation-worker] START jobId=${job.id}`);
      const db = getDb();
      const { personaId, pillarId, count = 10 } = job.data;

      const persona = db
        .select()
        .from(personas)
        .where(eq(personas.id, personaId))
        .get();
      if (!persona) throw new Error(`Persona ${personaId} not found`);

      const pillars = pillarId
        ? db
            .select()
            .from(contentPillars)
            .where(
              and(
                eq(contentPillars.id, pillarId),
                eq(contentPillars.personaId, personaId)
              )
            )
            .all()
        : db
            .select()
            .from(contentPillars)
            .where(
              and(
                eq(contentPillars.personaId, personaId),
                eq(contentPillars.isActive, true)
              )
            )
            .all();

      if (!pillars.length) throw new Error("No active pillars found");

      const perPillar = Math.ceil(count / pillars.length);
      const bannedClaims: string[] = persona.bannedClaims
        ? JSON.parse(persona.bannedClaims)
        : [];

      const prompts = pillars.map((pillar) =>
        ideaGenerationPrompt({
          personaName: persona.name,
          niche: persona.niche ?? "general",
          voiceTone: persona.voiceTone ?? "casual and engaging",
          pillarName: pillar.name,
          pillarDescription: pillar.description ?? "",
          bannedClaims,
          count: perPillar,
        })
      );

      const results = await batch<{ topic: string; angle: string; hookSketch: string }[]>(prompts);

      let inserted = 0;
      for (let i = 0; i < results.length; i++) {
        const pillar = pillars[i];
        for (const idea of results[i]) {
          db.insert(ideas)
            .values({
              personaId,
              pillarId: pillar.id,
              topic: idea.topic,
              angle: idea.angle,
              hookSketch: idea.hookSketch,
              status: "generated",
            })
            .run();
          inserted++;
        }
      }

      console.log(`[ideation-worker] DONE inserted=${inserted}`);
      return { inserted };
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[ideation-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
```

- [ ] **Step 2: Fix import path in worker**

The worker imports from `@/lib/ollama` — update `web/src/lib/ollama/index.ts` to export everything:

File: `web/src/lib/ollama/index.ts`

```typescript
export * from "./client";
export * from "./prompts";
export * from "./types";
```

- [ ] **Step 3: Commit**

```bash
git add web/src/workers/ideation-worker.ts web/src/lib/ollama/index.ts
git commit -m "feat: add BullMQ ideation worker — batch idea generation via Ollama"
```

---

## Task 3: Script generation BullMQ worker

**Files:**
- Create: `web/src/workers/script-worker.ts`

- [ ] **Step 1: Create script worker**

File: `web/src/workers/script-worker.ts`

```typescript
import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_NAMES, enqueue } from "@/lib/queue/producers";
import { getDb } from "@/lib/db";
import { scripts, ideas, personas, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateJSON } from "@/lib/ollama/client";
import { scriptGenerationPrompt } from "@/lib/ollama/prompts";
import type { ScriptOutput } from "@/lib/ollama/types";

interface ScriptJobData {
  ideaId: number;
  personaId: number;
  platform?: string;
}

export function startScriptWorker() {
  const worker = new Worker<ScriptJobData>(
    QUEUE_NAMES.SCRIPT_GEN,
    async (job: Job<ScriptJobData>) => {
      console.log(`[script-worker] START jobId=${job.id}`);
      const db = getDb();
      const { ideaId, personaId, platform = "tiktok" } = job.data;

      const idea = db.select().from(ideas).where(eq(ideas.id, ideaId)).get();
      if (!idea) throw new Error(`Idea ${ideaId} not found`);

      const persona = db
        .select()
        .from(personas)
        .where(eq(personas.id, personaId))
        .get();
      if (!persona) throw new Error(`Persona ${personaId} not found`);

      const bannedClaims: string[] = persona.bannedClaims
        ? JSON.parse(persona.bannedClaims)
        : [];

      const prompt = scriptGenerationPrompt({
        personaName: persona.name,
        niche: persona.niche ?? "general",
        voiceTone: persona.voiceTone ?? "casual and engaging",
        topic: idea.topic,
        angle: idea.angle ?? "",
        hookSketch: idea.hookSketch ?? "",
        platform,
        bannedClaims,
      });

      const result = await generateJSON<ScriptOutput>(prompt);

      db.insert(scripts)
        .values({
          personaId,
          ideaId,
          platformTarget: platform,
          hook: result.hook,
          openingLine: result.openingLine,
          bodyBeats: JSON.stringify(result.bodyBeats),
          proofDemoBeat: result.proofDemoBeat,
          ctaClosingBeat: result.ctaClosingBeat,
          estimatedDuration: result.estimatedDuration,
          visualPlan: JSON.stringify(result.visualPlan),
          captionIdeas: JSON.stringify(result.captionIdeas),
          hashtags: JSON.stringify(result.hashtags),
          experimentMetadata: JSON.stringify({
            hookType: result.hookType,
            format: result.format,
            ctaType: result.ctaType,
          }),
          status: "generated",
        })
        .run();

      // Mark idea as scripted
      db.update(ideas)
        .set({ status: "scripted" })
        .where(eq(ideas.id, ideaId))
        .run();

      console.log(`[script-worker] DONE ideaId=${ideaId}`);
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[script-worker] FAIL jobId=${job?.id}`, err.message);
  });

  return worker;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/workers/script-worker.ts
git commit -m "feat: add BullMQ script generation worker — Ollama structured output to SQLite"
```

---

## Task 4: API routes for ideas and scripts

**Files:**
- Create: `web/src/app/api/ideas/route.ts`
- Create: `web/src/app/api/scripts/route.ts`
- Create: `web/src/app/api/scripts/[id]/route.ts`
- Create: `web/src/app/api/llm/generate/route.ts`

- [ ] **Step 1: Ideas API**

File: `web/src/app/api/ideas/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const personaId = parseInt(searchParams.get("personaId") ?? "1");
  const status = searchParams.get("status");

  const db = getDb();
  let query = db.select().from(ideas).where(eq(ideas.personaId, personaId));
  const result = await query;
  const filtered = status ? result.filter((i) => i.status === status) : result;

  return NextResponse.json(filtered);
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  const db = getDb();
  db.update(ideas).set({ status }).where(eq(ideas.id, id)).run();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Scripts list API**

File: `web/src/app/api/scripts/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const personaId = parseInt(searchParams.get("personaId") ?? "1");
  const status = searchParams.get("status");

  const db = getDb();
  const result = db
    .select()
    .from(scripts)
    .where(eq(scripts.personaId, personaId))
    .orderBy(desc(scripts.createdAt))
    .all();

  const filtered = status ? result.filter((s) => s.status === status) : result;
  return NextResponse.json(filtered);
}
```

- [ ] **Step 3: Script actions API**

File: `web/src/app/api/scripts/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await req.json();
  const db = getDb();
  const scriptId = parseInt(id);

  if (action === "approve") {
    db.update(scripts).set({ status: "approved_for_production" }).where(eq(scripts.id, scriptId)).run();
    return NextResponse.json({ ok: true, status: "approved_for_production" });
  }

  if (action === "reject") {
    db.update(scripts).set({ status: "rejected" }).where(eq(scripts.id, scriptId)).run();
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action === "send_to_production") {
    const script = db.select().from(scripts).where(eq(scripts.id, scriptId)).get();
    if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });
    db.update(scripts).set({ status: "approved_for_production" }).where(eq(scripts.id, scriptId)).run();
    await enqueue(QUEUE_NAMES.TTS, "tts", { scriptId, personaId: script.personaId });
    return NextResponse.json({ ok: true, status: "in_production" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

- [ ] **Step 4: Batch generation trigger API**

File: `web/src/app/api/llm/generate/route.ts`

```typescript
import { NextResponse } from "next/server";
import { enqueue, QUEUE_NAMES } from "@/lib/queue/producers";

export async function POST(req: Request) {
  const { type, personaId, pillarId, count } = await req.json();

  if (type === "ideas") {
    const job = await enqueue(QUEUE_NAMES.IDEATION, "generate-ideas", {
      personaId: personaId ?? 1,
      pillarId,
      count: count ?? 10,
    });
    return NextResponse.json({ jobId: job.id });
  }

  if (type === "scripts") {
    // Queue script generation for all approved ideas
    const { getDb } = await import("@/lib/db");
    const { ideas } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const approvedIdeas = db
      .select()
      .from(ideas)
      .where(eq(ideas.status, "approved"))
      .all();

    const jobs = await Promise.all(
      approvedIdeas.map((idea) =>
        enqueue(QUEUE_NAMES.SCRIPT_GEN, "generate-script", {
          ideaId: idea.id,
          personaId: idea.personaId,
        })
      )
    );
    return NextResponse.json({ jobsQueued: jobs.length });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/app/api/
git commit -m "feat: add API routes for ideas, scripts CRUD, and LLM batch generation triggers"
```

---

## Task 5: Script queue UI

**Files:**
- Create: `web/src/app/scripts/page.tsx`

- [ ] **Step 1: Install needed shadcn components**

```bash
cd web
npx shadcn@latest add table badge dialog tabs select
```

- [ ] **Step 2: Create script queue page**

File: `web/src/app/scripts/page.tsx`

```tsx
import { getDb } from "@/lib/db";
import { scripts, ideas, contentPillars } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GenerateBatchButton } from "./components/generate-batch-button";
import { ScriptActions } from "./components/script-actions";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  generated: "secondary",
  approved_for_production: "default",
  rejected: "destructive",
  in_production: "outline",
  produced: "default",
};

export default async function ScriptsPage() {
  const db = getDb();
  const allScripts = db
    .select({
      id: scripts.id,
      hook: scripts.hook,
      openingLine: scripts.openingLine,
      platformTarget: scripts.platformTarget,
      estimatedDuration: scripts.estimatedDuration,
      status: scripts.status,
      createdAt: scripts.createdAt,
    })
    .from(scripts)
    .orderBy(desc(scripts.createdAt))
    .limit(100)
    .all();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scripts</h1>
          <p className="text-sm text-muted-foreground">
            {allScripts.length} scripts
          </p>
        </div>
        <GenerateBatchButton />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hook</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allScripts.map((script) => (
            <TableRow key={script.id}>
              <TableCell className="max-w-xs truncate font-medium">
                {script.hook ?? "—"}
              </TableCell>
              <TableCell className="capitalize">
                {script.platformTarget ?? "—"}
              </TableCell>
              <TableCell>{script.estimatedDuration}s</TableCell>
              <TableCell>
                <Badge variant={STATUS_COLORS[script.status] ?? "outline"}>
                  {script.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {script.createdAt}
              </TableCell>
              <TableCell className="text-right">
                <ScriptActions scriptId={script.id} status={script.status} />
              </TableCell>
            </TableRow>
          ))}
          {allScripts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No scripts yet. Generate ideas first, then generate scripts.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create generate batch button (client)**

File: `web/src/app/scripts/components/generate-batch-button.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function GenerateBatchButton() {
  const [loading, setLoading] = useState(false);

  async function handleGenerate(type: "ideas" | "scripts") {
    setLoading(true);
    try {
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, personaId: 1, count: 10 }),
      });
      const data = await res.json();
      alert(`Queued. Job: ${data.jobId ?? data.jobsQueued + " jobs"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => handleGenerate("ideas")}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Ideas
      </Button>
      <Button onClick={() => handleGenerate("scripts")} disabled={loading}>
        Generate Scripts
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create script actions (client)**

File: `web/src/app/scripts/components/script-actions.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export function ScriptActions({
  scriptId,
  status,
}: {
  scriptId: number;
  status: string;
}) {
  const router = useRouter();

  async function action(actionName: string) {
    await fetch(`/api/scripts/${scriptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "generated" && (
          <>
            <DropdownMenuItem onClick={() => action("approve")}>
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => action("reject")}>
              Reject
            </DropdownMenuItem>
          </>
        )}
        {status === "approved_for_production" && (
          <DropdownMenuItem onClick={() => action("send_to_production")}>
            Send to Production
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 5: Install dropdown menu**

```bash
cd web
npx shadcn@latest add dropdown-menu
```

- [ ] **Step 6: Verify the scripts page loads**

```bash
npm run dev
```

Visit http://localhost:3000/scripts — should show the table with "No scripts yet" message.

- [ ] **Step 7: Commit**

```bash
cd ..
git add web/src/app/scripts/
git commit -m "feat: add script queue UI with batch generation, approve/reject/produce actions"
```

---

## Verification

1. `npm run dev` — Scripts page loads with empty table
2. With Ollama running (`ollama run qwen3:8b`), POST to `/api/llm/generate` with `{"type":"ideas","personaId":1,"count":3}` — should enqueue a job (worker must be running)
3. `GET /api/scripts` — returns empty array initially
4. All commits in git log
