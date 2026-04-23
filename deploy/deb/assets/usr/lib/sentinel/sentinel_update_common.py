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
TRACE_LOG_PATH = STATE_ROOT / "update-trace.log"
TRACE_ARCHIVE_DIR = STATE_ROOT / "traces"
TRACE_SESSION_PATH = STATE_ROOT / "update-trace-session.json"
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
STATE_SCHEMA_VERSION = 2
REPORT_SCHEMA_VERSION = 2

VERSION_PATTERN = re.compile(r"^v[0-9]+\.[0-9]+\.[0-9]+$")
JOB_ID_PATTERN = re.compile(r"^system-update-[0-9]{13}-[0-9a-f-]{36}$")
TERMINAL_JOB_STATUSES = {"completed", "failed", "rollback_attempted", "rolled_back"}
PRIMARY_UPDATE_PHASE_KEYS = (
    "prepare_update",
    "protect_current_system",
    "install_release",
    "bring_services_back",
    "verify_and_finalize",
)
UPDATE_PHASE_DEFINITIONS = {
    "prepare_update": {
        "key": "prepare_update",
        "label": "Prepare update",
        "description": "Confirm the requested release and gather trusted metadata.",
        "kind": "primary",
        "order": 1,
        "total": len(PRIMARY_UPDATE_PHASE_KEYS),
    },
    "protect_current_system": {
        "key": "protect_current_system",
        "label": "Protect current system",
        "description": "Create recovery assets before applying the new release.",
        "kind": "primary",
        "order": 2,
        "total": len(PRIMARY_UPDATE_PHASE_KEYS),
    },
    "install_release": {
        "key": "install_release",
        "label": "Install release",
        "description": "Download, verify, and install the requested Sentinel package.",
        "kind": "primary",
        "order": 3,
        "total": len(PRIMARY_UPDATE_PHASE_KEYS),
    },
    "bring_services_back": {
        "key": "bring_services_back",
        "label": "Bring services back",
        "description": "Pull updated images and restart the Sentinel stack.",
        "kind": "primary",
        "order": 4,
        "total": len(PRIMARY_UPDATE_PHASE_KEYS),
    },
    "verify_and_finalize": {
        "key": "verify_and_finalize",
        "label": "Verify and finalize",
        "description": "Run health checks and final appliance recovery tasks.",
        "kind": "primary",
        "order": 5,
        "total": len(PRIMARY_UPDATE_PHASE_KEYS),
    },
    "recovery": {
        "key": "recovery",
        "label": "Recovery",
        "description": "Attempt rollback or point the operator to restore guidance.",
        "kind": "recovery",
        "order": len(PRIMARY_UPDATE_PHASE_KEYS),
        "total": len(PRIMARY_UPDATE_PHASE_KEYS),
    },
}
UPDATE_CHECKPOINT_DEFINITIONS = {
    "request_accepted": {
        "key": "request_accepted",
        "label": "Update request accepted",
        "detail": "The updater has accepted the update request and is waiting to continue.",
    },
    "request_authorized": {
        "key": "request_authorized",
        "label": "Request authorized",
        "detail": "The requested Sentinel release was validated and authorized to continue.",
    },
    "creating_pre_update_backup": {
        "key": "creating_pre_update_backup",
        "label": "Creating pre-update backup",
        "detail": "Creating Sentinel and Wiki.js backups before any changes are applied.",
    },
    "preparing_rollback_artifact": {
        "key": "preparing_rollback_artifact",
        "label": "Preparing rollback artifact",
        "detail": "Caching the current Sentinel release so rollback remains available.",
    },
    "downloading_release": {
        "key": "downloading_release",
        "label": "Downloading release",
        "detail": "Downloading the requested Sentinel package and release metadata.",
    },
    "verifying_release_artifacts": {
        "key": "verifying_release_artifacts",
        "label": "Verifying release artifacts",
        "detail": "Checking release checksums and manifests before installation.",
    },
    "installing_package": {
        "key": "installing_package",
        "label": "Installing package",
        "detail": "Installing the requested Sentinel package on the host appliance.",
    },
    "pulling_container_images": {
        "key": "pulling_container_images",
        "label": "Pulling container images",
        "detail": "Pulling the updated container images for the Sentinel stack.",
    },
    "restarting_services": {
        "key": "restarting_services",
        "label": "Restarting services",
        "detail": "Recreating the Sentinel stack and waiting for containers to report healthy.",
    },
    "applying_database_migrations": {
        "key": "applying_database_migrations",
        "label": "Applying database migrations",
        "detail": "Running safe database migrations inside the backend container.",
    },
    "checking_migration_status": {
        "key": "checking_migration_status",
        "label": "Checking migration status",
        "detail": "Confirming the Sentinel database schema is up to date.",
    },
    "refreshing_bootstrap_account": {
        "key": "refreshing_bootstrap_account",
        "label": "Refreshing bootstrap account",
        "detail": "Refreshing the Sentinel bootstrap account after the upgrade.",
    },
    "seeding_default_enums": {
        "key": "seeding_default_enums",
        "label": "Seeding defaults",
        "detail": "Seeding default enums and appliance configuration values.",
    },
    "waiting_for_health_endpoint": {
        "key": "waiting_for_health_endpoint",
        "label": "Waiting for health checks",
        "detail": "Waiting for Sentinel to report healthy at the local health endpoint.",
    },
    "recovering_hotspot": {
        "key": "recovering_hotspot",
        "label": "Checking hotspot recovery",
        "detail": "Running shared hotspot recovery checks before finalizing the update.",
    },
    "update_completed": {
        "key": "update_completed",
        "label": "Update completed",
        "detail": "Sentinel finished the update and returned to steady state.",
    },
    "update_failed": {
        "key": "update_failed",
        "label": "Update failed",
        "detail": "The update stopped and needs operator attention before retrying.",
    },
    "attempting_rollback": {
        "key": "attempting_rollback",
        "label": "Attempting rollback",
        "detail": "Rolling back to the last known good Sentinel release.",
    },
    "rollback_completed": {
        "key": "rollback_completed",
        "label": "Rollback completed",
        "detail": "Sentinel rolled back to the previous known good release.",
    },
    "rollback_failed": {
        "key": "rollback_failed",
        "label": "Rollback failed",
        "detail": "Rollback did not finish cleanly. Restore guidance is required.",
    },
}


def utc_now() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def derive_progress_from_status(status: str, message: str | None = None) -> tuple[str, str]:
    normalized_status = status.strip()
    if normalized_status == "requested":
        return "prepare_update", "request_accepted"
    if normalized_status == "authorized":
        return "prepare_update", "request_authorized"
    if normalized_status == "staging":
        return "protect_current_system", "creating_pre_update_backup"
    if normalized_status == "downloading":
        return "install_release", "downloading_release"
    if normalized_status == "verifying":
        return "install_release", "verifying_release_artifacts"
    if normalized_status == "installing":
        return "install_release", "installing_package"
    if normalized_status == "post_install":
        return "bring_services_back", "pulling_container_images"
    if normalized_status == "restarting":
        return "bring_services_back", "restarting_services"
    if normalized_status == "health_check":
        return "verify_and_finalize", "waiting_for_health_endpoint"
    if normalized_status == "completed":
        return "verify_and_finalize", "update_completed"
    if normalized_status == "rolled_back":
        return "recovery", "rollback_completed"
    if normalized_status in {"failed", "rollback_attempted"}:
        if message and "rollback failed" in message.lower():
            return "recovery", "rollback_failed"
        if normalized_status == "rollback_attempted":
            return "recovery", "attempting_rollback"
        return "recovery", "update_failed"
    return "prepare_update", "request_accepted"


def build_update_phase(phase_key: str) -> dict[str, Any]:
    definition = UPDATE_PHASE_DEFINITIONS.get(phase_key) or UPDATE_PHASE_DEFINITIONS["prepare_update"]
    return dict(definition)


def build_update_checkpoint(checkpoint_key: str, *, detail: str | None = None) -> dict[str, Any]:
    definition = UPDATE_CHECKPOINT_DEFINITIONS.get(checkpoint_key) or UPDATE_CHECKPOINT_DEFINITIONS[
        "request_accepted"
    ]
    payload = dict(definition)
    if detail is not None and detail.strip():
        payload["detail"] = detail.strip()
    return payload


def apply_job_progress(
    job: dict[str, Any],
    *,
    phase_key: str,
    checkpoint_key: str,
    checkpoint_detail: str | None = None,
) -> None:
    job["phase"] = build_update_phase(phase_key)
    job["checkpoint"] = build_update_checkpoint(checkpoint_key, detail=checkpoint_detail)


def ensure_job_progress(job: dict[str, Any]) -> None:
    status = str(job.get("status", "")).strip()
    message = str(job.get("message", "")).strip()

    raw_phase = job.get("phase")
    raw_checkpoint = job.get("checkpoint")
    phase_key = (
        str(raw_phase.get("key", "")).strip()
        if isinstance(raw_phase, dict)
        else ""
    )
    checkpoint_key = (
        str(raw_checkpoint.get("key", "")).strip()
        if isinstance(raw_checkpoint, dict)
        else ""
    )

    if not phase_key or phase_key not in UPDATE_PHASE_DEFINITIONS:
        phase_key, derived_checkpoint_key = derive_progress_from_status(status, message)
    else:
        derived_checkpoint_key = ""

    if not checkpoint_key or checkpoint_key not in UPDATE_CHECKPOINT_DEFINITIONS:
        checkpoint_key = derived_checkpoint_key or derive_progress_from_status(status, message)[1]

    checkpoint_detail = None
    if isinstance(raw_checkpoint, dict):
        raw_detail = raw_checkpoint.get("detail")
        if isinstance(raw_detail, str) and raw_detail.strip():
            checkpoint_detail = raw_detail.strip()

    if checkpoint_detail is None:
        checkpoint_detail = message or None

    apply_job_progress(
        job,
        phase_key=phase_key,
        checkpoint_key=checkpoint_key,
        checkpoint_detail=checkpoint_detail,
    )


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
    ensure_directory(TRACE_ARCHIVE_DIR, 0o775)
    ensure_directory(LOG_ROOT, 0o750)
    ensure_directory(APPLIANCE_STATE_PATH.parent, 0o755)
    if not LOCK_PATH.exists():
        LOCK_PATH.touch(mode=0o664)


def format_trace_line(component: str, level: str, message: str) -> str:
    normalized_message = " ".join(message.split()) or "No message provided."
    return f"{utc_now()} [{component}] [{level.upper()}] {normalized_message}"


def append_trace_line(component: str, level: str, message: str) -> None:
    ensure_runtime_directories()
    with TRACE_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(format_trace_line(component, level, message))
        handle.write("\n")
    try:
        os.chmod(TRACE_LOG_PATH, 0o664)
    except PermissionError:
        pass


def write_trace_session(
    component: str,
    *,
    session_job_id: str | None = None,
) -> None:
    payload = {
        "tracePath": str(TRACE_LOG_PATH),
        "resetAt": utc_now(),
        "resetBy": component,
        "jobId": session_job_id or None,
    }
    ensure_directory(TRACE_SESSION_PATH.parent)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=str(TRACE_SESSION_PATH.parent), delete=False
    ) as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
        tmp_name = handle.name

    os.chmod(tmp_name, 0o664)
    os.replace(tmp_name, TRACE_SESSION_PATH)


def clear_trace_session() -> None:
    try:
        TRACE_SESSION_PATH.unlink(missing_ok=True)
    except TypeError:
        if TRACE_SESSION_PATH.exists():
            TRACE_SESSION_PATH.unlink()


def previous_trace_session_job_id() -> str | None:
    try:
        payload = read_json_file(TRACE_SESSION_PATH)
    except (OSError, json.JSONDecodeError):
        return None

    if not isinstance(payload, dict):
        return None

    raw_job_id = payload.get("jobId")
    if not isinstance(raw_job_id, str):
        return None

    job_id = raw_job_id.strip()
    return job_id or None


def archive_and_reset_trace(
    component: str,
    message: str,
    *,
    archive_suffix: str | None = None,
    session_job_id: str | None = None,
) -> Path:
    ensure_runtime_directories()
    if TRACE_LOG_PATH.exists() and TRACE_LOG_PATH.stat().st_size > 0:
        timestamp = datetime.now(tz=timezone.utc).strftime("%Y%m%d-%H%M%S")
        archived_job_id = previous_trace_session_job_id()
        safe_suffix = re.sub(
            r"[^A-Za-z0-9._-]+", "-",
            (archived_job_id or archive_suffix or component).strip(),
        ) or component
        archive_path = TRACE_ARCHIVE_DIR / f"update-trace-{timestamp}-{safe_suffix}.log"
        os.replace(TRACE_LOG_PATH, archive_path)

    TRACE_LOG_PATH.write_text("", encoding="utf-8")
    try:
        os.chmod(TRACE_LOG_PATH, 0o664)
    except PermissionError:
        pass

    if session_job_id is not None and session_job_id.strip():
        write_trace_session(component, session_job_id=session_job_id.strip())
    else:
        clear_trace_session()

    append_trace_line(component, "info", message)
    return TRACE_LOG_PATH


def read_json_file(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None

    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_trace_session() -> dict[str, Any] | None:
    try:
        payload = read_json_file(TRACE_SESSION_PATH)
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


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
    current_version = raw.get("LAST_KNOWN_GOOD_VERSION") or raw.get("CURRENT_VERSION", "")
    previous_version = raw.get("PREVIOUS_VERSION", "")
    last_attempted_version = raw.get("LAST_ATTEMPTED_VERSION") or current_version
    last_failed_version = raw.get("LAST_FAILED_VERSION", "")
    return {
        "schemaVersion": STATE_SCHEMA_VERSION,
        "withObs": normalize_bool(raw.get("WITH_OBS", "false")),
        "allowGrafanaLan": normalize_bool(raw.get("ALLOW_GRAFANA_LAN", "false")),
        "allowWikiLan": normalize_bool(raw.get("ALLOW_WIKI_LAN", "false")),
        "lanCidr": raw.get("LAN_CIDR", ""),
        "currentVersion": current_version,
        "previousVersion": previous_version,
        "lastKnownGoodVersion": current_version,
        "lastAttemptedVersion": last_attempted_version,
        "lastFailedVersion": last_failed_version,
    }


def load_appliance_state() -> dict[str, Any]:
    state = read_json_file(APPLIANCE_STATE_PATH)
    if state is None:
        state = parse_legacy_state()

    current_version = normalize_version_tag(str(state.get("currentVersion", ""))) or ""
    previous_version = normalize_version_tag(str(state.get("previousVersion", ""))) or ""
    last_known_good_version = (
        normalize_version_tag(str(state.get("lastKnownGoodVersion", ""))) or current_version
    )
    last_attempted_version = (
        normalize_version_tag(str(state.get("lastAttemptedVersion", ""))) or last_known_good_version
    )
    last_failed_version = normalize_version_tag(str(state.get("lastFailedVersion", ""))) or ""

    return {
        "schemaVersion": STATE_SCHEMA_VERSION,
        "withObs": bool(state.get("withObs", False)),
        "allowGrafanaLan": bool(state.get("allowGrafanaLan", False)),
        "allowWikiLan": bool(state.get("allowWikiLan", False)),
        "lanCidr": str(state.get("lanCidr", "")),
        "currentVersion": last_known_good_version,
        "previousVersion": previous_version,
        "lastKnownGoodVersion": last_known_good_version,
        "lastAttemptedVersion": last_attempted_version,
        "lastFailedVersion": last_failed_version,
    }


def save_appliance_state(state: dict[str, Any]) -> None:
    current_version = normalize_version_tag(str(state.get("currentVersion", ""))) or ""
    previous_version = normalize_version_tag(str(state.get("previousVersion", ""))) or ""
    last_known_good_version = (
        normalize_version_tag(str(state.get("lastKnownGoodVersion", ""))) or current_version
    )
    last_attempted_version = (
        normalize_version_tag(str(state.get("lastAttemptedVersion", ""))) or last_known_good_version
    )
    last_failed_version = normalize_version_tag(str(state.get("lastFailedVersion", ""))) or ""
    payload = {
        "schemaVersion": STATE_SCHEMA_VERSION,
        "withObs": bool(state.get("withObs", False)),
        "allowGrafanaLan": bool(state.get("allowGrafanaLan", False)),
        "allowWikiLan": bool(state.get("allowWikiLan", False)),
        "lanCidr": str(state.get("lanCidr", "")),
        "currentVersion": last_known_good_version,
        "previousVersion": previous_version,
        "lastKnownGoodVersion": last_known_good_version,
        "lastAttemptedVersion": last_attempted_version,
        "lastFailedVersion": last_failed_version,
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
                f"LAST_KNOWN_GOOD_VERSION={payload['lastKnownGoodVersion']}",
                f"LAST_ATTEMPTED_VERSION={payload['lastAttemptedVersion']}",
                f"LAST_FAILED_VERSION={payload['lastFailedVersion']}",
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


def is_terminal_job(job: dict[str, Any] | None) -> bool:
    if not isinstance(job, dict):
        return True

    status = str(job.get("status", "")).strip()
    if status == "rollback_attempted":
        finished_at = job.get("finishedAt")
        return isinstance(finished_at, str) and bool(finished_at.strip())

    return is_terminal_status(status)


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
