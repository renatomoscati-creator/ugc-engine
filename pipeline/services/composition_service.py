import os
import subprocess
import json
from pathlib import Path

RENDERS_DIR = os.getenv("ASSETS_DIR", "../shared/assets") + "/renders"
WEB_DIR = os.getenv("WEB_DIR", "../web")


def compose_video(script_id: int, animation_path: str, audio_path: str,
                  hook: str, body_beats: list, visual_plan: dict) -> str:
    """Use Remotion CLI to render a composition. Returns path to rendered video."""
    Path(RENDERS_DIR).mkdir(parents=True, exist_ok=True)
    output_dir = f"{RENDERS_DIR}/script_{script_id}"
    Path(output_dir).mkdir(exist_ok=True)
    output_path = f"{output_dir}/composition.mp4"

    props = {
        "animationPath": animation_path,
        "audioPath": audio_path,
        "hook": hook,
        "bodyBeats": body_beats,
        "visualPlan": visual_plan,
    }

    remotion_entry = os.path.join(WEB_DIR, "src/remotion/index.ts")
    if not os.path.exists(remotion_entry):
        # Remotion template not yet created — stub output
        try:
            result = subprocess.run(
                ["ffmpeg", "-y", "-i", animation_path,
                 "-vf", f"drawtext=text='{hook[:30]}':fontsize=40:fontcolor=white:x=50:y=100",
                 "-c:v", "libx264", "-c:a", "aac", output_path],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode != 0:
                import shutil
                shutil.copy(animation_path, output_path)
        except Exception:
            import shutil
            try:
                shutil.copy(animation_path, output_path)
            except Exception:
                Path(output_path).touch()
        return output_path

    props_json = json.dumps(props)
    cmd = [
        "npx", "remotion", "render", "ReelTemplate",
        output_path,
        "--props", props_json,
        "--width", "1080", "--height", "1920", "--fps", "30",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600, cwd=WEB_DIR)
    if result.returncode != 0:
        raise RuntimeError(f"Remotion render failed: {result.stderr[:500]}")

    return output_path
