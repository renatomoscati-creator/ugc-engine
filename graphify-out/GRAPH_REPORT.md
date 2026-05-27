# Graph Report - .  (2026-04-16)

## Corpus Check
- 132 files · ~50,718 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 262 nodes · 362 edges · 29 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `Virtual Creator OS Design Spec` - 12 edges
2. `Plan 1: Foundation & Scaffold` - 7 edges
3. `Web Service (Node.js / Next.js)` - 6 edges
4. `Plan 5: Web UI Pages` - 6 edges
5. `Virtual Creator OS PRD` - 5 edges
6. `Plan 2: LLM & Content Generation` - 5 edges
7. `Plan 3: Python Pipeline (TTS/Animation/Encoding)` - 5 edges
8. `Plan 4: Job Orchestration & Automation` - 5 edges
9. `Plan 6: Scheduling & Posting` - 5 edges
10. `Plan 7: Analytics & Recommendations` - 5 edges

## Surprising Connections (you probably didn't know these)
- `App Icon - Red Circle (SVG)` --references--> `Web Service (Node.js / Next.js)`  [INFERRED]
  web/src/app/icon.svg → docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md
- `Next.js Logo (SVG)` --references--> `Web Service (Node.js / Next.js)`  [INFERRED]
  web/public/next.svg → docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md
- `Vercel Logo (SVG)` --conceptually_related_to--> `Web Service (Node.js / Next.js)`  [INFERRED]
  web/public/vercel.svg → docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md
- `Next.js Agent Rules (AGENTS.md)` --references--> `Web Service (Node.js / Next.js)`  [INFERRED]
  web/AGENTS.md → docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md
- `Virtual Creator OS PRD` --rationale_for--> `Virtual Creator OS Design Spec`  [INFERRED]
  ugc_virtual_creator_prd.md → docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md

## Hyperedges (group relationships)
- **7-Plan Implementation Dependency Chain** — plan1_foundation, plan2_llm_content, plan3_python_pipeline, plan4_job_orchestration, plan5_web_ui, plan6_scheduling, plan7_analytics [EXTRACTED 1.00]
- **Multi-Platform Posting Surface (TikTok/Instagram/YouTube)** — spec_platform_posting, spec_frequency_caps, spec_scheduling_cron [EXTRACTED 0.90]
- **Asset Production Pipeline (TTS → Animation → Composition → Encode)** — spec_asset_pipeline, spec_pipeline_service, spec_bullmq_queues, plan3_python_pipeline [EXTRACTED 0.95]

## Communities

### Community 0 - "Automation & LLM Client"
Cohesion: 0.09
Nodes (6): getAutomationConfig(), isAuto(), generate(), generateJSON(), enqueue(), getQueue()

### Community 1 - "Project Docs & Plans"
Cohesion: 0.1
Nodes (34): App Icon - Red Circle (SVG), Next.js Logo (SVG), Vercel Logo (SVG), Pipeline Python Dependencies, Plan 1: Foundation & Scaffold, Plan 2: LLM & Content Generation, Plan 3: Python Pipeline (TTS/Animation/Encoding), Plan 4: Job Orchestration & Automation (+26 more)

### Community 2 - "UI Navigation & Layout"
Cohesion: 0.08
Nodes (0): 

### Community 3 - "UI Components & Cards"
Cohesion: 0.1
Nodes (4): addDays(), CalendarPage(), getMondayOf(), toIso()

### Community 4 - "Python Pipeline Workers"
Cohesion: 0.09
Nodes (4): getNextSlot(), queryScheduledSlots(), slotDate(), toUTCDateString()

### Community 5 - "UI Dialog & Form Controls"
Cohesion: 0.11
Nodes (2): pollBatch(), stopPolling()

### Community 6 - "Analytics Aggregations"
Cohesion: 0.13
Nodes (4): DELETE(), GET(), PATCH(), POST()

### Community 7 - "Platform Adapters & Metrics"
Cohesion: 0.12
Nodes (3): InstagramAdapter, TikTokAdapter, YouTubeAdapter

### Community 8 - "Select UI Components"
Cohesion: 0.22
Nodes (0): 

### Community 9 - "Pipeline Job Data Models"
Cohesion: 0.4
Nodes (4): AnimationJobData, CompositionJobData, EncodeJobData, TTSJobData

### Community 10 - "TTS Service (Kokoro)"
Cohesion: 0.4
Nodes (4): assemble_narration(), generate_tts(), Generate TTS audio using Kokoro. Returns path to audio file., Assemble script fields into a single narration string.

### Community 11 - "FFmpeg Encoding Service"
Cohesion: 0.67
Nodes (2): encode_final(), _write_simple_srt()

### Community 12 - "FastAPI Entrypoint"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Portrait Animation Service"
Cohesion: 0.67
Nodes (2): animate_portrait(), Animate a character still with LivePortrait. Returns path to output video.

### Community 14 - "Video Composition Service"
Cohesion: 0.67
Nodes (2): compose_video(), Use Remotion CLI to render a composition. Returns path to rendered video.

### Community 15 - "Next.js Instrumentation"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Scheduling Tests"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Queue Connection (Python)"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "TypeScript Environment"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Drizzle Config"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Vitest Config"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Analytics Tests"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Frequency Cap Tests"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Web README"
Cohesion: 1.0
Nodes (1): Web Service README

### Community 26 - "File Icon Asset"
Cohesion: 1.0
Nodes (1): File Icon (SVG)

### Community 27 - "Globe Icon Asset"
Cohesion: 1.0
Nodes (1): Globe Icon (SVG)

### Community 28 - "Window Icon Asset"
Cohesion: 1.0
Nodes (1): Window Icon (SVG)

## Knowledge Gaps
- **20 isolated node(s):** `TTSJobData`, `AnimationJobData`, `CompositionJobData`, `EncodeJobData`, `Animate a character still with LivePortrait. Returns path to output video.` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Next.js Instrumentation`** (2 nodes): `instrumentation.ts`, `register()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Scheduling Tests`** (2 nodes): `next-slot.test.ts`, `utcSlot()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Queue Connection (Python)`** (1 nodes): `queue_connection.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TypeScript Environment`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Drizzle Config`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vitest Config`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analytics Tests`** (1 nodes): `analytics.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frequency Cap Tests`** (1 nodes): `frequency-cap.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Web README`** (1 nodes): `Web Service README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `File Icon Asset`** (1 nodes): `File Icon (SVG)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Globe Icon Asset`** (1 nodes): `Globe Icon (SVG)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Window Icon Asset`** (1 nodes): `Window Icon (SVG)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 4 inferred relationships involving `Web Service (Node.js / Next.js)` (e.g. with `Next.js Agent Rules (AGENTS.md)` and `App Icon - Red Circle (SVG)`) actually correct?**
  _`Web Service (Node.js / Next.js)` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TTSJobData`, `AnimationJobData`, `CompositionJobData` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Automation & LLM Client` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Project Docs & Plans` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `UI Navigation & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `UI Components & Cards` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Python Pipeline Workers` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._