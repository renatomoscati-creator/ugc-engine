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
