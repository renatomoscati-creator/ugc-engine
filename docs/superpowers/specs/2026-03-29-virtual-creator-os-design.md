# Design Spec: Local-First Virtual Creator Operating System

**Date:** 2026-03-29
**Status:** Approved
**Author:** Claude (design), Renato Moscati (decisions)

---

## 1. Overview

A localhost browser-based operating system for running an automated short-form content engine for a stylized virtual creator account. The system generates scripts via a local LLM, produces cheap video assets through a local ML pipeline, schedules and autoposts to TikTok/Instagram/YouTube Shorts, tracks performance, and uses the LLM to recommend improvements.

Commercial objective: build traction first, then monetize via sponsorships and brand ads.

---

## 2. Architecture

### Two-service model

The system runs as two cooperating processes plus supporting services:

- **Web service** (Node.js): Next.js 16 App Router serving the browser UI, API routes, Ollama integration, and Node-side BullMQ workers (Remotion rendering, scheduling).
- **Pipeline service** (Python): FastAPI application consuming BullMQ jobs for ML-heavy tasks (TTS, portrait animation, image generation, FFmpeg encoding).

Both services share a SQLite database file and a Redis instance for job coordination.

### SQLite concurrency strategy

SQLite supports only one writer at a time. Both services write to the same file. To prevent `SQLITE_BUSY` errors:

- **WAL mode** must be enabled on database creation (`PRAGMA journal_mode=WAL`).
- **Busy timeout** of 5000ms must be set in both the Drizzle (Node) and Python SQLite clients.
- Write-heavy operations (bulk job status updates) should batch writes in transactions.
- If contention becomes a bottleneck under load, the fallback is routing all writes through the web service's API, with the Python pipeline calling back via HTTP instead of writing directly.

### Process model (localhost)

| Process | Role |
|---------|------|
| `next dev` / `next start` | Web UI + API + Node workers |
| `python main.py` | FastAPI + Python pipeline workers |
| Redis | Job queue broker (Docker or brew) |
| Ollama | Local LLM serving Qwen 3 8B |
| ComfyUI | Image generation server (on-demand) |

### Communication flow

1. User action in browser hits a Next.js API route.
2. API route enqueues a job in BullMQ via Redis.
3. The appropriate worker (Node or Python) consumes the job.
4. Worker writes results to `shared/assets/` and updates SQLite.
5. UI reflects updated state via Server Components or polling.

---

## 3. Project Structure

```
ugc/
├── web/                          # Next.js 16 (UI + API + Node workers)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (dashboard)/      # Overview, analytics, experiments
│   │   │   ├── scripts/          # Script queue
│   │   │   ├── production/       # Asset production queue
│   │   │   ├── calendar/         # Scheduling calendar
│   │   │   ├── library/          # Content library
│   │   │   ├── recommendations/  # LLM insights
│   │   │   ├── settings/         # Strategy, persona, integrations
│   │   │   └── api/
│   │   │       ├── scripts/      # Script CRUD + generation trigger
│   │   │       ├── production/   # Production job triggers
│   │   │       ├── schedule/     # Scheduling endpoints
│   │   │       ├── analytics/    # Performance data
│   │   │       └── llm/          # Ollama proxy
│   │   ├── components/           # shadcn/ui + custom
│   │   ├── lib/
│   │   │   ├── db/               # Drizzle schema + SQLite client
│   │   │   ├── queue/            # BullMQ job producers
│   │   │   ├── ollama/           # Ollama client wrapper
│   │   │   └── utils/
│   │   └── workers/              # Node BullMQ consumers (Remotion, scheduling)
│   ├── drizzle/                  # Migrations
│   ├── package.json
│   └── next.config.ts
│
├── pipeline/                     # Python FastAPI (ML + asset pipeline)
│   ├── api/                      # FastAPI routes (health, status)
│   ├── workers/                  # Python BullMQ consumers
│   │   ├── tts.py                # Kokoro TTS
│   │   ├── animation.py          # LivePortrait
│   │   ├── comfyui.py            # ComfyUI image generation
│   │   └── ffmpeg.py             # FFmpeg encode/subtitles
│   ├── services/                 # Business logic per tool
│   ├── templates/                # Visual template configs (overlay layouts, scene definitions)
│   ├── requirements.txt
│   └── main.py                   # FastAPI entrypoint
│
├── shared/
│   ├── db/                       # SQLite database file
│   └── assets/                   # All generated assets
│       ├── identity/             # Locked character stills
│       ├── audio/                # TTS outputs
│       ├── animation/            # LivePortrait outputs
│       ├── renders/              # Final video outputs
│       └── templates/            # Overlays, B-roll
│
├── docker-compose.yml            # Redis
└── docs/
```

---

## 4. Data Model

Persona is the top-level entity. Each persona owns a set of platform accounts and all content flows through that persona's identity.

### Entity relationship

```
persona (1) ──→ (N) accounts (one per platform per persona)
persona (1) ──→ (N) content_pillars
pillar  (1) ──→ (N) ideas
idea    (1) ──→ (N) scripts
persona (1) ──→ (N) scripts
script  (1) ──→ (N) script_variants
script  (1) ──→ (N) production_jobs
production_job (1) ──→ (N) assets
asset   (1) ──→ (N) asset_variants
account (1) ──→ (N) posts
account (1) ──→ (N) schedules
account (1) ──→ (N) performance_snapshots
experiment (1) ──→ (N) experiment_assignments ←── post
persona (1) ──→ (N) recommendations
```

### Core tables

| Table | Purpose |
|-------|---------|
| `personas` | Virtual creator identity, voice/tone, visual style config, banned claims/restricted content rules |
| `platforms` | Reference table for supported platforms (tiktok, instagram, youtube) with platform-specific settings, export configs, frequency caps |
| `accounts` | Platform accounts linked to a persona and platform |
| `content_pillars` | Content categories per persona |
| `ideas` | Content ideas generated by LLM, with status (generated/approved/rejected/scripted), linked to pillar and persona |
| `scripts` | Generated scripts with structured fields (see below) |
| `script_variants` | Hook/CTA/opening variations per script |
| `production_jobs` | Pipeline job tracking (status, stage, logs, timing, retries) |
| `assets` | Generated files (audio, animation, video) |
| `asset_variants` | Visual/caption/CTA variants per asset |
| `posts` | Published content records |
| `schedules` | Posting calendar entries |
| `experiments` | A/B test definitions |
| `experiment_assignments` | Maps posts to experiment arms |
| `performance_snapshots` | Per-post per-platform metrics, timestamped |
| `recommendations` | LLM-generated insights |
| `system_logs` | Pipeline events, errors, audit trail |
| `settings` | Key-value config per persona |

### Post decomposition attributes

Every post must be decomposable into: `hook_type`, `pillar_id`, `format`, `duration_bucket`, `cta_type`, `posting_time_bucket`, `visual_template`, `voice_type`, `subtitle_style`. These enable the recommendation engine to find patterns.

### Script structured fields

Each script record includes: `script_id`, `persona_id`, `idea_id`, `platform_target`, `pillar_id`, `hook`, `opening_line`, `body_beats` (JSON array), `proof_demo_beat`, `cta_closing_beat`, `estimated_duration`, `visual_plan` (JSON), `caption_ideas` (JSON array), `hashtags` (JSON array), `experiment_metadata` (JSON), `status` (generated/review/approved/rejected/in_production/produced).

### Content operations statuses

Items flow through these statuses: `idea` → `script_generated` → `script_review` → `approved_for_production` → `production_in_progress` → `rendered` → `scheduled` → `posted` → `archived`. Failed items at any stage get `failed` status with error details.

---

## 5. Asset Pipeline Stack

| Stage | Tool | Runtime |
|-------|------|---------|
| Identity pack | ComfyUI + FLUX | Python (local GPU) |
| TTS / Voice | Kokoro | Python (local) |
| Portrait animation | LivePortrait | Python (local GPU) |
| Video composition | Remotion | Node.js (React templates) |
| Final encode | FFmpeg | CLI (called from Python or Node) |

### Cost profile

- Target: marginal cost per reel near zero (electricity + storage only).
- Budget: EUR 0-50/month effective cost.
- Overflow compute: Vast.ai or Runpod for GPU burst (only if local machine bottlenecks).

### Content format strategy

- 20-40% talking head (animated character)
- 60-80% overlays, text cards, screenshots, B-roll
- This reduces animation compute and looks more platform-native.

### Reel structure template

```
0-2s:  Character appears + hook text overlay
2-6s:  Talking-head beat (animated)
6-14s: Overlays / screenshots / B-roll / list cards
14-20s: Return to face for payoff/CTA
```

---

## 6. Pipeline Stages & Automation

Every stage supports two modes: **manual** (pauses for approval) and **auto** (flows through). Mode is configurable per-stage per-persona.

### Pipeline flow

```
1. IDEATION         → Ollama generates ideas from pillars + trends
2. SCRIPT GEN       → Ollama generates structured scripts
3. ASSET PRODUCTION  → Multi-step:
   3a. TTS           → Kokoro generates narration audio
   3b. ANIMATION     → LivePortrait animates character + audio
   3c. COMPOSITION   → Remotion assembles video
   3d. ENCODE        → FFmpeg final encode + subtitle burn-in
4. QA REVIEW        → Preview generated video
5. SCHEDULING       → Assign to posting calendar slot
6. POSTING          → Publish via platform API
7. PERFORMANCE      → Ingest metrics, feed to recommendation engine
```

### BullMQ queues

Each stage is a named queue. Job completion triggers the next stage:

```
ideation → script-gen → tts → animation → composition → encode → qa → schedule → post
```

Failed jobs retry with exponential backoff. After max retries, jobs enter dead-letter state visible in the operations dashboard.

### Automation config (per persona)

```json
{
  "ideation": { "mode": "auto", "batch_size": 30, "cron": "0 6 * * *" },
  "script_gen": { "mode": "auto" },
  "asset_production": { "mode": "auto" },
  "qa_review": { "mode": "auto" },
  "scheduling": { "mode": "auto", "strategy": "best_time" },
  "posting": { "mode": "auto" },
  "performance_ingest": { "mode": "auto", "cron": "0 */6 * * *" }
}
```

Day 1: set everything to manual. Flip stages to auto as confidence grows. Full auto-pilot is achievable once the pipeline is stable.

---

## 7. Scheduling & Cron

| Cron Job | Default Schedule | Purpose |
|----------|-----------------|---------|
| `daily-batch` | `0 6 * * *` | Triggers full ideation-to-production chain |
| `performance-ingest` | `0 */6 * * *` | Pulls metrics from platform APIs |
| `weekly-retrospective` | `0 9 * * 1` | Triggers Ollama analysis + recommendations |
| `post-dispatcher` | `*/15 * * * *` | Checks schedule queue, fires posts at assigned times |

All crons are BullMQ repeatable jobs, configurable per persona in settings.

### Frequency caps

Each platform-persona combination has configurable frequency caps (e.g., max 3 posts/day on TikTok, max 2 Reels/day on Instagram). The `post-dispatcher` cron respects these caps and defers excess posts to the next available slot.

---

## 8. Frontend Pages

Built with Next.js 16 App Router + shadcn/ui + Tailwind. Server Components for data, Client Components only where interactivity is needed.

| Page | Purpose |
|------|---------|
| **Overview** | KPIs, recent posts, pipeline health, next scheduled posts |
| **Strategy** | Persona editor, content pillars, platform config, automation toggles per stage |
| **Scripts** | Queue table with filters, approve/reject/regenerate, batch generate |
| **Production** | Job tracker with stage progress, logs, retry actions |
| **Library** | Grid/list of rendered assets with preview, filter by pillar/platform/status |
| **Calendar** | Weekly/monthly view of scheduled + posted content |
| **Analytics** | Tabs: Executive, Creative, Experiments, Operations |
| **Recommendations** | LLM insight feed, on-demand analysis trigger |
| **Settings** | LLM endpoint, platform API keys, automation config, persona management |

---

## 9. LLM Integration

### Ollama client

- Endpoint: `http://localhost:11434/api` (OpenAI-compatible)
- Model: Qwen 3 8B (configurable)
- Used for: script generation, performance analysis, recommendations, niche research

### Integration surface

A thin wrapper in `web/src/lib/ollama/` that exposes:
- `generate(prompt, options)` — single completion
- `chat(messages, options)` — multi-turn conversation
- `batch(prompts, options)` — parallel generation with concurrency limit

Structured outputs are enforced via system prompts with JSON schema instructions plus response parsing/validation.

---

## 10. Niche Research Workflow

Before content production begins, the system supports niche research as a first-class use case:

1. Operator provides candidate niches or asks for suggestions.
2. System uses Ollama to analyze: audience size signals, competition density, content gaps, monetization potential, platform fit.
3. Results are stored as recommendation records and displayed in the Recommendations page.
4. Operator selects a niche and configures the persona accordingly.

This will be designed as a guided workflow in the Strategy page.

---

## 11. Multi-Persona Design

The system is persona-scoped from day one:

- Persona 1 → TikTok Account 1, IG Account 1, YT Account 1
- Persona 2 → TikTok Account 2, IG Account 2, YT Account 2

V1 runs with a single persona. The UI and data model support multiple personas without migration. Persona selector in the sidebar switches all views.

---

## 12. Platform Posting (Deferred)

Autoposting is designed but implemented last. The system produces ready-to-post packages (video file + caption + hashtags + metadata) regardless of whether the posting API is connected.

Platform API requirements (for when accounts are set up):
- **TikTok**: Content Posting API (developer app approval required)
- **Instagram**: Meta Business account + Instagram Graph API (Reels publishing)
- **YouTube**: YouTube Data API v3 (standard video upload for Shorts)

The posting module has a clean interface: `post(account, asset, metadata) → result`. Platform adapters implement this interface.

---

## 13. Tech Stack Summary

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 + shadcn/ui + Tailwind |
| Backend API | Next.js API routes |
| Database | SQLite + Drizzle ORM |
| Job Queue | BullMQ + Redis |
| LLM | Ollama (Qwen 3 8B) via REST |
| TTS | Kokoro (local Python) |
| Animation | LivePortrait (local Python) |
| Image Gen | ComfyUI + FLUX (local) |
| Video Assembly | Remotion (React) + FFmpeg |
| Pipeline Service | Python FastAPI |

---

## 14. MVP Scope (Phase 1)

Goal: prove end-to-end loop from prompt to rendered video with manual posting.

Includes:
- Ollama integration (generate + analyze)
- Idea generation and approval queue
- Script generation with structured output
- Manual approval queue
- Asset pipeline (TTS + animation + composition + encode)
- Content library with preview
- Basic scheduling calendar
- Basic autoposting for at least one platform (operator sets up API access)
- Basic dashboard (posts count, pipeline health, growth metrics)
- Basic recommendation reports (LLM-generated weekly insights)
- Automation toggles (manual/auto per stage)
- Single persona with multi-platform account support

Success metric: the system can go from prompt to published content with performance data flowing back in.

Does NOT include in MVP:
- A/B experiment framework
- Advanced analytics (creative performance breakdown, experiment results)
- Posting-time optimization algorithm
- Multi-persona parallel production

---

## 15. Phase 2: Optimization Layer

- Platform API autoposting (TikTok, IG, YT)
- Performance metric ingestion
- Posting-time A/B testing
- Multi-variant generation (multiple hooks/CTAs per script)
- Experiment dashboard
- Recommendation engine with weekly retrospectives
- Richer analytics (creative performance, experiment results)

## 16. Phase 3: Scale Layer

- Larger batch orchestration
- Advanced asset reuse and template management
- Script/idea ranking by predicted performance
- Weekly/monthly strategic reports
- Multi-persona production (parallel pipelines)
- Overflow compute integration (Runpod/Vast.ai)
