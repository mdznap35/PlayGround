import hashlib
import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from qa_report import build_qa_report


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
