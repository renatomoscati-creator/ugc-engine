# PRD — Local-First Virtual Creator Operating System

## 1. Document control

**Working title:** Local-First Virtual Creator OS  
**Primary goal:** Build a browser-based localhost application that runs an automated short-form content engine for a stylized virtual creator account in a chosen niche, with the objective of building real traction first and monetizing later through sponsorships/brand ads, while also supporting Instagram and YouTube monetization paths.  
**Primary operator:** Solo founder/operator  
**Primary runtime:** Local machine  
**Primary interface:** Browser app served locally on localhost  
**Primary implementation agent:** Claude

---

## 2. Product vision

Build a cheap, efficient, local-first content operating system that can:

1. Generate scripts using the user’s local model.
2. Turn selected scripts into short-form videos through a low-cost asset pipeline.
3. Schedule and autopost content at posting times discovered and improved through A/B testing.
4. Track content performance, account growth, posting health, and operational failures.
5. Use the local model again for analysis, optimization, and new content suggestions.
6. Run from a browser on localhost, while the heavy lifting is performed by local services and automation workflows.

This system is not meant to be a generic AI video toy. It is meant to be an **always-on virtual creator operating system** whose commercial end state is:

- first: traction and audience growth in a specific niche
- then: ability to sell ads/sponsorships at attractive rates once the account has proven engagement and audience trust
- secondarily: capture additional monetization from Instagram and YouTube
- not depend on TikTok direct remuneration, especially because that is not the core economic assumption for Italy

---

## 3. Business objective

### Core business objective
Create and scale a niche account that looks socially native, performs well on Instagram/TikTok/YouTube Shorts, and accumulates enough proof of traction to become attractive for sponsorships and brand deals.

### Economic logic
The main monetization path is **brand/sponsored content and ad sales after traction is proven**.

Secondary monetization paths are:
- Instagram monetization opportunities where available
- YouTube monetization and traffic capture
- affiliate or partner monetization later if useful

TikTok direct creator payouts should **not** be treated as the main business case in the product strategy.

### Strategic principle
The system should optimize for:
- low cost per published asset
- low cost per tested concept
- operational consistency
- measurable learning loops
- repeatable audience growth
- eventual sponsor-readiness

---

## 4. Product scope

### In scope
- local-model-powered script generation
- local or cheap asset creation pipeline
- local orchestration and automation
- scheduling and autoposting framework
- posting-time experimentation and optimization
- analytics dashboards
- recommendation engine using the local model
- localhost web UI
- content queue and approval flow
- experiment tracking
- operational monitoring

### Out of scope for V1 unless Claude decides otherwise
- fully autonomous multi-brand agency support
- complex paid media buying automation
- enterprise permissions/roles
- mobile app
- high-cost text-to-video as default generation backbone
- expensive avatar SaaS as default pipeline

---

## 5. Product principles

1. **Local-first:** Prefer local inference, local services, and local storage where practical.
2. **Cheap by design:** Default to open-source or low-cost tools. Paid tools should be optional upgrades or overflow support.
3. **Browser-first UI:** The final product must run through a browser on localhost.
4. **Composable pipeline:** Generate assets by assembling components, not by paying to generate full videos end-to-end.
5. **Human review optionality:** The operator should be able to review, approve, reject, or regenerate at critical stages.
6. **Experimentation-native:** The system should treat posting times, hooks, formats, and content variants as testable variables.
7. **Local model at the center:** Script generation, content analysis, and suggestions should call the user’s local model.
8. **Operator leverage:** The system should reduce manual workload rather than create more dashboard complexity than necessary.

---

## 6. User problem

The operator wants to build a niche account with traction but cannot economically support a high-cost content factory.

Current obstacles:
- creating enough content volume manually is too slow
- high-quality synthetic asset generation is often expensive
- posting consistency is hard without automation
- knowing what to improve is difficult without good analytics
- growth requires experimentation, but experimentation becomes operationally messy
- many tools are fragmented and not designed for a local-first, cheap setup

The product should solve these by centralizing the content loop in one localhost web app.

---

## 7. Target user

### Primary user
A solo operator using a local machine, comfortable enough with AI tools and automation, who wants to run a virtual-creator content engine with minimal recurring spend.

### User characteristics
- values automation and efficiency
- is willing to configure local tools
- wants full visibility into performance and operations
- wants to use a local LLM/API for reasoning tasks
- cares about traction before monetization

---

## 8. High-level workflow

The system should support this lifecycle:

1. **Strategy input**
   - operator sets niche, account profile, target platforms, and content pillars

2. **Idea generation**
   - local model generates content ideas, hooks, and structured scripts

3. **Script queue**
   - scripts enter a queue for approval, regeneration, or direct production

4. **Asset production**
   - system creates voice, talking-head or scene components, captions, overlays, and final short-form videos

5. **Publishing queue**
   - approved content enters scheduled publishing queue

6. **Autoposting**
   - system posts based on scheduling logic and posting-time experiments

7. **Performance ingestion**
   - system collects metrics and post-level outcomes

8. **Analysis**
   - local model interprets performance and produces recommendations

9. **Optimization loop**
   - system suggests new posting times, new hooks, new content angles, and new experiments

---

## 9. Core modules

## 9.1 Strategy and persona module
Purpose: define the content system identity and operating constraints.

Must support:
- niche definition
- platform selection
- persona profile for the virtual creator
- content pillars
- voice/tone guidance
- banned claims / restricted content rules
- content goals by platform
- monetization assumptions

Outputs:
- strategy profile
- persona memory/context
- content generation constraints

---

## 9.2 Script generation module
Purpose: generate content scripts using the local model.

Requirements:
- must call the user’s local model through a configurable interface Claude will define later
- support batch generation
- support multiple content pillars
- support script templates and variable slots
- generate structured outputs rather than only raw prose
- allow regeneration by section or entire script

Suggested script structure:
- script ID
- platform target
- niche / pillar
- hook
- opening line
- body beats
- proof/demo beat
- CTA or closing beat
- estimated duration
- visual plan
- caption ideas
- hashtags/tags only if operator later wants that per platform rules
- experiment metadata

User actions:
- approve
- reject
- regenerate
- edit manually
- send to production

Non-goal:
- Claude does not need to hardcode the local model details in this PRD; it should leave a clean integration surface for later specifics.

---

## 9.3 Asset creation pipeline
Purpose: convert approved scripts into cheap, scalable short-form video assets.

### Core requirement
This pipeline must be optimized for **high throughput and low marginal cost**, not cinematic perfection.

### Required asset strategy
The pipeline should favor compositional assembly:
- reusable character stills or locked identity assets
- local TTS voice generation
- portrait animation or equivalent talking-head generation where needed
- subtitle generation and burn-in
- reusable scene templates
- overlays, screenshots, UI footage, B-roll, text cards, proof cards
- deterministic rendering

### Directional expectation based on prior discussion
Claude should bias toward a cheap, local-first stack and can choose the orchestration details, but the pipeline should reflect this logic:

- generate scripts locally
- generate or select cheap reusable visuals
- use a low-cost voice layer
- use a portrait animation / short-form composition strategy
- rely heavily on templates and overlays
- avoid expensive full video generation as the default path

### Functional requirements
- ingest approved script JSON
- select production template
- generate narration audio
- align scenes to narration timing
- create captions/subtitles
- animate virtual creator asset when applicable
- add overlays/B-roll/screenshots
- render final vertical video exports
- store all outputs and logs

### Suggested output variants
For each approved script, the system should optionally support:
- multiple hooks
- multiple first-frame variants
- multiple caption styles
- multiple CTA endings
- platform-specific exports

### Success condition
One approved script should be able to produce multiple publishable variants cheaply.

---

## 9.4 Content operations queue
Purpose: manage work items across the pipeline.

Statuses should include at minimum:
- idea
- script_generated
- script_review
- approved_for_production
- production_in_progress
- rendered
- scheduled
- posted
- failed
- archived

Should support:
- retrying failed jobs
- viewing logs/errors
- filtering by platform, pillar, status, date
- manual overrides

---

## 9.5 Scheduling and autoposting module
Purpose: publish content automatically at times that improve through experimentation.

### Functional requirements
- maintain per-platform posting calendar
- queue content by platform
- support manual scheduling and automatic scheduling
- support best-time recommendation engine
- support A/B testing of posting times
- allow configurable frequency caps
- record actual posted time and outcome
- support retry logic and failure alerts

### Posting-time experimentation requirements
System should be able to:
- define time-slot hypotheses
- assign posts to time buckets
- compare performance across buckets
- account for day-of-week and platform
- propose future best times using observed performance

### Important
Claude should choose the best technical implementation path for autoposting and automation. It may use n8n or another approach if that is cleaner.

The PRD intentionally leaves this implementation choice open.

---

## 9.6 Analytics and reporting module
Purpose: let the operator monitor growth, performance, and operational health.

The dashboard must be usable inside the localhost browser app.

### Required dashboard categories

#### A. Executive dashboard
Show:
- total posts by period
- followers/subscribers growth
- views by platform
- reach/impressions where available
- top-performing posts
- growth trend
- account health summary

#### B. Creative performance dashboard
Show at post/creative level:
- post ID
- platform
- content pillar
- hook type
- format type
- publish time
- duration
- views
- watch/retention metrics where available
- likes
- comments
- shares
- saves if available
- follower conversion if available
- outbound clicks if available

#### C. Experiment dashboard
Show:
- active experiments
- posting-time A/B tests
- hook tests
- template tests
- result confidence indicators
- winning and losing variants
- recommended next tests

#### D. Operations dashboard
Show:
- scripts generated today/week
- videos rendered today/week
- queued posts
- failed jobs
- failed publishes
- pipeline latency
- storage usage
- processing time by stage

---

## 9.7 Recommendation and analysis engine
Purpose: use the local model to analyze results and propose improvements.

This is a major requirement.

The local model should be used not only for script generation but also for:
- performance interpretation
- pattern recognition across winners/losers
- new topic suggestions
- hook suggestions
- posting-time suggestions
- experiment ideas
- underperforming-format diagnosis
- weekly retrospectives

### Example outputs
- “Hooks framed as mistakes outperformed listicles by X in the last 14 days.”
- “Posts published on weekday evenings for Platform A are outperforming mornings.”
- “The system should test a shorter average runtime in pillar B.”
- “The following 10 content ideas align with the last 20 high-performing posts.”

### Requirement
These analyses should be visible in the dashboard and optionally generated on demand or on schedule.

---

## 9.8 Localhost web application
Purpose: provide one browser-based control center.

### Required sections
- overview/home
- strategy/persona settings
- script queue
- asset production queue
- content library
- scheduling calendar
- analytics dashboards
- experiments
- recommendations
- settings/integrations
- system logs

### UX requirements
- clean and operator-efficient
- designed for desktop browser use on localhost
- fast filtering and navigation
- robust enough for daily operational usage
- should not require juggling many external dashboards once configured

---

## 10. Functional requirements in detail

## FR1 — Local model integration
- system must expose a configurable interface to the local model
- model endpoint/config should be swappable later
- must support generation and analysis calls
- should support batch jobs and retries

## FR2 — Structured script generation
- generate scripts in structured schema
- support multiple scripts per batch
- support different pillar presets
- support prompt templates and regeneration

## FR3 — Asset rendering pipeline
- produce vertical short-form video assets
- use cheap/local-first approach
- support multiple variants per script
- render logs must be recorded

## FR4 — Content storage and retrieval
- store scripts, assets, captions, variants, publishing metadata, metrics, experiment tags
- all assets must be traceable back to script and configuration

## FR5 — Scheduling and autoposting
- queue and publish automatically
- support platform-specific settings
- support manual overrides
- record failures and retries

## FR6 — Experiment framework
- allow testing of posting times and content variables
- associate results with experimental design
- compute winner/loser summaries

## FR7 — Performance ingestion
- import post-level and account-level metrics on a schedule
- normalize metrics across platforms where practical
- make raw and derived metrics available for dashboards and model analysis

## FR8 — Recommendations
- use local model to create action-oriented suggestions
- schedule weekly or periodic retrospectives
- support user-triggered analysis

## FR9 — Localhost browser UI
- all primary operator actions available from browser on localhost
- stable enough for real use

## FR10 — Logs and observability
- every pipeline stage should emit logs
- failures should be inspectable
- dashboard should expose health state

---

## 11. Data model expectations

Claude should define the final schema, but it should include at least these core entities:

- accounts
- platforms
- personas
- content_pillars
- ideas
- scripts
- script_variants
- production_jobs
- assets
- asset_variants
- posts
- schedules
- experiments
- experiment_assignments
- performance_snapshots
- recommendations
- system_logs

### Important modeling principle
Every post should be decomposable into meaningful attributes so the system can learn from them.

Examples:
- hook type
- pillar
- format
- duration bucket
- CTA type
- posting time bucket
- visual template
- voice type
- subtitle style

---

## 12. Non-functional requirements

### NFR1 — Cost efficiency
The architecture should optimize for low recurring spend and low marginal cost per post.

### NFR2 — Local operability
The system should primarily run on the local machine.

### NFR3 — Extensibility
Claude should structure the codebase so that tools, models, or automation layers can be replaced later.

### NFR4 — Reliability
Failed jobs should not silently disappear. Retries and logs are mandatory.

### NFR5 — Transparency
The operator should be able to understand what the system did and why.

### NFR6 — Throughput
The system should support a meaningful content workload, not only toy-scale generation.

### NFR7 — Maintainability
Configuration should be separated from logic wherever possible.

---

## 13. Suggested product phases

## Phase 1 — MVP
Goal: prove end-to-end loop.

Include:
- local model integration
- script generation
- manual approval queue
- minimal asset pipeline
- basic scheduling
- basic autoposting
- basic dashboards
- basic recommendation reports

Success metric:
- the system can go from prompt to published content with performance data flowing back in

## Phase 2 — Optimization layer
Goal: start learning and improving.

Include:
- posting-time A/B testing
- multi-variant generation
- richer dashboards
- experiment board
- better recommendation engine
- stronger failure handling

## Phase 3 — Scale layer
Goal: increase volume and robustness.

Include:
- larger batch orchestration
- deeper operational tooling
- better asset reuse
- more advanced ranking of ideas/scripts
- weekly/monthly strategic reports from the local model

---

## 14. Key success metrics

### Growth metrics
- follower growth
- subscriber growth
- view growth
- repeat reach consistency

### Content metrics
- posts published per week
- average views per post
- share/save rates where available
- retention/watch performance where available
- engagement per pillar

### Operational metrics
- time from script to published asset
- render success rate
- post success rate
- failure rate by pipeline stage

### Learning metrics
- number of experiments run
- number of statistically or directionally useful findings
- improvement in posting-time effectiveness over time
- improvement in average post performance by iteration

### Commercial readiness metrics
- sustained account traction
- sponsor-ready deck inputs derivable from dashboard
- top-performing content pillars suitable for future ads

---

## 15. Risks and considerations

### Risk 1 — Overcomplicated orchestration
Mitigation: Claude should choose the simplest architecture that supports the full loop.

### Risk 2 — Asset generation bottlenecks
Mitigation: prefer reusable templates and cheap composition over expensive generation.

### Risk 3 — Weak recommendations
Mitigation: ensure recommendations are grounded in actual performance data, not generic advice.

### Risk 4 — Posting automation fragility
Mitigation: include robust scheduling logs, retry logic, and manual override controls.

### Risk 5 — Dashboard overload
Mitigation: prioritize decision-useful views, not vanity clutter.

---

## 16. Open implementation decisions explicitly delegated to Claude

Claude should decide the best technical setup for:
- orchestration framework (for example n8n or an alternative)
- local services structure
- backend stack
- frontend stack
- database choice
- job queue choice
- exact asset-generation tooling
- exact posting integration architecture
- exact dashboard implementation

However, Claude must respect these constraints:
- final product accessible through browser on localhost
- local-model-first for script generation and analysis
- cheap/local-first asset generation strategy
- support automation at meaningful workload
- support reporting, monitoring, and recommendations in-app

---

## 17. Final product definition

The finished product should be:

> A localhost browser-based operating system for a niche virtual creator account that uses the user’s local model to generate scripts and optimization insights, runs a cheap local-first asset pipeline to create short-form content, autoposts using experiment-driven scheduling, and reports performance and next-best actions through integrated dashboards.

Its commercial purpose is:
- first, build traction
- then, convert that traction into sponsor/brand ad revenue
- while also remaining compatible with Instagram and YouTube monetization opportunities

---

## 18. Delivery expectation for Claude

Claude should use this PRD to produce:
- the proposed architecture
- implementation plan
- tool choices and rationale
- database/schema design
- workflow diagrams
- task breakdown
- MVP build path
- suggested repo/app structure

Claude should optimize for practicality, local operability, low cost, and speed to first working version.
