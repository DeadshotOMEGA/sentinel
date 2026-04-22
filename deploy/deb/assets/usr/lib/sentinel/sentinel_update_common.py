from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STATE_ROOT = Path(os.environ.get("SENTINEL_UPDATER_STATE_ROOT", "/var/lib/sentinel/updater"))
CURRENT_JOB_PATH = STATE_ROOT / "current-job.json"
JOBS_DIR = STATE_ROOT / "jobs"
DOWNLOADS_DIR = STATE_ROOT / "downloads"
BACKUPS_DIR = STATE_ROOT / "backups"
LOCK_PATH = STATE_ROOT / "update.lock"

APPLIANCE_ENV_PATH = Path(os.environ.get("SENTINEL_APPLIANCE_ENV", "/etc/sentinel/appliance.env"))
APPLIANCE_STATE_PATH = Path(
    os.environ.get("SENTINEL_APPLIANCE_STATE", "/var/lib/sentinel/appliance/state.json")
)
LEGACY_STATE_PATH = Path(
    os.environ.get("SENTINEL_LEGACY_APPLIANCE_STATE", "/opt/sentinel/deploy/.appliance-state")
)
DEPLOY_DIR = Path(os.environ.get("SENTINEL_DEPLOY_DIR", "/opt/sentinel/deploy"))
LOG_ROOT = Path(os.environ.get("SENTINEL_UPDATER_LOG_ROOT", "/var/log/sentinel"))
HEALTH_URL = os.environ.get("SENTINEL_HEALTH_URL", "http://127.0.0.1/healthz")
DEFAULT_RELEASE_REPOSITORY = os.environ.get(
    "SENTINEL_RELEASE_REPOSITORY",
    f"{os.environ.get('GHCR_OWNER', 'deadshotomega').strip() or 'deadshotomega'}/sentinel",
)

VERSION_PATTERN = re.compile(r"^v[0-9]+\.[0-9]+\.[0-9]+$")
JOB_ID_PATTERN = re.compile(r"^system-update-[0-9]{13}-[0-9a-f-]{36}$")
TERMINAL_JOB_STATUSES = {"completed", "failed", "rollback_attempted", "rolled_back"}


def utc_now() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def ensure_directory(path: Path, mode: int | None = None) -> None:
    path.mkdir(parents=True, exist_ok=True)
    if mode is not None:
        try:
            os.chmod(path, mode)
        except PermissionError:
            # The bridge service runs as an unprivileged account and should be
            # able to reuse package-created runtime directories without taking
            # ownership of their mode on every startup.
            pass


def ensure_runtime_directories() -> None:
    ensure_directory(STATE_ROOT, 0o775)
    ensure_directory(JOBS_DIR, 0o775)
    ensure_directory(DOWNLOADS_DIR, 0o775)
    ensure_directory(BACKUPS_DIR, 0o775)
    ensure_directory(LOG_ROOT, 0o750)
    ensure_directory(APPLIANCE_STATE_PATH.parent, 0o755)
    if not LOCK_PATH.exists():
        LOCK_PATH.touch(mode=0o664)


def read_json_file(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None

    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json_file(path: Path, payload: dict[str, Any], mode: int = 0o644) -> None:
    ensure_directory(path.parent)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=str(path.parent), delete=False
    ) as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
        tmp_name = handle.name

    os.chmod(tmp_name, mode)
    os.replace(tmp_name, path)


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()

    return values


def write_env_file(path: Path, values: dict[str, str], mode: int = 0o600) -> None:
    ensure_directory(path.parent)
    lines = [f"{key}={values[key]}" for key in sorted(values)]
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=str(path.parent), delete=False
    ) as handle:
        handle.write("\n".join(lines))
        handle.write("\n")
        tmp_name = handle.name

    os.chmod(tmp_name, mode)
    os.replace(tmp_name, path)


def upsert_env_value(path: Path, key: str, value: str) -> dict[str, str]:
    values = read_env_file(path)
    values[key] = value
    write_env_file(path, values)
    return values


def resolve_release_repository() -> str:
    appliance_env = read_env_file(APPLIANCE_ENV_PATH)
    configured_owner = appliance_env.get("GHCR_OWNER", "").strip()
    configured_repo = appliance_env.get("SENTINEL_RELEASE_REPOSITORY", "").strip()

    if configured_repo:
        return configured_repo
    if configured_owner:
        return f"{configured_owner}/sentinel"
    return DEFAULT_RELEASE_REPOSITORY


def parse_legacy_state() -> dict[str, Any]:
    raw = read_env_file(LEGACY_STATE_PATH)
    return {
        "schemaVersion": 1,
        "withObs": normalize_bool(raw.get("WITH_OBS", "false")),
        "allowGrafanaLan": normalize_bool(raw.get("ALLOW_GRAFANA_LAN", "false")),
        "allowWikiLan": normalize_bool(raw.get("ALLOW_WIKI_LAN", "false")),
        "lanCidr": raw.get("LAN_CIDR", ""),
        "currentVersion": raw.get("CURRENT_VERSION", ""),
        "previousVersion": raw.get("PREVIOUS_VERSION", ""),
    }


def load_appliance_state() -> dict[str, Any]:
    state = read_json_file(APPLIANCE_STATE_PATH)
    if state is not None:
        return {
            "schemaVersion": int(state.get("schemaVersion", 1)),
            "withObs": bool(state.get("withObs", False)),
            "allowGrafanaLan": bool(state.get("allowGrafanaLan", False)),
            "allowWikiLan": bool(state.get("allowWikiLan", False)),
            "lanCidr": str(state.get("lanCidr", "")),
            "currentVersion": str(state.get("currentVersion", "")),
            "previousVersion": str(state.get("previousVersion", "")),
        }

    return parse_legacy_state()


def save_appliance_state(state: dict[str, Any]) -> None:
    payload = {
        "schemaVersion": 1,
        "withObs": bool(state.get("withObs", False)),
        "allowGrafanaLan": bool(state.get("allowGrafanaLan", False)),
        "allowWikiLan": bool(state.get("allowWikiLan", False)),
        "lanCidr": str(state.get("lanCidr", "")),
        "currentVersion": str(state.get("currentVersion", "")),
        "previousVersion": str(state.get("previousVersion", "")),
        "updatedAt": utc_now(),
    }
    write_json_file(APPLIANCE_STATE_PATH, payload, mode=0o644)
    ensure_directory(LEGACY_STATE_PATH.parent)
    LEGACY_STATE_PATH.write_text(
        "\n".join(
            [
                f"WITH_OBS={'true' if payload['withObs'] else 'false'}",
                f"ALLOW_GRAFANA_LAN={'true' if payload['allowGrafanaLan'] else 'false'}",
                f"ALLOW_WIKI_LAN={'true' if payload['allowWikiLan'] else 'false'}",
                f"LAN_CIDR={payload['lanCidr']}",
                f"CURRENT_VERSION={payload['currentVersion']}",
                f"PREVIOUS_VERSION={payload['previousVersion']}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    os.chmod(LEGACY_STATE_PATH, 0o644)


def normalize_bool(value: str | bool | None) -> bool:
    if isinstance(value, bool):
        return value
    normalized = (value or "").strip().lower()
    return normalized in {"1", "true", "yes", "y", "on"}


def normalize_version_tag(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed or trimmed.lower() == "unknown":
        return None
    return trimmed if trimmed.startswith("v") else f"v{trimmed}"


def is_terminal_status(status: str | None) -> bool:
    return bool(status and status in TERMINAL_JOB_STATUSES)


def compose_command(state: dict[str, Any], *subcommand: str) -> list[str]:
    command = [
        "docker",
        "compose",
        "--env-file",
        str(APPLIANCE_ENV_PATH),
        "-f",
        str(DEPLOY_DIR / "docker-compose.yml"),
    ]
    if state.get("allowGrafanaLan"):
        command.extend(["-f", str(DEPLOY_DIR / "docker-compose.grafana-lan.yml")])
    if state.get("allowWikiLan"):
        command.extend(["-f", str(DEPLOY_DIR / "docker-compose.wiki-lan.yml")])
    if state.get("withObs"):
        command.extend(["--profile", "obs"])
    command.extend(subcommand)
    return command


def sanitize_failure_summary(message: str, limit: int = 240) -> str:
    single_line = " ".join(message.split())
    if len(single_line) <= limit:
        return single_line
    return single_line[: limit - 3].rstrip() + "..."
