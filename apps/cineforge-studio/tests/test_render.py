import sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from render import validate_job, resolve_media_path

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

    def test_media_resolution_rejects_symlink_escape(self):
        with tempfile.TemporaryDirectory() as folder, tempfile.TemporaryDirectory() as outside:
            root=Path(folder); external=Path(outside)/"secret.jpg"; external.write_bytes(b"x")
            assets=root/"assets"; assets.mkdir(); (assets/"escape.jpg").symlink_to(external)
            with self.assertRaisesRegex(ValueError,"points outside"):
                resolve_media_path(root,"assets/escape.jpg","Image")

if __name__=="__main__": unittest.main()
