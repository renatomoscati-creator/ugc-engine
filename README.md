# UGC Engine

Automated UGC (user-generated content) video production pipeline. Feed it a topic — it generates scripts, assigns AI personas, produces voiceover audio, and assembles the final video.

---

## Architecture

```
ugc/
├── pipeline/           # Python backend
│   ├── main.py         # FastAPI server
│   ├── models.py       # Data models
│   ├── workers/        # BullMQ job workers (TTS, ffmpeg, composition)
│   └── services/       # TTS, animation, ffmpeg, composition logic
├── web/                # Next.js dashboard (job queue, preview, approval)
└── shared/             # SQLite DB, shared assets
```

**Pipeline flow:**
1. Submit job via dashboard or API
2. Script generation (LLM via Ollama)
3. Persona-fit scoring — auto-reject scores < 70
4. TTS audio generation (local, no cloud dependency)
5. Video composition via ffmpeg
6. Preview + approve in dashboard

## Stack

| Layer | Tech |
|---|---|
| Backend | Python · FastAPI · BullMQ (Redis) |
| Frontend | Next.js · TypeScript · Tailwind |
| Database | SQLite (aiosqlite) |
| LLM | Ollama (local, default: `qwen3:8b`) |
| TTS | Local TTS engine |
| Video | ffmpeg |

## Setup

**Requirements:** Python 3.11+, Node 20+, Redis, Ollama, ffmpeg

```bash
# 1. Start Redis
redis-server

# 2. Pull LLM
ollama pull qwen3:8b

# 3. Pipeline
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload

# 4. Web dashboard
cd ../web
npm install
npm run dev
```

Dashboard at `http://localhost:3000`, API at `http://localhost:8000`.

## API

```
POST /jobs          # Submit new video job
GET  /jobs          # List jobs + status
GET  /jobs/{id}     # Job detail + output
POST /jobs/{id}/approve  # Approve generated script
```

## License

MIT © 2026 Renato Moscati
