#!/usr/bin/env python3
"""Build a reproducible, machine-readable QA report for a rendered CineForge MP4."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

ASPECT_DIMENSIONS = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
}
ALLOWED_FRAME_RATES = {"24/1", "25/1", "30/1"}
DURATION_TOLERANCE_SECONDS = 0.8


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _number(value: Any, label: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{label} must be a finite number.")
    try:
        result = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{label} must be a finite number.") from error
    if not math.isfinite(result):
        raise ValueError(f"{label} must be a finite number.")
    return result


def build_qa_report(job: dict[str, Any], probe: dict[str, Any], video_path: Path) -> dict[str, Any]:
    if not isinstance(job, dict):
        raise ValueError("Renderer job must be an object.")
    scenes = job.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError("Renderer job must contain at least one scene.")
    if not video_path.is_file():
        raise ValueError("Rendered MP4 is missing.")
    size_bytes = video_path.stat().st_size
    if size_bytes <= 0:
        raise ValueError("Rendered MP4 is empty.")

    aspect = job.get("aspect", "16:9")
    if aspect not in ASPECT_DIMENSIONS:
        raise ValueError(f"Unsupported export aspect: {aspect!r}.")
    expected_width, expected_height = ASPECT_DIMENSIONS[aspect]

    streams = probe.get("streams")
    if not isinstance(streams, list):
        raise ValueError("FFprobe result has no streams array.")
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if not video or video.get("codec_name") != "h264":
        raise ValueError("Quality gate: H.264 video stream missing.")
    if (video.get("width"), video.get("height")) != (expected_width, expected_height):
        raise ValueError("Quality gate: unexpected video dimensions.")
    frame_rate = video.get("r_frame_rate")
    if frame_rate not in ALLOWED_FRAME_RATES:
        raise ValueError("Quality gate: unexpected frame rate.")

    if any(not isinstance(scene, dict) for scene in scenes):
        raise ValueError("Renderer scenes must be objects.")
    expected_duration = sum(
        _number(scene.get("seconds", 8), f"Scene {index} duration")
        for index, scene in enumerate(scenes, 1)
    )
    if expected_duration <= 0:
        raise ValueError("Expected project duration must be positive.")
    format_data = probe.get("format") or {}
    actual_duration = _number(format_data.get("duration"), "FFprobe duration")
    duration_delta = abs(actual_duration - expected_duration)
    if duration_delta > DURATION_TOLERANCE_SECONDS:
        raise ValueError("Quality gate: duration differs from the project timeline.")

    audio_expected = bool(job.get("audio_file") or job.get("voiceover_file") or job.get("music_file"))
    audio_streams = [stream for stream in streams if stream.get("codec_type") == "audio"]
    audio_found = bool(audio_streams)
    if audio_expected and not audio_found:
        raise ValueError("Quality gate: requested audio stream missing.")

    return {
        "schema": "cineforge.render-qa",
        "schema_version": 1,
        "project_title": str(job.get("title", ""))[:160],
        "aspect": aspect,
        "expected_dimensions": [expected_width, expected_height],
        "expected_duration": expected_duration,
        "actual_duration": actual_duration,
        "duration_delta": duration_delta,
        "video": {
            "codec": video.get("codec_name"),
            "width": video.get("width"),
            "height": video.get("height"),
            "frame_rate": frame_rate,
            "average_frame_rate": video.get("avg_frame_rate"),
            "bit_rate": video.get("bit_rate"),
        },
        "audio_expected": audio_expected,
        "audio_found": audio_found,
        "audio_streams": [
            {
                "codec": stream.get("codec_name"),
                "sample_rate": stream.get("sample_rate"),
                "channels": stream.get("channels"),
                "channel_layout": stream.get("channel_layout"),
                "bit_rate": stream.get("bit_rate"),
            }
            for stream in audio_streams
        ],
        "format": {
            "duration": format_data.get("duration"),
            "container_size_bytes": format_data.get("size"),
            "bit_rate": format_data.get("bit_rate"),
        },
        "output": {
            "filename": video_path.name,
            "size_bytes": size_bytes,
            "sha256": sha256_file(video_path),
        },
        "quality_gates": {
            "h264_video": True,
            "expected_dimensions": True,
            "allowed_frame_rate": True,
            "timeline_duration": True,
            "requested_audio_present": (not audio_expected) or audio_found,
            "non_empty_output": True,
            "sha256_recorded": True,
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--job", type=Path, required=True)
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--probe", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)

    job = json.loads(args.job.read_text(encoding="utf-8"))
    probe = json.loads(args.probe.read_text(encoding="utf-8"))
    report = build_qa_report(job, probe, args.video)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
