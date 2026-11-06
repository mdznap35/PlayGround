import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import gpu_preflight


class GpuPreflightTests(unittest.TestCase):
    def test_report_has_safety_guards_and_core_sections(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = gpu_preflight.build_report(provider="test", output_directory=tmp)
        self.assertEqual(report["schema"], "cineforge.gpu-preflight")
        self.assertEqual(report["provider_label"], "test")
        self.assertIn("nvidia_smi", report)
        self.assertIn("pytorch", report)
        self.assertFalse(report["safety"]["network_used"])
        self.assertFalse(report["safety"]["model_weights_downloaded"])
        self.assertFalse(report["safety"]["workers_started"])

    def test_nvidia_smi_missing_is_nonfatal(self):
        with mock.patch.object(gpu_preflight.shutil, "which", return_value=None):
            result = gpu_preflight._probe_nvidia_smi()
        self.assertFalse(result["available"])
        self.assertEqual(result["devices"], [])

    def test_nvidia_smi_parses_two_separate_gpus(self):
        fake = mock.Mock(
            returncode=0,
            stdout=(
                "0, NVIDIA T4, 16384, 12000, 550.54\n"
                "1, NVIDIA T4, 16384, 11000, 550.54\n"
            ),
            stderr="",
        )
        with (
            mock.patch.object(gpu_preflight.shutil, "which", return_value="/fake/nvidia-smi"),
            mock.patch.object(gpu_preflight.subprocess, "run", return_value=fake),
        ):
            result = gpu_preflight._probe_nvidia_smi()
        self.assertEqual(result["device_count"], 2)
        self.assertEqual(result["devices"][0]["memory_total_gib"], 16.0)
        self.assertEqual(result["devices"][1]["index"], 1)

    def test_report_cli_writes_json_without_model_downloads(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "report.json"
            with (
                mock.patch.object(
                    gpu_preflight,
                    "build_report",
                    return_value={"safety": {"model_weights_downloaded": False}},
                ),
                mock.patch("builtins.print"),
            ):
                code = gpu_preflight.main(["--provider", "test", "--output", str(target)])
            self.assertEqual(code, 0)
            data = json.loads(target.read_text(encoding="utf-8"))
            self.assertFalse(data["safety"]["model_weights_downloaded"])


if __name__ == "__main__":
    unittest.main()
