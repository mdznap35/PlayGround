#!/usr/bin/env python3
"""CineForge CPU renderer with optional stills and audio tracks."""
from __future__ import annotations
import argparse, json, math, shutil, subprocess, sys, tempfile
from pathlib import Path, PurePosixPath
from typing import Any
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps, features

try:
    RAQM_AVAILABLE = features.check_feature("raqm")
except Exception:
    RAQM_AVAILABLE = False

MAX_SCENES, MAX_SCENE_SECONDS, MAX_TOTAL_SECONDS, MAX_TEXT = 40, 90, 900, 700
CAMERA_MOVES = {"static", "push_in", "pull_out", "pan_left", "pan_right", "pan_up", "pan_down"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac"}
PALETTES = {
    "cinematic": ((8,20,39),(21,69,88),(184,243,211)),
    "documentary": ((18,31,49),(54,79,104),(224,203,157)),
    "educational": ((10,39,61),(35,91,106),(169,212,239)),
    "editorial": ((38,34,57),(83,67,101),(235,198,160)),
    "promo": ((42,28,48),(117,65,83),(240,199,123)),
}

def validate_media_reference(value: Any, label: str, extensions: set[str], required_folder: str, allow_root: bool = False) -> str | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str) or len(value) > 180:
        raise ValueError(f"{label} must be a relative path no longer than 180 characters.")
    if "\\" in value or "\x00" in value:
        raise ValueError(f"{label} must use forward slashes and cannot contain null bytes.")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise ValueError(f"{label} must not contain absolute paths, '.' or '..'.")
    in_required_folder = len(path.parts) >= 2 and path.parts[0] == required_folder
    in_job_root = allow_root and len(path.parts) == 1
    if not (in_required_folder or in_job_root):
        raise ValueError(f"{label} must be stored in jobs/{required_folder}/" + (" or directly in jobs/." if allow_root else "."))
    if path.suffix.lower() not in extensions:
        raise ValueError(f"{label} has an unsupported file extension.")
    return path.as_posix()

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
    aspect, style = job.get("aspect", "16:9"), job.get("style", "cinematic")
    if aspect not in {"16:9", "9:16", "1:1"}:
        raise ValueError("aspect must be 16:9, 9:16, or 1:1.")
    if not isinstance(style, str) or style not in PALETTES:
        raise ValueError("Unknown visual style.")
    try:
        fps = int(job.get("fps", 24))
    except (TypeError, ValueError) as exc:
        raise ValueError("fps must be 24, 25, or 30.") from exc
    if fps not in {24, 25, 30}:
        raise ValueError("fps must be 24, 25, or 30.")
    legacy_audio = validate_media_reference(job.get("audio_file"), "audio_file", AUDIO_EXTENSIONS, "audio", allow_root=True)
    voiceover = validate_media_reference(job.get("voiceover_file"), "voiceover_file", AUDIO_EXTENSIONS, "audio")
    music = validate_media_reference(job.get("music_file"), "music_file", AUDIO_EXTENSIONS, "audio")
    if legacy_audio and (voiceover or music):
        raise ValueError("Use audio_file alone, or voiceover_file/music_file — not both.")
    try:
        music_volume = float(job.get("music_volume", 0.18))
        voiceover_volume = float(job.get("voiceover_volume", 1.0))
    except (TypeError, ValueError) as exc:
        raise ValueError("Audio volumes must be numeric.") from exc
    if not math.isfinite(music_volume) or not math.isfinite(voiceover_volume):
        raise ValueError("Audio volumes must be finite numbers.")
    if not 0 <= music_volume <= 1 or not 0 <= voiceover_volume <= 2:
        raise ValueError("Audio volumes are outside the supported range.")
    normalized, total = [], 0
    for index, scene in enumerate(scenes, 1):
        if not isinstance(scene, dict):
            raise ValueError(f"Scene {index} must be an object.")
        scene_title = str(scene.get("title", f"Scene {index}")).strip()
        narration, visual = str(scene.get("narration", "")).strip(), str(scene.get("visual", "")).strip()
        seconds = scene.get("seconds", 8)
        if isinstance(seconds, bool) or not isinstance(seconds, (int, float)):
            raise ValueError(f"Scene {index}: seconds must be a number.")
        seconds = int(seconds)
        if not 3 <= seconds <= MAX_SCENE_SECONDS:
            raise ValueError(f"Scene {index}: seconds must be 3–{MAX_SCENE_SECONDS}.")
        if len(scene_title) > 100 or len(narration) > MAX_TEXT or len(visual) > 500:
            raise ValueError(f"Scene {index}: text is longer than the allowed limit.")
        scene_id = scene.get("id", "scene-" + str(index))
        if not isinstance(scene_id, str) or not scene_id.strip() or len(scene_id) > 120:
            raise ValueError(f"Scene {index}: id must be a non-empty string up to 120 characters.")
        camera = scene.get("camera_move", "push_in")
        if not isinstance(camera, str) or camera not in CAMERA_MOVES:
            raise ValueError(f"Scene {index}: unsupported camera_move.")
        narrative_role = scene.get("narrative_role", "story_beat")
        allowed_roles = {"hook", "context", "setup", "development", "turning_point", "resolution", "closing", "story_beat"}
        if not isinstance(narrative_role, str) or narrative_role not in allowed_roles:
            raise ValueError(f"Scene {index}: unsupported narrative_role.")
        purpose = scene.get("purpose", "")
        continuity_note = scene.get("continuity_note", "")
        if not isinstance(purpose, str) or len(purpose) > 300:
            raise ValueError(f"Scene {index}: purpose must be text up to 300 characters.")
        if not isinstance(continuity_note, str) or len(continuity_note) > 500:
            raise ValueError(f"Scene {index}: continuity_note must be text up to 500 characters.")
        image_file = validate_media_reference(scene.get("image_file"), f"Scene {index} image_file", IMAGE_EXTENSIONS, "assets")
        total += seconds
        normalized.append({"id":scene_id.strip(),"title":scene_title[:100],"narration":narration[:MAX_TEXT],"visual":visual[:500],
                           "narrative_role":narrative_role,"purpose":purpose,"continuity_note":continuity_note,
                           "seconds":seconds,"camera_move":camera,"image_file":image_file})
    if total > MAX_TOTAL_SECONDS:
        raise ValueError(f"Total duration exceeds {MAX_TOTAL_SECONDS} seconds.")
    scene_ranges = {}
    scene_cursor = 0.0
    for scene in normalized:
        scene_ranges[scene["id"]] = (scene_cursor, scene_cursor + scene["seconds"])
        scene_cursor += scene["seconds"]
    subtitles = job.get("subtitles", [])
    if not isinstance(subtitles, list) or len(subtitles) > 500:
        raise ValueError("subtitles must contain between 0 and 500 cues.")
    normalized_subtitles, subtitle_ids = [], set()
    for index, cue in enumerate(subtitles, 1):
        if not isinstance(cue, dict):
            raise ValueError(f"Subtitle {index} must be an object.")
        cue_id = cue.get("id")
        scene_id = cue.get("scene_id")
        text = cue.get("text")
        if not isinstance(cue_id, str) or not cue_id.strip() or len(cue_id) > 120 or cue_id in subtitle_ids:
            raise ValueError(f"Subtitle {index}: id must be unique text up to 120 characters.")
        subtitle_ids.add(cue_id)
        if not isinstance(scene_id, str) or scene_id not in scene_ranges:
            raise ValueError(f"Subtitle {index}: scene_id does not reference a known scene.")
        if not isinstance(text, str):
            raise ValueError(f"Subtitle {index}: text must be a string.")
        text = text.replace("\\x00", "").strip()
        if not text or len(text) > 180 or len(text.splitlines()) > 2:
            raise ValueError(f"Subtitle {index}: text must be 1–180 characters on at most two lines.")
        raw_start, raw_end = cue.get("start"), cue.get("end")
        if isinstance(raw_start, bool) or isinstance(raw_end, bool):
            raise ValueError(f"Subtitle {index}: start and end must be numeric.")
        try:
            start, end = float(raw_start), float(raw_end)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Subtitle {index}: start and end must be numeric.") from exc
        if not math.isfinite(start) or not math.isfinite(end) or start < 0 or end <= start or end > total + 0.001:
            raise ValueError(f"Subtitle {index}: invalid time range.")
        scene_start, scene_end = scene_ranges[scene_id]
        if start < scene_start - 0.001 or end > scene_end + 0.001:
            raise ValueError(f"Subtitle {index}: cue must fit inside its linked scene.")
        normalized_subtitles.append({"id":cue_id,"scene_id":scene_id,"start":start,"end":end,"text":text})
    normalized_subtitles.sort(key=lambda cue: (cue["start"], cue["end"]))
    for index in range(1, len(normalized_subtitles)):
        if normalized_subtitles[index]["start"] < normalized_subtitles[index-1]["end"] - 0.001:
            raise ValueError("Subtitle cues must not overlap.")
    result = dict(job)
    result.update({"title":title,"aspect":aspect,"style":style,"fps":fps,"scenes":normalized,
                   "subtitles":normalized_subtitles,
                   "audio_file":legacy_audio,"voiceover_file":voiceover,"music_file":music,
                   "music_volume":music_volume,"voiceover_volume":voiceover_volume})
    return result

def resolve_media_path(job_dir: Path, relative_name: str, label: str) -> Path:
    root = job_dir.resolve()
    target = (root / relative_name).resolve()
    if root not in target.parents or not target.is_file():
        raise ValueError(f"{label} is missing or points outside the jobs folder: {relative_name}")
    return target

def shape_text(text: str) -> str:
    if RAQM_AVAILABLE:
        return text
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text

def layout_options(text: str) -> dict[str, str]:
    if RAQM_AVAILABLE and any("\u0600" <= char <= "\u06ff" for char in text):
        return {"direction":"rtl","language":"ar"}
    return {}

def font(size: int, bold: bool = False):
    path = ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
            else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    if Path(path).is_file():
        opts = {"layout_engine":ImageFont.Layout.RAQM} if RAQM_AVAILABLE else {}
        return ImageFont.truetype(path, size=size, **opts)
    return ImageFont.load_default()

def wrap_lines(draw, text, selected_font, max_width):
    words = shape_text(text).split()
    if not words:
        return []
    lines, current = [], words[0]
    for word in words[1:]:
        trial = current + " " + word
        if draw.textbbox((0,0), trial, font=selected_font, **layout_options(trial))[2] <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines

def interpolate(a, b, t):
    return tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3))

def make_background(width, height, style):
    top, bottom, accent = PALETTES[style]
    column = Image.new("RGB", (1,height))
    column.putdata([interpolate(top,bottom,y/max(1,height-1)) for y in range(height)])
    image = column.resize((width,height))
    draw = ImageDraw.Draw(image,"RGBA")
    for star in range(76):
        x,y=(star*193+71)%width,(star*97+29)%height
        r=1 if star%4 else 2
        draw.ellipse((x-r,y-r,x+r,y+r),fill=(230,241,248,90+(star%4)*25))
    cx,cy=int(width*.78),int(height*.33)
    orbit=int(min(width,height)*.23)
    for multiplier,alpha in ((1.0,55),(1.32,34)):
        radius=int(orbit*multiplier)
        draw.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),outline=(*accent,alpha),width=max(2,width//720))
    return image

def draw_scene(scene, index, count, aspect, style, output, job_dir):
    if aspect=="9:16": width,height=1080,1920
    elif aspect=="1:1": width=height=1080
    else: width,height=1920,1080
    image_file=scene.get("image_file")
    if image_file:
        source_path=resolve_media_path(job_dir,image_file,f"Scene {index} image")
        with Image.open(source_path) as source:
            image=ImageOps.fit(source.convert("RGB"),(width,height),method=Image.Resampling.LANCZOS)
        image=ImageEnhance.Color(image).enhance(.88)
        image=ImageEnhance.Contrast(image).enhance(1.08)
        image=Image.blend(image,Image.new("RGB",(width,height),(3,9,19)),.38)
    else:
        image=make_background(width,height,style)
    _,_,accent=PALETTES[style]
    overlay=Image.new("RGBA",(width,height),(3,9,19,52))
    ImageDraw.Draw(overlay,"RGBA").rectangle((0,int(height*.36),width,height),fill=(3,9,19,64))
    image=image.convert("RGBA")
    image.alpha_composite(overlay)
    draw=ImageDraw.Draw(image,"RGBA")
    grid=(190,220,240,13)
    for x in range(0,width,max(36,width//28)): draw.line((x,0,x,height),fill=grid,width=1)
    for y in range(0,height,max(36,height//18)): draw.line((0,y,width,y),fill=grid,width=1)
    margin=int(width*.075)
    meta_font,title_font,body_font,footer_font=font(max(20,width//95),True),font(max(42,width//24),True),font(max(24,width//54)),font(max(18,width//100),True)
    draw.rounded_rectangle((margin,int(height*.12),margin+int(width*.06),int(height*.125)),radius=3,fill=(*accent,230))
    draw.text((margin,int(height*.17)),f"CINEFORGE   /   {index:02d}",font=meta_font,fill=(225,239,244,220))
    title_lines=wrap_lines(draw,scene["title"],title_font,int(width*.82))[:3]
    title_y=int(height*.48) if aspect!="9:16" else int(height*.45)
    for line in title_lines:
        draw.text((width-margin,title_y),line,font=title_font,fill=(245,248,250,255),anchor="ra",**layout_options(line))
        title_y+=int(title_font.size*1.35)
    body_y=title_y+int(height*.04)
    for line in wrap_lines(draw,scene["narration"],body_font,int(width*.82))[:4]:
        draw.text((width-margin,body_y),line,font=body_font,fill=(213,226,235,238),anchor="ra",**layout_options(line))
        body_y+=int(body_font.size*1.65)
    footer_y=height-int(height*.105)
    draw.rounded_rectangle((margin,footer_y,width-margin,footer_y+4),radius=2,fill=(*accent,220))
    draw.text((margin,footer_y+int(height*.025)),"STORYBOARD   /   CINEMATIC COMPOSITE",font=footer_font,fill=(225,235,242,200))
    draw.text((width-margin,footer_y+int(height*.025)),f"{index:02d}   —   {count:02d}",font=footer_font,fill=(*accent,245),anchor="ra")
    output.parent.mkdir(parents=True,exist_ok=True)
    image.convert("RGB").save(output,format="PNG",optimize=True)
    return width,height

def run_ffmpeg(args):
    completed=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if completed.returncode:
        details=completed.stderr[-4500:] if completed.stderr else "No FFmpeg diagnostic was returned."
        raise RuntimeError("FFmpeg failed:\n"+details)

def camera_filter(move,fps,seconds,width,height):
    frames=max(1,fps*seconds)
    if move=="static": zoom,x,y="1.0","iw/2-(iw/zoom/2)","ih/2-(ih/zoom/2)"
    elif move=="pull_out": zoom,x,y="max(1.0,1.07-on*0.00045)","iw/2-(iw/zoom/2)","ih/2-(ih/zoom/2)"
    elif move=="pan_left": zoom,x,y="1.07",f"(iw-iw/zoom)*on/{frames}","ih/2-(ih/zoom/2)"
    elif move=="pan_right": zoom,x,y="1.07",f"(iw-iw/zoom)*(1-on/{frames})","ih/2-(ih/zoom/2)"
    elif move=="pan_up": zoom,x,y="1.07","iw/2-(iw/zoom/2)",f"(ih-ih/zoom)*on/{frames}"
    elif move=="pan_down": zoom,x,y="1.07","iw/2-(iw/zoom/2)",f"(ih-ih/zoom)*(1-on/{frames})"
    else: zoom,x,y="min(zoom+0.00045,1.07)","iw/2-(iw/zoom/2)","ih/2-(ih/zoom/2)"
    return (f"scale={width}:{height},zoompan=z='{zoom}':x='{x}':y='{y}':d=1:s={width}x{height}:fps={fps},"
            "fade=t=in:st=0:d=0.45,"+f"fade=t=out:st={max(0,seconds-.45):.3f}:d=0.45,format=yuv420p")

def srt_timestamp(seconds: float) -> str:
    milliseconds = max(0, round(float(seconds) * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def subtitles_srt(cues: list[dict[str, Any]]) -> str:
    return "\n\n".join(
        f"{index}\n{srt_timestamp(cue['start'])} --> {srt_timestamp(cue['end'])}\n{cue['text']}"
        for index, cue in enumerate(cues, 1)
    ) + ("\n" if cues else "")

def burn_subtitles(video_path: Path, subtitle_path: Path, output_path: Path, aspect: str) -> None:
    filter_path = str(subtitle_path.resolve()).replace("\\\\", "/").replace(":", "\\:").replace("'", "\\'")
    margin = 130 if aspect == "9:16" else 78
    font_size = 48 if aspect == "9:16" else 42
    style = f"FontName=DejaVu Sans,FontSize={font_size},PrimaryColour=&H00FFFFFF,OutlineColour=&H00101010,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV={margin},WrapStyle=2"
    subtitle_filter = f"subtitles=filename='{filter_path}':force_style='{style}'"
    run_ffmpeg([
        "ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(video_path),
        "-vf",subtitle_filter,"-an","-c:v","libx264","-preset","veryfast","-crf","20",
        "-pix_fmt","yuv420p","-movflags","+faststart",str(output_path)
    ])

def render_audio(job,job_dir,silent_video,output_path,total_seconds):
    legacy=job.get("audio_file")
    voice_name,music_name=job.get("voiceover_file"),job.get("music_file")
    if legacy:
        audio=resolve_media_path(job_dir,legacy,"Audio track")
        run_ffmpeg(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(silent_video),"-i",str(audio),
                    "-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","aac","-b:a","192k",
                    "-af","apad","-t",str(total_seconds),"-movflags","+faststart",str(output_path)])
        return
    voice=resolve_media_path(job_dir,voice_name,"Voiceover") if voice_name else None
    music=resolve_media_path(job_dir,music_name,"Music") if music_name else None
    if not voice and not music:
        shutil.copy2(silent_video,output_path)
        return
    command=["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(silent_video)]
    if voice: command.extend(["-i",str(voice)])
    if music: command.extend(["-stream_loop","-1","-i",str(music)])
    if voice and music:
        filters=(f"[1:a]aresample=48000,volume={job['voiceover_volume']},apad[voice];"
                 f"[2:a]aresample=48000,volume={job['music_volume']}[music];"
                 "[voice][music]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[audio]")
        command.extend(["-filter_complex",filters,"-map","0:v:0","-map","[audio]","-c:v","copy","-c:a","aac","-b:a","192k",
                        "-t",str(total_seconds),"-movflags","+faststart",str(output_path)])
    else:
        filters=(f"aresample=48000,volume={job['voiceover_volume']},apad,atrim=duration={total_seconds}" if voice
                 else f"aresample=48000,volume={job['music_volume']},atrim=duration={total_seconds}")
        command.extend(["-map","0:v:0","-map","1:a:0","-af",filters,"-c:v","copy","-c:a","aac","-b:a","192k",
                        "-t",str(total_seconds),"-movflags","+faststart",str(output_path)])
    run_ffmpeg(command)

def render(job_path,output_path):
    if not shutil.which("ffmpeg"): raise RuntimeError("FFmpeg is not installed or not available in PATH.")
    raw=json.loads(job_path.read_text(encoding="utf-8"))
    job=validate_job(raw)
    fps=job["fps"]
    if job["aspect"]=="9:16": width,height=1080,1920
    elif job["aspect"]=="1:1": width=height=1080
    else: width,height=1920,1080
    job_dir=job_path.resolve().parent
    output_path=output_path.resolve()
    output_path.parent.mkdir(parents=True,exist_ok=True)
    total_seconds=sum(scene["seconds"] for scene in job["scenes"])
    with tempfile.TemporaryDirectory(prefix="cineforge-") as temp_name:
        temp=Path(temp_name)
        segments=[]
        for index,scene in enumerate(job["scenes"],1):
            still=temp/f"scene-{index:02d}.png"
            draw_scene(scene,index,len(job["scenes"]),job["aspect"],job["style"],still,job_dir)
            segment=temp/f"segment-{index:02d}.mp4"
            vf=camera_filter(scene["camera_move"],fps,scene["seconds"],width,height)
            run_ffmpeg(["ffmpeg","-hide_banner","-loglevel","error","-y","-loop","1","-framerate",str(fps),"-i",str(still),
                        "-t",str(scene["seconds"]),"-vf",vf,"-r",str(fps),"-an","-c:v","libx264","-preset","veryfast",
                        "-crf","20","-pix_fmt","yuv420p","-movflags","+faststart",str(segment)])
            segments.append(segment)
        concat=temp/"concat.txt"
        concat.write_text("".join(f"file '{path.as_posix()}'\n" for path in segments),encoding="utf-8")
        silent=temp/"silent.mp4"
        run_ffmpeg(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",str(concat),
                    "-c","copy","-movflags","+faststart",str(silent)])
        video_for_audio = silent
        if job["subtitles"]:
            subtitle_file = temp / "captions.srt"
            subtitle_file.write_text(subtitles_srt(job["subtitles"]), encoding="utf-8")
            subtitled = temp / "subtitled.mp4"
            burn_subtitles(silent, subtitle_file, subtitled, job["aspect"])
            video_for_audio = subtitled
        render_audio(job,job_dir,video_for_audio,output_path,total_seconds)
    return output_path

def main():
    parser=argparse.ArgumentParser(description="Render a CineForge JSON job into an MP4.")
    parser.add_argument("job",type=Path)
    parser.add_argument("--output",type=Path,default=Path("dist/cineforge.mp4"))
    parser.add_argument("--validate-only",action="store_true")
    args=parser.parse_args()
    try:
        path=args.job.resolve()
        if not path.is_file() or path.suffix.lower()!=".json": raise ValueError("Job file must be an existing .json file.")
        job=validate_job(json.loads(path.read_text(encoding="utf-8")))
        total=sum(scene["seconds"] for scene in job["scenes"])
        if args.validate_only:
            print(f"VALID: {job['title']} | {len(job['scenes'])} scenes | {total}s | {job['aspect']}")
            return 0
        result=render(path,args.output)
        print(f"RENDERED: {result} ({total}s)")
        return 0
    except (OSError,json.JSONDecodeError,ValueError,RuntimeError) as exc:
        print(f"ERROR: {exc}",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())
