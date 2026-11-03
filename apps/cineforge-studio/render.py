#!/usr/bin/env python3
"""Render CineForge scene manifests into simple cinematic motion-graphics MP4s.

This renderer intentionally creates designed title-card sequences, not AI-generated
photorealistic footage. It requires Pillow and FFmpeg; Arabic shaping libraries are
used when available and gracefully fall back for English-only environments.
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFont, features
except ImportError as exc:  # pragma: no cover - actionable runtime error
    raise SystemExit("Missing Pillow. Install requirements.txt first.") from exc

RAQM_AVAILABLE = features.check_feature("raqm")

MAX_SCENES = 40
MAX_SCENE_SECONDS = 90
MAX_TOTAL_SECONDS = 900
MAX_TEXT = 700
PALETTES = {
    "cinematic": ((8, 20, 39), (21, 69, 88), (184, 243, 211)),
    "documentary": ((18, 31, 49), (54, 79, 104), (224, 203, 157)),
    "educational": ((10, 39, 61), (35, 91, 106), (169, 212, 239)),
    "editorial": ((38, 34, 57), (83, 67, 101), (235, 198, 160)),
    "promo": ((42, 28, 48), (117, 65, 83), (240, 199, 123)),
}


def validate_job(job: Any) -> dict[str, Any]:
    if not isinstance(job, dict):
        raise ValueError("Job root must be a JSON object.")
    if job.get("schema_version") != 1:
        raise ValueError("Unsupported schema_version; expected 1.")
    scenes = job.get("scenes")
    if not isinstance(scenes, list) or not 1 <= len(scenes) <= MAX_SCENES:
        raise ValueError(f"Job must contain between 1 and {MAX_SCENES} scenes.")

    title = str(job.get("title", "Untitled")).strip()
    if not title or len(title) > 90:
        raise ValueError("Project title must contain 1–90 characters.")
    aspect = job.get("aspect", "16:9")
    if aspect not in {"16:9", "9:16", "1:1"}:
        raise ValueError("aspect must be 16:9, 9:16, or 1:1.")
    style = job.get("style", "cinematic")
    if style not in PALETTES:
        raise ValueError("Unknown visual style.")
    fps = int(job.get("fps", 24))
    if fps not in {24, 25, 30}:
        raise ValueError("fps must be 24, 25, or 30.")

    normalized = []
    total = 0
    for index, scene in enumerate(scenes, 1):
        if not isinstance(scene, dict):
            raise ValueError(f"Scene {index} must be an object.")
        scene_title = str(scene.get("title", f"Scene {index}")).strip()
        narration = str(scene.get("narration", "")).strip()
        visual = str(scene.get("visual", "")).strip()
        seconds = scene.get("seconds", 8)
        if isinstance(seconds, bool) or not isinstance(seconds, (int, float)):
            raise ValueError(f"Scene {index}: seconds must be a number.")
        seconds = int(seconds)
        if not 3 <= seconds <= MAX_SCENE_SECONDS:
            raise ValueError(f"Scene {index}: seconds must be 3–{MAX_SCENE_SECONDS}.")
        if len(scene_title) > 100 or len(narration) > MAX_TEXT or len(visual) > 500:
            raise ValueError(f"Scene {index}: text is longer than the allowed limit.")
        total += seconds
        normalized.append({
            "title": scene_title[:100],
            "narration": narration[:MAX_TEXT],
            "visual": visual[:500],
            "seconds": seconds,
        })
    if total > MAX_TOTAL_SECONDS:
        raise ValueError(f"Total duration exceeds {MAX_TOTAL_SECONDS} seconds.")
    result = dict(job)
    result.update({"title": title, "aspect": aspect, "style": style, "fps": fps, "scenes": normalized})
    return result


def shape_text(text: str) -> str:
    """Prepare text for the active renderer without applying bidi twice."""
    if RAQM_AVAILABLE:
        # Pillow's RAQM engine performs Arabic shaping and bidirectional layout itself.
        return text
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def text_layout_options(text: str) -> dict[str, str]:
    """Use native RTL layout only when the text contains Arabic and RAQM is available."""
    if RAQM_AVAILABLE and any("\u0600" <= char <= "\u06ff" for char in text):
        return {"direction": "rtl", "language": "ar"}
    return {}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).is_file():
            options = {"layout_engine": ImageFont.Layout.RAQM} if RAQM_AVAILABLE else {}
            return ImageFont.truetype(candidate, size=size, **options)
    return ImageFont.load_default()


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, selected_font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = shape_text(text).split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = current + " " + word
        if draw.textbbox((0, 0), trial, font=selected_font, **text_layout_options(trial))[2] <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def interpolate(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def draw_scene(scene: dict[str, Any], index: int, count: int, aspect: str, style: str, output: Path) -> tuple[int, int]:
    if aspect == "9:16":
        width, height = 1080, 1920
    elif aspect == "1:1":
        width = height = 1080
    else:
        width, height = 1920, 1080

    top, bottom, accent = PALETTES[style]
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    for y in range(height):
        color = interpolate(top, bottom, y / max(1, height - 1))
        for x in range(width):
            # A restrained radial glow gives the frame depth without external assets.
            dx = (x - width * 0.76) / (width * 0.9)
            dy = (y - height * 0.3) / (height * 0.9)
            glow = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy)) * 0.15
            pixels[x, y] = tuple(min(255, int(channel + accent[i] * glow)) for i, channel in enumerate(color))

    draw = ImageDraw.Draw(image, "RGBA")
    # Grid and star points are deterministic so repeated renders remain reproducible.
    grid_color = (190, 220, 240, 17)
    for x in range(0, width, max(36, width // 28)):
        draw.line((x, 0, x, height), fill=grid_color, width=1)
    for y in range(0, height, max(36, height // 18)):
        draw.line((0, y, width, y), fill=grid_color, width=1)
    for star in range(76):
        x = (star * 193 + 71) % width
        y = (star * 97 + 29) % height
        radius = 1 if star % 4 else 2
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(230, 241, 248, 90 + (star % 4) * 25))

    cx, cy = int(width * .78), int(height * .33)
    orbit = int(min(width, height) * .23)
    for multiplier, alpha in ((1.0, 55), (1.32, 34)):
        r = int(orbit * multiplier)
        draw.ellipse((cx-r, cy-r, cx+r, cy+r), outline=(*accent, alpha), width=max(2, width // 720))
    draw.rounded_rectangle((int(width*.07), int(height*.12), int(width*.13), int(height*.125)), radius=3, fill=(*accent, 230))

    margin = int(width * .075)
    meta_font = font(max(20, width // 95), bold=True)
    title_font = font(max(42, width // 24), bold=True)
    body_font = font(max(24, width // 54))
    footer_font = font(max(18, width // 100), bold=True)
    draw.text((margin, int(height*.17)), f"CINEFORGE   /   {index:02d}", font=meta_font, fill=(225, 239, 244, 205))

    max_text_width = int(width * .82)
    title_lines = wrap_lines(draw, scene["title"], title_font, max_text_width)[:3]
    title_y = int(height * .48) if aspect != "9:16" else int(height * .45)
    for line in title_lines:
        draw.text((width-margin, title_y), line, font=title_font, fill=(245, 248, 250, 255), anchor="ra", **text_layout_options(line))
        title_y += int(title_font.size * 1.35)

    narration_lines = wrap_lines(draw, scene["narration"], body_font, max_text_width)[:4]
    body_y = title_y + int(height * .04)
    for line in narration_lines:
        draw.text((width-margin, body_y), line, font=body_font, fill=(213, 226, 235, 225), anchor="ra", **text_layout_options(line))
        body_y += int(body_font.size * 1.65)

    footer_y = height - int(height*.105)
    draw.rounded_rectangle((margin, footer_y, width-margin, footer_y+4), radius=2, fill=(*accent, 210))
    draw.text((margin, footer_y+int(height*.025)), "STORYBOARD   /   MOTION GRAPHICS", font=footer_font, fill=(213, 229, 236, 180))
    draw.text((width-margin, footer_y+int(height*.025)), f"{index:02d}   —   {count:02d}", font=footer_font, fill=(*accent, 245), anchor="ra")

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format="PNG", optimize=True)
    return width, height


def run_ffmpeg(args: list[str]) -> None:
    completed = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if completed.returncode != 0:
        details = completed.stderr[-4500:] if completed.stderr else "No FFmpeg diagnostic was returned."
        raise RuntimeError("FFmpeg failed:\n" + details)


def render(job_path: Path, output_path: Path) -> Path:
    if not shutil.which("ffmpeg"):
        raise RuntimeError("FFmpeg is not installed or not available in PATH.")
    raw = json.loads(job_path.read_text(encoding="utf-8"))
    job = validate_job(raw)
    fps = job["fps"]
    if job["aspect"] == "9:16":
        width, height = 1080, 1920
    elif job["aspect"] == "1:1":
        width = height = 1080
    else:
        width, height = 1920, 1080

    job_dir = job_path.resolve().parent
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="cineforge-") as temp_name:
        temp = Path(temp_name)
        segment_paths: list[Path] = []
        for index, scene in enumerate(job["scenes"], 1):
            still = temp / f"scene-{index:02d}.png"
            draw_scene(scene, index, len(job["scenes"]), job["aspect"], job["style"], still)
            segment = temp / f"segment-{index:02d}.mp4"
            seconds = scene["seconds"]
            fade_out_start = max(0, seconds - .45)
            vf = (
                f"scale={width}:{height},"
                f"zoompan=z='min(zoom+0.00045,1.055)':"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                f"d=1:s={width}x{height}:fps={fps},"
                f"fade=t=in:st=0:d=0.45,"
                f"fade=t=out:st={fade_out_start:.3f}:d=0.45,"
                "format=yuv420p"
            )
            run_ffmpeg([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-loop", "1", "-framerate", str(fps), "-i", str(still),
                "-t", str(seconds), "-vf", vf,
                "-r", str(fps), "-an", "-c:v", "libx264",
                "-preset", "veryfast", "-crf", "21",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(segment)
            ])
            segment_paths.append(segment)

        concat_file = temp / "concat.txt"
        concat_file.write_text("".join(f"file '{path.as_posix()}'\n" for path in segment_paths), encoding="utf-8")
        silent_video = temp / "silent.mp4"
        run_ffmpeg([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-c", "copy", "-movflags", "+faststart", str(silent_video)
        ])

        audio_name = raw.get("audio_file")
        if audio_name:
            audio_path = (job_dir / str(audio_name)).resolve()
            if job_dir not in audio_path.parents or not audio_path.is_file():
                raise ValueError("audio_file must point to an existing file inside the same jobs folder.")
            run_ffmpeg([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(silent_video), "-i", str(audio_path),
                "-map", "0:v:0", "-map", "1:a:0",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-af", "apad", "-t", str(sum(s["seconds"] for s in job["scenes"])),
                "-movflags", "+faststart", str(output_path)
            ])
        else:
            shutil.copy2(silent_video, output_path)

    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Render a CineForge JSON job into an MP4.")
    parser.add_argument("job", type=Path, help="Path to a job JSON file.")
    parser.add_argument("--output", type=Path, default=Path("dist/cineforge.mp4"))
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    try:
        job_path = args.job.resolve()
        if not job_path.is_file() or job_path.suffix.lower() != ".json":
            raise ValueError("Job file must be an existing .json file.")
        job = validate_job(json.loads(job_path.read_text(encoding="utf-8")))
        total = sum(scene["seconds"] for scene in job["scenes"])
        if args.validate_only:
            print(f"VALID: {job['title']} | {len(job['scenes'])} scenes | {total}s | {job['aspect']}")
            return 0
        result = render(job_path, args.output)
        print(f"RENDERED: {result} ({total}s)")
        return 0
    except (OSError, json.JSONDecodeError, ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
