import json, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from render import validate_job, resolve_media_path, camera_filter, draw_scene, subtitles_srt, render
from PIL import Image

def sample_job():
    return {"schema_version":1,"title":"Test film","aspect":"16:9","style":"cinematic","fps":24,
            "scenes":[{"title":"Opening","narration":"A short line.","visual":"A quiet opening.","seconds":5},
                      {"title":"Ending","narration":"A clear conclusion.","visual":"A clean final frame.","seconds":6}]}

class JobValidationTests(unittest.TestCase):
    def test_accepts_valid_job_and_normalizes_scenes(self):
        result=validate_job(sample_job())
        self.assertEqual(result["title"],"Test film")
        self.assertEqual(len(result["scenes"]),2)
        self.assertEqual(result["scenes"][0]["camera_move"],"push_in")
        self.assertEqual(sum(s["seconds"] for s in result["scenes"]),11)
    def test_srt_export_preserves_arabic_and_real_line_breaks(self):
        body = subtitles_srt([{
            "start": 0.5, "end": 2.0, "text": "مرحباً بالعالم"
        }])
        self.assertEqual(body.splitlines(), [
            "1", "00:00:00,500 --> 00:00:02,000", "مرحباً بالعالم"
        ])
        self.assertTrue(body.endswith("\n"))

    def test_rejects_missing_scene_list(self):
        with self.assertRaisesRegex(ValueError,"between 1 and"):
            validate_job({"schema_version":1,"title":"Missing","scenes":[]})
    def test_rejects_invalid_aspect_ratio(self):
        job=sample_job(); job["aspect"]="4:3"
        with self.assertRaisesRegex(ValueError,"aspect must be"): validate_job(job)
    def test_rejects_scene_duration_outside_range(self):
        job=sample_job(); job["scenes"][0]["seconds"]=2
        with self.assertRaisesRegex(ValueError,"3–90"): validate_job(job)
    def test_rejects_total_duration_over_limit(self):
        job=sample_job(); job["scenes"]=[{"title":"Long","narration":"","visual":"","seconds":90} for _ in range(11)]
        with self.assertRaisesRegex(ValueError,"Total duration"): validate_job(job)
    def test_rejects_unsupported_schema(self):
        job=sample_job(); job["schema_version"]=99
        with self.assertRaisesRegex(ValueError,"Unsupported schema"): validate_job(job)
    def test_scene_narrative_metadata_survives_renderer_validation(self):
        job = sample_job()
        job["scenes"][0].update({
            "narrative_role": "hook",
            "purpose": "فتح سؤال مركزي",
            "continuity_note": "المعطف الأزرق ثابت في لقطات المرصد."
        })
        result = validate_job(job)
        self.assertEqual(result["schema_version"], 1)
        self.assertEqual(result["scenes"][0]["narrative_role"], "hook")
        self.assertEqual(result["scenes"][0]["purpose"], "فتح سؤال مركزي")
        self.assertEqual(result["scenes"][0]["continuity_note"], "المعطف الأزرق ثابت في لقطات المرصد.")

    def test_rejects_invalid_scene_narrative_metadata(self):
        job = sample_job()
        job["scenes"][0]["narrative_role"] = "invented-role"
        with self.assertRaisesRegex(ValueError, "unsupported narrative_role"):
            validate_job(job)
        job = sample_job()
        job["scenes"][0]["continuity_note"] = "x" * 501
        with self.assertRaisesRegex(ValueError, "continuity_note"):
            validate_job(job)

    def test_story_context_metadata_is_preserved_without_changing_renderer_schema(self):
        job = sample_job()
        job["story_context"] = {
            "schema": "cineforge.story-plan",
            "schema_version": 2,
            "audience": "طلاب المدارس",
            "characters": [{"name": "العالمة", "notes": "معطف أزرق"}]
        }
        result = validate_job(job)
        self.assertEqual(result["schema_version"], 1)
        self.assertEqual(result["story_context"]["audience"], "طلاب المدارس")
        self.assertEqual(result["story_context"]["characters"][0]["notes"], "معطف أزرق")

    def test_project_and_media_manifest_metadata_is_preserved(self):
        job = sample_job()
        job["project_manifest"] = {"schema": "cineforge.project", "schema_version": 2, "asset_count": 1}
        job["media_manifest"] = [{
            "id": "asset-test", "kind": "image", "project_path": "assets/asset-test-shot.png",
            "source_type": "licensed", "license": "CC BY 4.0", "sha256": "a" * 64
        }]
        result = validate_job(job)
        self.assertEqual(result["schema_version"], 1)
        self.assertEqual(result["project_manifest"]["schema_version"], 2)
        self.assertEqual(result["media_manifest"][0]["license"], "CC BY 4.0")
        self.assertEqual(result["media_manifest"][0]["sha256"], "a" * 64)

    def test_legacy_audio_file_in_jobs_root_remains_compatible(self):
        job = sample_job()
        job["audio_file"] = "narration.mp3"
        result = validate_job(job)
        self.assertEqual(result["audio_file"], "narration.mp3")

    def test_accepts_asset_camera_and_audio_manifest(self):
        job=sample_job(); job["scenes"][0].update({"image_file":"assets/space-01.webp","camera_move":"pan_left"})
        job["voiceover_file"]="audio/narration.mp3"; job["music_file"]="audio/score.wav"
        result=validate_job(job)
        self.assertEqual(result["scenes"][0]["image_file"],"assets/space-01.webp")
        self.assertEqual(result["scenes"][0]["camera_move"],"pan_left")
        self.assertEqual(result["voiceover_file"],"audio/narration.mp3")
        self.assertEqual(result["music_file"],"audio/score.wav")
    def test_rejects_path_traversal(self):
        job=sample_job(); job["scenes"][0]["image_file"]="assets/../../outside.jpg"
        with self.assertRaisesRegex(ValueError,"absolute paths"): validate_job(job)
    def test_rejects_absolute_asset_path(self):
        job=sample_job(); job["scenes"][0]["image_file"]="/tmp/photo.jpg"
        with self.assertRaisesRegex(ValueError,"absolute paths"): validate_job(job)
    def test_rejects_wrong_asset_folder_or_extension(self):
        job=sample_job(); job["scenes"][0]["image_file"]="audio/photo.svg"
        with self.assertRaisesRegex(ValueError,"stored in jobs/assets"): validate_job(job)
    def test_rejects_unknown_camera_move(self):
        job=sample_job(); job["scenes"][0]["camera_move"]="orbit_360"
        with self.assertRaisesRegex(ValueError,"unsupported camera_move"): validate_job(job)
    def test_rejects_ambiguous_legacy_and_split_audio(self):
        job=sample_job(); job["audio_file"]="audio/mix.mp3"; job["voiceover_file"]="audio/voice.mp3"
        with self.assertRaisesRegex(ValueError,"Use audio_file alone"): validate_job(job)
    def test_rejects_audio_volume_out_of_range(self):
        job=sample_job(); job["music_volume"]=1.5
        with self.assertRaisesRegex(ValueError,"Audio volumes"): validate_job(job)
    def test_camera_filter_supports_every_declared_move(self):
        for move in ("static", "push_in", "pull_out", "pan_left", "pan_right", "pan_up", "pan_down"):
            result = camera_filter(move, 24, 8, 1920, 1080)
            self.assertIn("zoompan=", result)
            self.assertIn("1920x1080", result)

    def test_image_asset_is_composited_to_full_frame(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "assets").mkdir()
            source = root / "assets" / "sample.png"
            Image.new("RGB", (32, 18), (22, 90, 140)).save(source)
            output = root / "frame.png"
            scene = {
                "title": "A blue world",
                "narration": "A short caption",
                "visual": "Wide establishing image",
                "seconds": 4,
                "camera_move": "push_in",
                "image_file": "assets/sample.png"
            }
            draw_scene(scene, 1, 1, "16:9", "cinematic", output, root)
            with Image.open(output) as frame:
                self.assertEqual(frame.size, (1920, 1080))
                self.assertEqual(frame.mode, "RGB")

    def test_missing_image_is_reported_before_ffmpeg(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "assets").mkdir()
            scene = {
                "title": "Missing asset",
                "narration": "",
                "visual": "",
                "seconds": 4,
                "camera_move": "static",
                "image_file": "assets/not-here.webp"
            }
            with self.assertRaisesRegex(ValueError, "is missing or points outside"):
                draw_scene(scene, 1, 1, "16:9", "cinematic", root / "frame.png", root)

    def test_end_to_end_image_voice_and_music_render_has_audio(self):
        if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
            self.skipTest("FFmpeg and FFprobe are required for the media integration test.")
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "assets").mkdir()
            (root / "audio").mkdir()
            Image.new("RGB", (320, 180), (18, 62, 100)).save(root / "assets" / "shot.png")
            for filename, frequency in (("voice.wav", 440), ("music.wav", 220)):
                subprocess.run([
                    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-f", "lavfi", "-i", f"sine=frequency={frequency}:duration=2",
                    "-c:a", "pcm_s16le", str(root / "audio" / filename)
                ], check=True, capture_output=True)
            job = {
                "schema_version": 1,
                "title": "Integration render",
                "aspect": "16:9",
                "style": "cinematic",
                "fps": 24,
                "voiceover_file": "audio/voice.wav",
                "music_file": "audio/music.wav",
                "music_volume": 0.12,
                "scenes": [{
                    "id": "shot-1",
                    "title": "A blue horizon",
                    "narration": "A short test narration.",
                    "visual": "A still image with a slow camera move.",
                    "image_file": "assets/shot.png",
                    "camera_move": "pan_left",
                    "seconds": 3
                }],
                "subtitles": [{
                    "id": "subtitle-1",
                    "scene_id": "shot-1",
                    "start": 0.5,
                    "end": 2.5,
                    "text": "مرحباً بالعالم"
                }]
            }
            job_path = root / "integration.json"
            job_path.write_text(json.dumps(job), encoding="utf-8")
            output = root / "integration.mp4"
            render(job_path, output)
            self.assertTrue(output.is_file())
            probe = subprocess.run([
                "ffprobe", "-v", "error", "-show_entries",
                "stream=codec_type,codec_name,width,height,r_frame_rate",
                "-show_entries", "format=duration", "-of", "json", str(output)
            ], check=True, capture_output=True, text=True)
            metadata = json.loads(probe.stdout)
            video = next(s for s in metadata["streams"] if s["codec_type"] == "video")
            audio = next(s for s in metadata["streams"] if s["codec_type"] == "audio")
            self.assertEqual(video["codec_name"], "h264")
            self.assertEqual((video["width"], video["height"]), (1920, 1080))
            self.assertEqual(video["r_frame_rate"], "24/1")
            self.assertEqual(audio["codec_name"], "aac")
            self.assertAlmostEqual(float(metadata["format"]["duration"]), 3.0, delta=0.8)

    def test_media_resolution_rejects_symlink_escape(self):
        with tempfile.TemporaryDirectory() as folder, tempfile.TemporaryDirectory() as outside:
            root=Path(folder); external=Path(outside)/"secret.jpg"; external.write_bytes(b"x")
            assets=root/"assets"; assets.mkdir(); (assets/"escape.jpg").symlink_to(external)
            with self.assertRaisesRegex(ValueError,"points outside"):
                resolve_media_path(root,"assets/escape.jpg","Image")

if __name__=="__main__": unittest.main()
