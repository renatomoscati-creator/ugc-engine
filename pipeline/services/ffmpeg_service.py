import os
import subprocess
import json
from pathlib import Path

RENDERS_DIR = os.getenv("ASSETS_DIR", "../shared/assets") + "/renders"


def get_audio_duration(audio_path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", audio_path],
        capture_output=True, text=True,
    )
    try:
        data = json.loads(result.stdout)
        for stream in data.get("streams", []):
            if "duration" in stream:
                return float(stream["duration"])
    except Exception:
        pass
    return 0.0


def encode_final(script_id: int, composition_path: str, platform_target: str, caption_text: str) -> str:
    Path(RENDERS_DIR).mkdir(parents=True, exist_ok=True)
    output_path = f"{RENDERS_DIR}/script_{script_id}_{platform_target}_final.mp4"
    srt_path = f"{RENDERS_DIR}/script_{script_id}.srt"
    _write_simple_srt(srt_path, caption_text)

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
    with open(srt_path, "w") as f:
        f.write("1\n00:00:01,000 --> 00:00:25,000\n")
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
        f.write("\n".join(lines[:3]))
        f.write("\n")
