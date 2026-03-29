import asyncio
import time
import os
from bullmq import Worker
from db import get_db, create_production_job, update_production_job, insert_asset
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

            conn.execute(
                "UPDATE scripts SET status='rendered', updated_at=datetime('now') WHERE id=?",
                (script_id,),
            )

        except Exception as e:
            update_production_job(conn, db_job_id, "failed", error_message=str(e))
            raise

    print(f"[encode-worker] DONE scriptId={script_id}")
    return {"outputPath": output_path}


async def start_encode_worker():
    worker = Worker("encode", process_encode, {"connection": REDIS_URL})
    print("[encode-worker] listening on queue: encode")
    await worker.run()
