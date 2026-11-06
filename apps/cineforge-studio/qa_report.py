#!/usr/bin/env python3
"""Build a reproducible, machine-readable QA report for a rendered CineForge MP4."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import platform
import re
import shutil
import subprocess
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


def _stable_sha256(value: Any) -> str:
    payload = json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def read_ffmpeg_version() -> str | None:
    """Return the FFmpeg build banner without failing the render report."""
    if not shutil.which("ffmpeg"):
        return None
    try:
        completed = subprocess.run(
            ["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=10
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if completed.returncode != 0:
        return None
    return (completed.stdout or "").splitlines()[0][:300] if completed.stdout else None


def _referenced_media_fingerprints(job: dict[str, Any], job_path: Path | None) -> list[dict[str, Any]]:
    if job_path is None:
        return []
    media_root = job_path.resolve().parent
    references = [
        scene.get("image_file")
        for scene in job.get("scenes", [])
        if isinstance(scene, dict)
    ]
    references.extend(job.get(key) for key in ("audio_file", "voiceover_file", "music_file"))
    result: list[dict[str, Any]] = []
    for value in sorted({item.strip() for item in references if isinstance(item, str) and item.strip()}):
        relative = Path(value)
        entry: dict[str, Any] = {"path": value, "sha256": None, "size_bytes": None, "status": "missing"}
        if relative.is_absolute() or ".." in relative.parts:
            entry["status"] = "unsafe-path"
            result.append(entry)
            continue
        candidate = (media_root / relative).resolve()
        if not candidate.is_relative_to(media_root):
            entry["status"] = "unsafe-path"
        elif candidate.is_file():
            entry["sha256"] = sha256_file(candidate)
            entry["size_bytes"] = candidate.stat().st_size
            entry["status"] = "present"
        result.append(entry)
    return result


def build_render_identity(
    job: dict[str, Any],
    *,
    job_path: Path | None = None,
    renderer_paths: list[Path] | None = None,
    source_commit: str | None = None,
    ffmpeg_version: str | None = None,
    thumbnail_path: Path | None = None,
) -> dict[str, Any]:
    """Fingerprint the exact job, renderer sources, assets manifest and runtime."""
    job_sha = sha256_file(job_path) if job_path and job_path.is_file() else _stable_sha256(job)
    selected_renderer_paths = renderer_paths or [Path(__file__).resolve(), Path(__file__).with_name("render.py").resolve()]
    renderer_files = {
        path.name: sha256_file(path) if path.is_file() else None
        for path in selected_renderer_paths
    }
    media_manifest = job.get("media_manifest")
    asset_manifest_sha = _stable_sha256(media_manifest) if isinstance(media_manifest, list) else None
    referenced_media = _referenced_media_fingerprints(job, job_path)
    identity = {
        "job_sha256": job_sha,
        "asset_manifest_sha256": asset_manifest_sha,
        "referenced_media": referenced_media,
        "renderer_files": renderer_files,
        "source_commit": source_commit,
        "python_version": platform.python_version(),
        "ffmpeg_version": ffmpeg_version,
    }
    identity["render_id"] = _stable_sha256(identity)
    return identity


def _filter_durations(log: str, marker: str) -> list[float]:
    pattern = re.compile(rf"{re.escape(marker)}_duration:\s*(-?\d+(?:\.\d+)?)")
    values: list[float] = []
    for match in pattern.finditer(log):
        value = float(match.group(1))
        if math.isfinite(value) and value >= 0:
            values.append(value)
    return values


def run_content_analysis(video_path: Path, *, include_audio: bool) -> dict[str, Any]:
    """Run advisory black/freeze/silence detectors in one FFmpeg decode pass."""
    if not shutil.which("ffmpeg"):
        return {"status": "unavailable", "reason": "FFmpeg is not available in PATH."}
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "info", "-i", str(video_path),
        "-vf", "blackdetect=d=2:pix_th=0.10,freezedetect=n=-50dB:d=2",
    ]
    if include_audio:
        command.extend(["-af", "silencedetect=noise=-50dB:d=2"])
    else:
        command.append("-an")
    command.extend(["-f", "null", "-"])
    try:
        completed = subprocess.run(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=900
        )
    except subprocess.TimeoutExpired:
        return {"status": "unavailable", "reason": "FFmpeg content analysis timed out after 900 seconds."}
    except OSError as error:
        return {"status": "unavailable", "reason": str(error)[:300]}
    if completed.returncode != 0:
        diagnostic = (completed.stderr or completed.stdout or "No FFmpeg diagnostic.").strip()
        return {"status": "unavailable", "reason": diagnostic[-1200:]}

    log = (completed.stdout or "") + "\n" + (completed.stderr or "")
    black = _filter_durations(log, "black")
    frozen = _filter_durations(log, "freeze")
    silence = _filter_durations(log, "silence") if include_audio else []
    return {
        "status": "completed",
        "thresholds": {
            "black_segment_seconds": 2.0,
            "frozen_segment_seconds": 2.0,
            "silence_segment_seconds": 2.0,
            "silence_noise_db": -50,
        },
        "audio_analyzed": include_audio,
        "black_segments_seconds": black,
        "frozen_segments_seconds": frozen,
        "silence_segments_seconds": silence,
        "warning_count": len(black) + len(frozen) + len(silence),
        "policy": "Advisory only; intentional dark, static or silent passages require human review.",
    }


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


def build_qa_report(
    job: dict[str, Any],
    probe: dict[str, Any],
    video_path: Path,
    *,
    job_path: Path | None = None,
    renderer_paths: list[Path] | None = None,
    source_commit: str | None = None,
    ffmpeg_version: str | None = None,
) -> dict[str, Any]:
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

    thumbnail_info = None
    if thumbnail_path is not None:
        if not thumbnail_path.is_file():
            raise ValueError("Opening-frame thumbnail is missing.")
        thumbnail_size = thumbnail_path.stat().st_size
        if thumbnail_size <= 0:
            raise ValueError("Opening-frame thumbnail is empty.")
        thumbnail_info = {
            "filename": thumbnail_path.name,
            "size_bytes": thumbnail_size,
            "sha256": sha256_file(thumbnail_path),
        }

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

    render_identity = build_render_identity(
        job,
        job_path=job_path,
        renderer_paths=renderer_paths,
        source_commit=source_commit,
        ffmpeg_version=ffmpeg_version,
    )

    return {
        "schema": "cineforge.render-qa",

        "schema_version": 1,
        "render_id": render_identity["render_id"],
        "render_identity": render_identity,
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
        "thumbnail": thumbnail_info,
        "quality_gates": {
            "h264_video": True,
            "expected_dimensions": True,
            "allowed_frame_rate": True,
            "timeline_duration": True,
            "requested_audio_present": (not audio_expected) or audio_found,
            "non_empty_output": True,
            "sha256_recorded": True,
            "render_identity_recorded": True,
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--job", type=Path, required=True)
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--probe", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--thumbnail", type=Path, default=None)
    args = parser.parse_args(argv)

    job = json.loads(args.job.read_text(encoding="utf-8"))
    probe = json.loads(args.probe.read_text(encoding="utf-8"))
    report = build_qa_report(
        job, probe, args.video,
        job_path=args.job.resolve(),
        renderer_paths=[Path(__file__).resolve(), Path(__file__).with_name("render.py").resolve()],
        source_commit=os.environ.get("GITHUB_SHA"),
        ffmpeg_version=read_ffmpeg_version(),
        thumbnail_path=args.thumbnail,
    )
    report["content_analysis"] = run_content_analysis(
        args.video, include_audio=report["audio_found"]
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
