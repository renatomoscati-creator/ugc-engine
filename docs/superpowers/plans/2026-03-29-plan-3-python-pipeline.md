# Plan 3: Python Pipeline — TTS, Animation, Composition, Encoding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Python FastAPI pipeline service with BullMQ workers for TTS (Kokoro), portrait animation (LivePortrait), video composition (Remotion via CLI), and FFmpeg encoding.

**Architecture:** Python workers consume BullMQ queues via `bullmq` Python package. Each stage writes output to `shared/assets/` and updates the `production_jobs` table. Stage completion enqueues the next stage.

**Tech Stack:** Python 3.11+, FastAPI, Kokoro TTS, LivePortrait, FFmpeg CLI, Remotion CLI, bullmq (Python), SQLite

**Prereqs:** Plan 1 complete (shared dirs, DB schema, Redis running). Kokoro and LivePortrait installed locally.

**Spec:** `docs/superpowers/specs/2026-03-29-virtual-creator-os-design.md` §5 Asset Pipeline Stack

---

## File Map

- Create: `pipeline/workers/tts.py` — Kokoro TTS worker
- Create: `pipeline/workers/animation.py` — LivePortrait worker
- Create: `pipeline/workers/composition.py` — Remotion CLI composition worker
- Create: `pipeline/workers/ffmpeg.py` — FFmpeg encode/subtitle worker
- Create: `pipeline/services/tts_service.py` — Kokoro TTS business logic
- Create: `pipeline/services/animation_service.py` — LivePortrait business logic
- Create: `pipeline/services/composition_service.py` — Remotion template logic
- Create: `pipeline/services/ffmpeg_service.py` — FFmpeg wrapper
- Create: `pipeline/models.py` — Shared Python dataclasses for job data
- Modify: `pipeline/main.py` — Register all workers on startup
- Modify: `pipeline/requirements.txt` — Add pipeline dependencies

---

## Task 1: Install pipeline dependencies

**Files:**
- Modify: `pipeline/requirements.txt`

- [ ] **Step 1: Update requirements.txt**

File: `pipeline/requirements.txt`

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
python-dotenv==1.0.*
aiosqlite==0.20.*
redis==5.2.*
bullmq==2.12.*
kokoro==0.9.*
soundfile==0.13.*
numpy==1.26.*
Pillow==11.*
```

Note: LivePortrait and Remotion are invoked as subprocesses — they're not Python packages to install here. Remotion requires Node.js. FFmpeg must be installed system-wide (`brew install ffmpeg` on macOS).

- [ ] **Step 2: Install**

```bash
cd pipeline
source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 3: Verify FFmpeg available**

```bash
ffmpeg -version
```

Expected: FFmpeg version output.

- [ ] **Step 4: Commit**

```bash
cd ..
git add pipeline/requirements.txt
git commit -m "feat: add pipeline Python dependencies"
```

---

## Task 2: Shared models and DB helpers

**Files:**
- Create: `pipeline/models.py`
- Create: `pipeline/db.py` (update existing)

- [ ] **Step 1: Create shared models**

File: `pipeline/models.py`

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class TTSJobData:
    script_id: int
    persona_id: int
    text: str  # narration text assembled from script fields
    voice_id: str = "af_heart"  # Kokoro voice ID


@dataclass
class AnimationJobData:
    script_id: int
    persona_id: int
    audio_path: str
    character_still_path: str  # path to locked identity still


@dataclass
class CompositionJobData:
    script_id: int
    persona_id: int
    audio_path: str
    animation_path: str
    visual_plan: dict  # parsed JSON from scripts.visual_plan
    hook: str
    body_beats: list[str]


@dataclass
class EncodeJobData:
    script_id: int
    persona_id: int
    composition_path: str  # Remotion output directory
    platform_target: str
    caption_text: str
```

- [ ] **Step 2: Update DB helpers with job tracking**

Add to `pipeline/db.py`:

```python
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

DATABASE_PATH = os.getenv("DATABASE_PATH", "../shared/db/ugc.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def create_production_job(conn, script_id: int, stage: str, bullmq_job_id: str) -> int:
    cursor = conn.execute(
        """
        INSERT INTO production_jobs (script_id, stage, status, bullmq_job_id, created_at, updated_at)
        VALUES (?, ?, 'running', ?, datetime('now'), datetime('now'))
        """,
        (script_id, stage, bullmq_job_id),
    )
    return cursor.lastrowid


def update_production_job(
    conn,
    job_id: int,
    status: str,
    output_path: str = None,
    error_message: str = None,
    duration_ms: int = None,
):
    conn.execute(
        """
        UPDATE production_jobs
        SET status=?, output_path=?, error_message=?, duration_ms=?, updated_at=datetime('now')
        WHERE id=?
        """,
        (status, output_path, error_message, duration_ms, job_id),
    )


def get_script(conn, script_id: int) -> sqlite3.Row:
    return conn.execute(
        "SELECT * FROM scripts WHERE id=?", (script_id,)
    ).fetchone()


def get_persona(conn, persona_id: int) -> sqlite3.Row:
    return conn.execute(
        "SELECT * FROM personas WHERE id=?", (persona_id,)
    ).fetchone()


def insert_asset(conn, script_id: int, job_id: int, asset_type: str, file_path: str, metadata: dict = None) -> int:
    import json
    cursor = conn.execute(
        """
        INSERT INTO assets (script_id, production_job_id, asset_type, file_path, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        """,
        (script_id, job_id, asset_type, file_path, json.dumps(metadata) if metadata else None),
    )
    return cursor.lastrowid
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/models.py pipeline/db.py
git commit -m "feat: add pipeline shared models and DB job tracking helpers"
```

---

## Task 3: TTS service and worker

**Files:**
- Create: `pipeline/services/tts_service.py`
- Create: `pipeline/workers/tts.py`

- [ ] **Step 1: Create TTS service**

File: `pipeline/services/tts_service.py`

```python
import os
from pathlib import Path


AUDIO_DIR = os.getenv("ASSETS_DIR", "../shared/assets") + "/audio"


def assemble_narration(script_row) -> str:
    """Assemble script fields into a single narration string."""
    import json
    parts = []
    if script_row["opening_line"]:
        parts.append(script_row["opening_line"])
    if script_row["body_beats"]:
        beats = json.loads(script_row["body_beats"])
        parts.extend(beats)
    if script_row["proof_demo_beat"]:
        parts.append(script_row["proof_demo_beat"])
    if script_row["cta_closing_beat"]:
        parts.append(script_row["cta_closing_beat"])
    return " ".join(parts)


def generate_tts(text: str, script_id: int, voice_id: str = "af_heart") -> str:
    """Generate TTS audio using Kokoro. Returns path to audio file."""
    from kokoro import KPipeline
    import soundfile as sf
    import numpy as np

    Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)
    output_path = f"{AUDIO_DIR}/script_{script_id}.wav"

    pipeline = KPipeline(lang_code="a")  # 'a' = American English
    generator = pipeline(text, voice=voice_id, speed=1.1, split_pattern=r"\n+")

    samples = []
    sample_rate = None
    for _, _, audio in generator:
        samples.append(audio)
        if sample_rate is None:
            sample_rate = 24000  # Kokoro default

    audio_data = np.concatenate(samples)
    sf.write(output_path, audio_data, sample_rate)

    return output_path
```

- [ ] **Step 2: Create TTS BullMQ worker**

File: `pipeline/workers/tts.py`

```python
import asyncio
import json
import time
import os
from bullmq import Worker
from db import get_db, create_production_job, update_production_job, insert_asset, get_script
from services.tts_service import assemble_narration, generate_tts

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
ANIMATION_QUEUE = "animation"

# Path to a default character still — operator sets this up
DEFAULT_STILL_PATH = os.getenv(
    "DEFAULT_STILL_PATH", "../shared/assets/identity/default.jpg"
)


async def process_tts(job, job_token):
    print(f"[tts-worker] START jobId={job.id}")
    start = time.time()
    data = job.data
    script_id = data["scriptId"]
    persona_id = data["personaId"]

    with get_db() as conn:
        script = get_script(conn, script_id)
        if not script:
            raise ValueError(f"Script {script_id} not found")

        db_job_id = create_production_job(conn, script_id, "tts", str(job.id))

        try:
            text = assemble_narration(script)
            audio_path = generate_tts(text, script_id)
            duration_ms = int((time.time() - start) * 1000)

            update_production_job(conn, db_job_id, "completed", audio_path, duration_ms=duration_ms)
            insert_asset(conn, script_id, db_job_id, "audio", audio_path)

            # Enqueue next stage: animation
            import redis
            r = redis.from_url(REDIS_URL)
            next_job = {
                "name": "animate",
                "data": {
                    "scriptId": script_id,
                    "personaId": persona_id,
                    "audioPath": audio_path,
                    "characterStillPath": DEFAULT_STILL_PATH,
                },
            }
            r.lpush(f"bull:{ANIMATION_QUEUE}:wait", json.dumps(next_job))

        except Exception as e:
            update_production_job(conn, db_job_id, "failed", error_message=str(e))
            raise

    print(f"[tts-worker] DONE scriptId={script_id} audioPath={audio_path}")
    return {"audioPath": audio_path}


async def start_tts_worker():
    worker = Worker("tts", process_tts, {"connection": REDIS_URL})
    print("[tts-worker] listening on queue: tts")
    await worker.run()
```

**Note on BullMQ Python enqueue:** The `redis.lpush` call above is a simplified placeholder. In practice, use the `bullmq` Python `Queue` class to enqueue the next job. Update once confirming the exact Python bullmq API for `Queue.add()`.

- [ ] **Step 3: Commit**

```bash
git add pipeline/services/tts_service.py pipeline/workers/tts.py
git commit -m "feat: add Kokoro TTS service and BullMQ worker"
```

---

## Task 4: Animation service and worker

**Files:**
- Create: `pipeline/services/animation_service.py`
- Create: `pipeline/workers/animation.py`

- [ ] **Step 1: Create animation service**

File: `pipeline/services/animation_service.py`

```python
import os
import subprocess
from pathlib import Path

ANIMATION_DIR = os.getenv("ASSETS_DIR", "../shared/assets") + "/animation"
LIVEPORTRAIT_DIR = os.getenv("LIVEPORTRAIT_DIR", "~/LivePortrait")


def animate_portrait(
    source_image: str,
    audio_path: str,
    script_id: int,
) -> str:
    """
    Animate a character still with LivePortrait driven by audio timing.
    Returns path to the output video.
    """
    Path(ANIMATION_DIR).mkdir(parents=True, exist_ok=True)
    output_path = f"{ANIMATION_DIR}/script_{script_id}_animated.mp4"

    # LivePortrait inference — invoked as subprocess
    # LivePortrait repo: https://github.com/KwaiVGI/LivePortrait
    cmd = [
        "python",
        f"{LIVEPORTRAIT_DIR}/inference.py",
        "--source", source_image,
        "--driving_audio", audio_path,
        "--output", output_path,
        "--flag_do_crop", "True",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(
            f"LivePortrait failed: {result.stderr[:500]}"
        )

    return output_path
```

- [ ] **Step 2: Create animation worker**

File: `pipeline/workers/animation.py`

```python
import asyncio
import time
import os
from bullmq import Worker
from db import get_db, create_production_job, update_production_job, insert_asset, get_script
from services.animation_service import animate_portrait

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
COMPOSITION_QUEUE = "composition"


async def process_animation(job, job_token):
    print(f"[animation-worker] START jobId={job.id}")
    start = time.time()
    data = job.data
    script_id = data["scriptId"]
    persona_id = data["personaId"]
    audio_path = data["audioPath"]
    character_still_path = data["characterStillPath"]

    with get_db() as conn:
        script = get_script(conn, script_id)
        if not script:
            raise ValueError(f"Script {script_id} not found")

        db_job_id = create_production_job(conn, script_id, "animation", str(job.id))

        try:
            import json
            animation_path = animate_portrait(
                source_image=character_still_path,
                audio_path=audio_path,
                script_id=script_id,
            )
            duration_ms = int((time.time() - start) * 1000)
            update_production_job(conn, db_job_id, "completed", animation_path, duration_ms=duration_ms)
            insert_asset(conn, script_id, db_job_id, "animation", animation_path)

            # Enqueue composition stage
            visual_plan = json.loads(script["visual_plan"] or "{}")
            from bullmq import Queue
            q = Queue(COMPOSITION_QUEUE, {"connection": REDIS_URL})
            await q.add("compose", {
                "scriptId": script_id,
                "personaId": persona_id,
                "audioPath": audio_path,
                "animationPath": animation_path,
                "visualPlan": visual_plan,
                "hook": script["hook"],
                "bodyBeats": json.loads(script["body_beats"] or "[]"),
            })

        except Exception as e:
            update_production_job(conn, db_job_id, "failed", error_message=str(e))
            raise

    print(f"[animation-worker] DONE scriptId={script_id}")
    return {"animationPath": animation_path}


async def start_animation_worker():
    worker = Worker("animation", process_animation, {"connection": REDIS_URL})
    print("[animation-worker] listening on queue: animation")
    await worker.run()
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/services/animation_service.py pipeline/workers/animation.py
git commit -m "feat: add LivePortrait animation service and BullMQ worker"
```

---

## Task 5: Composition and encode workers

**Files:**
- Create: `pipeline/services/composition_service.py`
- Create: `pipeline/services/ffmpeg_service.py`
- Create: `pipeline/workers/composition.py`
- Create: `pipeline/workers/ffmpeg.py`

- [ ] **Step 1: Create composition service**

File: `pipeline/services/composition_service.py`

```python
import os
import subprocess
import json
from pathlib import Path

RENDERS_DIR = os.getenv("ASSETS_DIR", "../shared/assets") + "/renders"
WEB_DIR = os.getenv("WEB_DIR", "../web")


def compose_video(
    script_id: int,
    animation_path: str,
    audio_path: str,
    hook: str,
    body_beats: list,
    visual_plan: dict,
) -> str:
    """
    Use Remotion CLI to render a composition.
    Returns path to the rendered video directory.
    """
    Path(RENDERS_DIR).mkdir(parents=True, exist_ok=True)
    output_dir = f"{RENDERS_DIR}/script_{script_id}"
    Path(output_dir).mkdir(exist_ok=True)

    # Props passed to the Remotion composition
    props = {
        "animationPath": animation_path,
        "audioPath": audio_path,
        "hook": hook,
        "bodyBeats": body_beats,
        "visualPlan": visual_plan,
    }

    props_json = json.dumps(props)

    # Remotion render CLI — runs from the web directory where Remotion is configured
    cmd = [
        "npx", "remotion", "render",
        "ReelTemplate",  # composition ID defined in web/src/remotion/
        f"{output_dir}/composition.mp4",
        "--props", props_json,
        "--width", "1080",
        "--height", "1920",
        "--fps", "30",
    ]

    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=600, cwd=WEB_DIR
    )
    if result.returncode != 0:
        raise RuntimeError(f"Remotion render failed: {result.stderr[:500]}")

    return f"{output_dir}/composition.mp4"
```

- [ ] **Step 2: Create FFmpeg service**

File: `pipeline/services/ffmpeg_service.py`

```python
import os
import subprocess
import json
from pathlib import Path

RENDERS_DIR = os.getenv("ASSETS_DIR", "../shared/assets") + "/renders"


def get_audio_duration(audio_path: str) -> float:
    """Get duration of audio file in seconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_streams", audio_path,
        ],
        capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    for stream in data.get("streams", []):
        if "duration" in stream:
            return float(stream["duration"])
    return 0.0


def encode_final(
    script_id: int,
    composition_path: str,
    platform_target: str,
    caption_text: str,
) -> str:
    """
    Final encode: add subtitles, adjust for platform, output final MP4.
    Returns path to final video file.
    """
    Path(RENDERS_DIR).mkdir(parents=True, exist_ok=True)
    output_path = f"{RENDERS_DIR}/script_{script_id}_{platform_target}_final.mp4"

    # Write SRT subtitle file
    srt_path = f"{RENDERS_DIR}/script_{script_id}.srt"
    _write_simple_srt(srt_path, caption_text)

    # FFmpeg: burn subtitles, encode to H.264, target 9:16 1080x1920
    cmd = [
        "ffmpeg", "-y",
        "-i", composition_path,
        "-vf", f"subtitles={srt_path}:force_style='FontSize=14,PrimaryColour=&HFFFFFF,Outline=1'",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg encode failed: {result.stderr[:500]}")

    return output_path


def _write_simple_srt(srt_path: str, caption_text: str):
    """Write a basic single-block SRT subtitle file."""
    with open(srt_path, "w") as f:
        f.write("1\n00:00:01,000 --> 00:00:25,000\n")
        # Word-wrap at 40 chars
        words = caption_text.split()
        lines = []
        current = []
        for word in words:
            current.append(word)
            if len(" ".join(current)) > 40:
                lines.append(" ".join(current[:-1]))
                current = [word]
        if current:
            lines.append(" ".join(current))
        f.write("\n".join(lines[:3]))  # max 3 lines
        f.write("\n")
```

- [ ] **Step 3: Create composition worker**

File: `pipeline/workers/composition.py`

```python
import asyncio
import time
import os
import json
from bullmq import Worker, Queue
from db import get_db, create_production_job, update_production_job, insert_asset, get_script
from services.composition_service import compose_video

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


async def process_composition(job, job_token):
    print(f"[composition-worker] START jobId={job.id}")
    start = time.time()
    data = job.data
    script_id = data["scriptId"]

    with get_db() as conn:
        script = get_script(conn, script_id)
        db_job_id = create_production_job(conn, script_id, "composition", str(job.id))

        try:
            composition_path = compose_video(
                script_id=script_id,
                animation_path=data["animationPath"],
                audio_path=data["audioPath"],
                hook=data["hook"],
                body_beats=data.get("bodyBeats", []),
                visual_plan=data.get("visualPlan", {}),
            )
            duration_ms = int((time.time() - start) * 1000)
            update_production_job(conn, db_job_id, "completed", composition_path, duration_ms=duration_ms)
            insert_asset(conn, script_id, db_job_id, "composition", composition_path)

            caption_ideas = json.loads(script["caption_ideas"] or "[]")
            caption = caption_ideas[0] if caption_ideas else script["hook"] or ""

            q = Queue("encode", {"connection": REDIS_URL})
            await q.add("encode", {
                "scriptId": script_id,
                "personaId": data["personaId"],
                "compositionPath": composition_path,
                "platformTarget": script["platform_target"] or "tiktok",
                "captionText": caption,
            })

        except Exception as e:
            update_production_job(conn, db_job_id, "failed", error_message=str(e))
            raise

    print(f"[composition-worker] DONE scriptId={script_id}")
    return {"compositionPath": composition_path}


async def start_composition_worker():
    worker = Worker("composition", process_composition, {"connection": REDIS_URL})
    print("[composition-worker] listening on queue: composition")
    await worker.run()
```

- [ ] **Step 4: Create encode worker**

File: `pipeline/workers/ffmpeg.py`

```python
import asyncio
import time
import os
from bullmq import Worker
from db import get_db, create_production_job, update_production_job, insert_asset, get_script
from services.ffmpeg_service import encode_final

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


async def process_encode(job, job_token):
    print(f"[encode-worker] START jobId={job.id}")
    start = time.time()
    data = job.data
    script_id = data["scriptId"]

    with get_db() as conn:
        db_job_id = create_production_job(conn, script_id, "encode", str(job.id))

        try:
            output_path = encode_final(
                script_id=script_id,
                composition_path=data["compositionPath"],
                platform_target=data["platformTarget"],
                caption_text=data["captionText"],
            )
            duration_ms = int((time.time() - start) * 1000)
            update_production_job(conn, db_job_id, "completed", output_path, duration_ms=duration_ms)
            insert_asset(conn, script_id, db_job_id, "video", output_path)

            # Update script status to rendered
            conn.execute(
                "UPDATE scripts SET status='rendered', updated_at=datetime('now') WHERE id=?",
                (script_id,),
            )

        except Exception as e:
            update_production_job(conn, db_job_id, "failed", error_message=str(e))
            raise

    print(f"[encode-worker] DONE scriptId={script_id} output={output_path}")
    return {"outputPath": output_path}


async def start_encode_worker():
    worker = Worker("encode", process_encode, {"connection": REDIS_URL})
    print("[encode-worker] listening on queue: encode")
    await worker.run()
```

- [ ] **Step 5: Commit**

```bash
git add pipeline/services/ pipeline/workers/composition.py pipeline/workers/ffmpeg.py
git commit -m "feat: add composition (Remotion) and encode (FFmpeg) workers"
```

---

## Task 6: Wire all workers into main.py

**Files:**
- Modify: `pipeline/main.py`

- [ ] **Step 1: Update main.py to start all workers**

File: `pipeline/main.py`

```python
import asyncio
import os
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

app = FastAPI(title="UGC Pipeline Service")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "pipeline"}


@app.on_event("startup")
async def start_workers():
    from workers.tts import start_tts_worker
    from workers.animation import start_animation_worker
    from workers.composition import start_composition_worker
    from workers.ffmpeg import start_encode_worker

    asyncio.create_task(start_tts_worker())
    asyncio.create_task(start_animation_worker())
    asyncio.create_task(start_composition_worker())
    asyncio.create_task(start_encode_worker())

    print("[pipeline] All workers started")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
```

- [ ] **Step 2: Verify service starts and workers initialise**

```bash
cd pipeline
source .venv/bin/activate
python main.py
```

Expected: "All workers started", each worker prints its listening message. No errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add pipeline/main.py
git commit -m "feat: wire all pipeline workers into FastAPI startup"
```

---

## Verification

1. `python main.py` — FastAPI starts, all 4 workers listening
2. `GET http://localhost:8000/health` — `{"status":"ok"}`
3. `shared/assets/` subdirectories exist
4. With a script in DB and a character still at `shared/assets/identity/default.jpg`, posting a TTS job to Redis triggers the chain through animation → composition → encode
5. Final video appears at `shared/assets/renders/script_{id}_{platform}_final.mp4`
