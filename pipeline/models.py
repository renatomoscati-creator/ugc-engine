from dataclasses import dataclass
from typing import Optional


@dataclass
class TTSJobData:
    script_id: int
    persona_id: int
    text: str
    voice_id: str = "af_heart"


@dataclass
class AnimationJobData:
    script_id: int
    persona_id: int
    audio_path: str
    character_still_path: str


@dataclass
class CompositionJobData:
    script_id: int
    persona_id: int
    audio_path: str
    animation_path: str
    visual_plan: dict
    hook: str
    body_beats: list[str]


@dataclass
class EncodeJobData:
    script_id: int
    persona_id: int
    composition_path: str
    platform_target: str
    caption_text: str
