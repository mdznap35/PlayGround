import hashlib
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from qa_report import build_qa_report, run_content_analysis


def fixture(tmp: Path, *, audio=True):
    video = tmp / "render.mp4"
    video.write_bytes(b"cineforge-test-mp4-bytes")
    streams = [{
        "codec_type": "video",
        "codec_name": "h264",
        "width": 1920,
        "height": 1080,
        "r_frame_rate": "24/1",
        "avg_frame_rate": "24/1",
        "bit_rate": "1500000",
    }]
    if audio:
        streams.append({
            "codec_type": "audio",
            "codec_name": "aac",
            "sample_rate": "48000",
            "channels": 2,
            "channel_layout": "stereo",
            "bit_rate": "192000",
        })
    job = {
        "title": "تقرير اختبار",
        "aspect": "16:9",
        "scenes": [{"seconds": 3}],
        "voiceover_file": "audio/voice.wav" if audio else None,
    }
    probe = {
        "streams": streams,
        "format": {"duration": "3.0", "size": str(video.stat().st_size), "bit_rate": "1700000"},
    }
    return job, probe, video


class QaReportTests(unittest.TestCase):
    def test_report_records_sha256_size_and_stream_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            job, probe, video = fixture(Path(folder))
            report = build_qa_report(job, probe, video)
            self.assertEqual(report["schema"], "cineforge.render-qa")
            self.assertEqual(report["output"]["size_bytes"], video.stat().st_size)
            self.assertEqual(report["output"]["sha256"], hashlib.sha256(video.read_bytes()).hexdigest())
            self.assertEqual(report["video"]["frame_rate"], "24/1")
            self.assertEqual(report["audio_streams"][0]["codec"], "aac")
            self.assertEqual(report["audio_streams"][0]["channels"], 2)
            self.assertTrue(all(report["quality_gates"].values()))

    def test_silent_job_is_valid_without_audio_and_reports_it_explicitly(self):
        with tempfile.TemporaryDirectory() as folder:
            job, probe, video = fixture(Path(folder), audio=False)
            report = build_qa_report(job, probe, video)
            self.assertFalse(report["audio_expected"])
            self.assertFalse(report["audio_found"])
            self.assertEqual(report["audio_streams"], [])
            self.assertTrue(report["quality_gates"]["requested_audio_present"])

    def test_requested_audio_must_exist(self):
        with tempfile.TemporaryDirectory() as folder:
            job, probe, video = fixture(Path(folder), audio=False)
            job["music_file"] = "audio/music.wav"
            with self.assertRaisesRegex(ValueError, "requested audio stream missing"):
                build_qa_report(job, probe, video)

    def test_rejects_wrong_dimensions_frame_rate_and_duration(self):
        with tempfile.TemporaryDirectory() as folder:
            job, probe, video = fixture(Path(folder))
            bad = dict(probe)
            bad["streams"] = [dict(probe["streams"][0], width=1280)]
            with self.assertRaisesRegex(ValueError, "unexpected video dimensions"):
                build_qa_report(job, bad, video)
            bad = dict(probe)
            bad["streams"] = [dict(probe["streams"][0], r_frame_rate="60/1"), probe["streams"][1]]
            with self.assertRaisesRegex(ValueError, "unexpected frame rate"):
                build_qa_report(job, bad, video)
            bad = dict(probe)
            bad["format"] = dict(probe["format"], duration="4.5")
            with self.assertRaisesRegex(ValueError, "duration differs"):
                build_qa_report(job, bad, video)

    @patch("qa_report.shutil.which", return_value="/usr/bin/ffmpeg")
    @patch("qa_report.subprocess.run")
    def test_content_analysis_collects_black_freeze_and_silence_warnings(self, mocked_run, _which):
        mocked_run.return_value = SimpleNamespace(
            returncode=0,
            stdout="",
            stderr=(
                "[blackdetect] black_duration:2.5\\n"
                "[freezedetect] freeze_duration:3.0\\n"
                "[silencedetect] silence_duration:4.25\\n"
            ),
        )
        with tempfile.TemporaryDirectory() as folder:
            report = run_content_analysis(Path(folder) / "render.mp4", include_audio=True)
        self.assertEqual(report["status"], "completed")
        self.assertEqual(report["black_segments_seconds"], [2.5])
        self.assertEqual(report["frozen_segments_seconds"], [3.0])
        self.assertEqual(report["silence_segments_seconds"], [4.25])
        self.assertEqual(report["warning_count"], 3)
        command = mocked_run.call_args.args[0]
        self.assertIn("blackdetect=d=2:pix_th=0.10,freezedetect=n=-50dB:d=2", command)
        self.assertIn("silencedetect=noise=-50dB:d=2", command)

    @patch("qa_report.shutil.which", return_value="/usr/bin/ffmpeg")
    @patch("qa_report.subprocess.run")
    def test_content_analysis_skips_silence_filter_for_silent_jobs(self, mocked_run, _which):
        mocked_run.return_value = SimpleNamespace(returncode=0, stdout="", stderr="")
        with tempfile.TemporaryDirectory() as folder:
            report = run_content_analysis(Path(folder) / "render.mp4", include_audio=False)
        self.assertEqual(report["status"], "completed")
        self.assertFalse(report["audio_analyzed"])
        self.assertEqual(report["silence_segments_seconds"], [])
        command = mocked_run.call_args.args[0]
        self.assertIn("-an", command)
        self.assertNotIn("-af", command)

    @patch("qa_report.shutil.which", return_value=None)
    def test_content_analysis_is_advisory_when_ffmpeg_is_unavailable(self, _which):
        report = run_content_analysis(Path("render.mp4"), include_audio=False)
        self.assertEqual(report["status"], "unavailable")
        self.assertIn("not available", report["reason"])

    def test_rejects_missing_empty_and_invalid_aspect_outputs(self):
        with tempfile.TemporaryDirectory() as folder:
            job, probe, video = fixture(Path(folder))
            with self.assertRaisesRegex(ValueError, "Unsupported export aspect"):
                build_qa_report(dict(job, aspect="4:3"), probe, video)
            missing = Path(folder) / "missing.mp4"
            with self.assertRaisesRegex(ValueError, "MP4 is missing"):
                build_qa_report(job, probe, missing)
            empty = Path(folder) / "empty.mp4"
            empty.touch()
            with self.assertRaisesRegex(ValueError, "MP4 is empty"):
                build_qa_report(job, probe, empty)


if __name__ == "__main__":
    unittest.main()
