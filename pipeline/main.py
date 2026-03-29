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
