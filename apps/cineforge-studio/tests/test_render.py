import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from render import validate_job  # noqa: E402


def sample_job():
    return {
        "schema_version": 1,
        "title": "Test film",
        "aspect": "16:9",
        "style": "cinematic",
        "fps": 24,
        "scenes": [
            {"title": "Opening", "narration": "A short line.", "visual": "A quiet opening.", "seconds": 5},
            {"title": "Ending", "narration": "A clear conclusion.", "visual": "A clean final frame.", "seconds": 6},
        ],
    }


class JobValidationTests(unittest.TestCase):
    def test_accepts_valid_job_and_normalizes_scenes(self):
        result = validate_job(sample_job())
        self.assertEqual(result["title"], "Test film")
        self.assertEqual(len(result["scenes"]), 2)
        self.assertEqual(sum(scene["seconds"] for scene in result["scenes"]), 11)

    def test_rejects_missing_scene_list(self):
        with self.assertRaisesRegex(ValueError, "between 1 and"):
            validate_job({"schema_version": 1, "title": "Missing", "scenes": []})

    def test_rejects_invalid_aspect_ratio(self):
        job = sample_job()
        job["aspect"] = "4:3"
        with self.assertRaisesRegex(ValueError, "aspect must be"):
            validate_job(job)

    def test_rejects_scene_duration_outside_range(self):
        job = sample_job()
        job["scenes"][0]["seconds"] = 2
        with self.assertRaisesRegex(ValueError, "3–90"):
            validate_job(job)

    def test_rejects_total_duration_over_limit(self):
        job = sample_job()
        job["scenes"] = [
            {"title": "Long", "narration": "", "visual": "", "seconds": 90}
            for _ in range(11)
        ]
        with self.assertRaisesRegex(ValueError, "Total duration"):
            validate_job(job)

    def test_rejects_unsupported_schema(self):
        job = sample_job()
        job["schema_version"] = 99
        with self.assertRaisesRegex(ValueError, "Unsupported schema"):
            validate_job(job)


if __name__ == "__main__":
    unittest.main()
