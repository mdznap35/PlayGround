#!/usr/bin/env python3
"""Read-only hardware preflight for CineForge's temporary GPU sessions.

This script deliberately does not install packages, access the network, download
models, start workers, or read environment variables that may contain secrets.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def _human_gib(value: int | None) -> float | None:
    if value is None:
        return None
    return round(value / (1024 ** 3), 2)


def _system_memory() -> dict[str, Any]:
    try:
        page_size = int(os.sysconf("SC_PAGE_SIZE"))
        total_pages = int(os.sysconf("SC_PHYS_PAGES"))
        total = page_size * total_pages
        return {"total_bytes": total, "total_gib": _human_gib(total), "source": "os.sysconf"}
    except (AttributeError, OSError, ValueError):
        return {"total_bytes": None, "total_gib": None, "source": "unavailable"}


def _probe_nvidia_smi() -> dict[str, Any]:
    executable = shutil.which("nvidia-smi")
    if not executable:
        return {"available": False, "devices": [], "reason": "nvidia-smi not found"}

    command = [
        executable,
        "--query-gpu=index,name,memory.total,memory.free,driver_version",
        "--format=csv,noheader,nounits",
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=8, check=False)
    except subprocess.TimeoutExpired:
        return {"available": True, "devices": [], "error": "nvidia-smi timed out"}
    except OSError as exc:
        return {"available": True, "devices": [], "error": f"nvidia-smi execution failed: {type(exc).__name__}"}

    if result.returncode != 0:
        message = (result.stderr or result.stdout or "nvidia-smi failed").strip()[:500]
        return {"available": True, "devices": [], "error": message}

    devices: list[dict[str, Any]] = []
    for line in result.stdout.splitlines():
        fields = [part.strip() for part in line.split(",")]
        if len(fields) < 5:
            continue
        try:
            total_mib = int(fields[2])
            free_mib = int(fields[3])
            index = int(fields[0])
        except ValueError:
            continue
        devices.append({
            "index": index,
            "name": fields[1],
            "memory_total_mib": total_mib,
            "memory_free_mib": free_mib,
            "memory_total_gib": round(total_mib / 1024, 2),
            "memory_free_gib": round(free_mib / 1024, 2),
            "driver_version": fields[4],
        })
    return {"available": True, "devices": devices, "device_count": len(devices)}


def _probe_torch() -> dict[str, Any]:
    try:
        import torch  # type: ignore
    except Exception as exc:  # optional dependency; preflight must still work without it
        return {"installed": False, "cuda_available": False, "reason": f"PyTorch unavailable: {type(exc).__name__}"}

    cuda_available = bool(torch.cuda.is_available())
    info: dict[str, Any] = {
        "installed": True,
        "version": getattr(torch, "__version__", None),
        "cuda_build": getattr(getattr(torch, "version", None), "cuda", None),
        "cuda_available": cuda_available,
        "device_count": int(torch.cuda.device_count()) if cuda_available else 0,
        "devices": [],
    }
    if not cuda_available:
        return info

    for index in range(info["device_count"]):
        item: dict[str, Any] = {"index": index}
        try:
            props = torch.cuda.get_device_properties(index)
            item.update({
                "name": props.name,
                "total_memory_bytes": int(props.total_memory),
                "total_memory_gib": _human_gib(int(props.total_memory)),
                "compute_capability": list(torch.cuda.get_device_capability(index)),
            })
        except Exception as exc:
            item["properties_error"] = type(exc).__name__

        previous = None
        try:
            previous = torch.cuda.current_device()
            torch.cuda.set_device(index)
            item["bf16_supported"] = bool(torch.cuda.is_bf16_supported())
        except Exception:
            item["bf16_supported"] = None
        finally:
            if previous is not None:
                try:
                    torch.cuda.set_device(previous)
                except Exception:
                    pass
        info["devices"].append(item)
    return info


def build_report(provider: str | None = None, output_directory: str | Path | None = None) -> dict[str, Any]:
    directory = Path(output_directory or Path.cwd()).expanduser().resolve()
    try:
        disk = shutil.disk_usage(directory)
        disk_report = {
            "path": str(directory),
            "total_bytes": disk.total,
            "free_bytes": disk.free,
            "total_gib": _human_gib(disk.total),
            "free_gib": _human_gib(disk.free),
        }
    except OSError as exc:
        disk_report = {"path": str(directory), "error": type(exc).__name__}

    return {
        "schema": "cineforge.gpu-preflight",
        "schema_version": 1,
        "captured_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "provider_label": provider,
        "host": {
            "os": platform.system(),
            "os_release": platform.release(),
            "architecture": platform.machine(),
            "python": platform.python_version(),
        },
        "system_memory": _system_memory(),
        "disk": disk_report,
        "nvidia_smi": _probe_nvidia_smi(),
        "pytorch": _probe_torch(),
        "safety": {
            "network_used": False,
            "packages_installed": False,
            "model_weights_downloaded": False,
            "workers_started": False,
            "environment_secrets_read": False,
        },
        "next_step": "Review hardware and provider quota manually; do not download model weights until an exact manifest is approved.",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--provider", default=None, help="Non-secret provider label, e.g. kaggle or colab")
    parser.add_argument("--output", default="gpu-preflight-report.json", help="JSON report path")
    args = parser.parse_args(argv)

    output_path = Path(args.output).expanduser().resolve()
    report = build_report(
        provider=args.provider,
        output_directory=output_path.parent,
    )
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except OSError as exc:
        print(f"Could not write report: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2

    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nReport saved: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
