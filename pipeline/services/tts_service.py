import os
import json
from pathlib import Path

AUDIO_DIR = os.getenv("ASSETS_DIR", "../shared/assets") + "/audio"


def assemble_narration(script_row) -> str:
    """Assemble script fields into a single narration string."""
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
    Path(AUDIO_DIR).mkdir(parents=True, exist_ok=True)
    output_path = f"{AUDIO_DIR}/script_{script_id}.wav"

    try:
        from kokoro import KPipeline
        import soundfile as sf
        import numpy as np

        pipeline = KPipeline(lang_code="a")
        generator = pipeline(text, voice=voice_id, speed=1.1, split_pattern=r"\n+")

        samples = []
        sample_rate = 24000
        for _, _, audio in generator:
            samples.append(audio)

        audio_data = np.concatenate(samples)
        sf.write(output_path, audio_data, sample_rate)
    except ImportError:
        # Kokoro not available — write a stub WAV file (silent, 1s)
        # This allows the pipeline to proceed for testing without TTS hardware
        import struct
        import wave
        sample_rate = 24000
        duration_s = max(1, len(text.split()) // 3)  # rough estimate
        num_samples = sample_rate * duration_s
        with wave.open(output_path, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(struct.pack("<" + "h" * num_samples, *([0] * num_samples)))

    return output_path
