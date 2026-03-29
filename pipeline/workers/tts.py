import asyncio
import json
import time
import os
from bullmq import Worker
from db import get_db, create_production_job, update_production_job, insert_asset, get_script
from services.tts_service import assemble_narration, generate_tts

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DEFAULT_STILL_PATH = os.getenv("DEFAULT_STILL_PATH", "../shared/assets/identity/default.jpg")


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

            # Enqueue next stage
            from bullmq import Queue
            q = Queue("animation", {"connection": REDIS_URL})
            await q.add("animate", {
                "scriptId": script_id,
                "personaId": persona_id,
                "audioPath": audio_path,
                "characterStillPath": DEFAULT_STILL_PATH,
            })

        except Exception as e:
            update_production_job(conn, db_job_id, "failed", error_message=str(e))
            raise

    print(f"[tts-worker] DONE scriptId={script_id}")
    return {"audioPath": audio_path}


async def start_tts_worker():
    worker = Worker("tts", process_tts, {"connection": REDIS_URL})
    print("[tts-worker] listening on queue: tts")
    await worker.run()
