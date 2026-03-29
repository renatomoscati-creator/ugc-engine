import asyncio
import time
import os
import json
from bullmq import Worker, Queue
from db import get_db, create_production_job, update_production_job, insert_asset, get_script
from services.animation_service import animate_portrait

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


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
            animation_path = animate_portrait(
                source_image=character_still_path,
                audio_path=audio_path,
                script_id=script_id,
            )
            duration_ms = int((time.time() - start) * 1000)
            update_production_job(conn, db_job_id, "completed", animation_path, duration_ms=duration_ms)
            insert_asset(conn, script_id, db_job_id, "animation", animation_path)

            visual_plan = json.loads(script["visual_plan"] or "{}")
            q = Queue("composition", {"connection": REDIS_URL})
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
